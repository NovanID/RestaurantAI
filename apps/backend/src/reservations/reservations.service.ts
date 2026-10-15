import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ListReservationsDto } from './dto/list-reservations.dto';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  async create(input: CreateReservationDto) {
    const availability = await this.availabilityService.find(
      input.outletId,
      input.date,
      input.time,
      input.partySize,
    );
    if (!availability.available || !availability.startAt || !availability.endAt) {
      throw new ConflictException({ code: 'SLOT_TAKEN', message: 'Slot tidak tersedia.' });
    }
    const outlet = await this.prisma.outlet.findUniqueOrThrow({ where: { id: input.outletId } });
    const customer = await this.prisma.customer.upsert({
      where: { tenantId_phone: { tenantId: outlet.tenantId, phone: input.phone } },
      update: { name: input.name },
      create: { tenantId: outlet.tenantId, name: input.name, phone: input.phone },
    });
    try {
      return await this.prisma.reservation.create({
        data: {
          tenantId: outlet.tenantId,
          outletId: outlet.id,
          customerId: customer.id,
          tableId: availability.tables[0].id,
          startAt: availability.startAt,
          endAt: availability.endAt,
          partySize: input.partySize,
          code: `RSV-${randomBytes(3).toString('hex').toUpperCase()}`,
          notes: input.notes,
        },
      });
    } catch (error) {
      if (this.isSlotConflict(error)) {
        throw new ConflictException({ code: 'SLOT_TAKEN', message: 'Slot baru saja diambil tamu lain.' });
      }
      throw error;
    }
  }

  async verify(code: string, phoneLast4: string) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { code, customer: { phone: { endsWith: phoneLast4 } } },
      include: { outlet: true, table: true, customer: true },
    });
    if (!reservation) throw new NotFoundException('Reservasi tidak ditemukan.');
    return reservation;
  }

  async cancel(code: string, phoneLast4: string, actorId?: string) {
    const reservation = await this.verify(code, phoneLast4);
    if (!['pending', 'confirmed'].includes(reservation.status)) {
      throw new ConflictException('Reservasi tidak dapat dibatalkan.');
    }

    // Use actorId if provided (e.g., admin/user who cancelled), otherwise use customerId
    const actualActorId = actorId || reservation.customerId;
    
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: 'cancelled' },
      });
      
      await tx.reservationStatusHistory.create({
        data: {
          tenantId: reservation.tenantId,
          reservationId: reservation.id,
          fromStatus: reservation.status,
          toStatus: 'cancelled',
          actorType: actualActorId === reservation.customerId ? 'customer' : 'staff',
          actorId: actualActorId,
          reason: 'Dibatalkan oleh pelanggan',
        },
      });
      
      await tx.auditEvent.create({
        data: {
          tenantId: reservation.tenantId,
          actorType: actualActorId === reservation.customerId ? 'customer' : 'staff',
          actorId: actualActorId,
          action: 'reservation.cancelled',
          entityType: 'reservation',
          entityId: reservation.id,
          before: { status: reservation.status },
          after: { status: 'cancelled' },
        },
      });
      
      return updated;
    });
  }

  list(tenantId: string, query: ListReservationsDto) {
    const search = query.query?.trim();
    return this.prisma.reservation.findMany({
      where: {
        tenantId,
        ...(query.status ? { status: query.status } : {}),
        ...(search
          ? {
              OR: [
                { code: { contains: search, mode: 'insensitive' } },
                { customer: { name: { contains: search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        customer: { select: { name: true, phone: true } },
        outlet: { select: { name: true } },
        table: { select: { tableNumber: true } },
      },
      orderBy: { startAt: 'desc' },
    });
  }

  approve(tenantId: string, actorId: string, id: string) {
    return this.changeStatus(tenantId, actorId, id, 'confirmed');
  }

  reject(tenantId: string, actorId: string, id: string, reason?: string) {
    return this.changeStatus(tenantId, actorId, id, 'rejected', reason);
  }

  private async changeStatus(
    tenantId: string,
    actorId: string,
    id: string,
    status: ReservationStatus,
    reason?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findFirst({ where: { id, tenantId } });
      if (!reservation) throw new NotFoundException('Reservasi tidak ditemukan.');
      if (reservation.status !== 'pending') {
        throw new ConflictException('Hanya reservasi pending yang dapat diproses.');
      }

      const updated = await tx.reservation.update({
        where: { id },
        data: {
          status,
          ...(status === 'rejected' ? { rejectionReason: reason ?? null } : {}),
        },
      });
      await tx.reservationStatusHistory.create({
        data: {
          tenantId,
          reservationId: id,
          fromStatus: reservation.status,
          toStatus: status,
          actorType: 'staff',
          actorId,
          reason,
        },
      });
      await tx.auditEvent.create({
        data: {
          tenantId,
          actorType: 'staff',
          actorId,
          action: `reservation.${status}`,
          entityType: 'reservation',
          entityId: id,
          before: { status: reservation.status },
          after: { status },
        },
      });
      return updated;
    });
  }

  private isSlotConflict(error: unknown) {
    return typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2010';
  }
}
