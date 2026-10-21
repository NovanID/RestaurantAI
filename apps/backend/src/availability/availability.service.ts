import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async find(
    outletId: string,
    date: string,
    time: string,
    partySize: number,
    excludeReservationId?: string,
    prisma: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || partySize < 1) {
      throw new BadRequestException('Tanggal, waktu, dan jumlah tamu tidak valid.');
    }
    const outlet = await prisma.outlet.findFirst({ where: { id: outletId, isActive: true } });
    if (!outlet) throw new NotFoundException('Outlet tidak ditemukan.');
    if (partySize > outlet.maxPartySize) {
      throw new BadRequestException(`Maksimal ${outlet.maxPartySize} tamu per reservasi.`);
    }

    const weekday = new Date(`${date}T12:00:00+07:00`).getUTCDay();
    const openingHour = await prisma.openingHour.findUnique({
      where: { outletId_weekday: { outletId, weekday } },
    });
    const endTime = this.addMinutes(time, outlet.defaultDurationMinutes);
    if (!openingHour || openingHour.isClosed || time < openingHour.openTime || endTime > openingHour.closeTime) {
      return { available: false, tables: [], message: 'Waktu berada di luar jam operasional.' };
    }

    const startAt = new Date(`${date}T${time}:00+07:00`);
    const endAt = new Date(startAt.getTime() + outlet.defaultDurationMinutes * 60_000);
    const tables = await prisma.restaurantTable.findMany({
      where: {
        outletId,
        status: 'active',
        capacity: { gte: partySize },
        reservations: {
          none: {
            status: { in: ['pending', 'confirmed'] },
            ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
            startAt: { lt: endAt },
            endAt: { gt: startAt },
          },
        },
      },
      include: { area: { select: { name: true } } },
      orderBy: { capacity: 'asc' },
    });
    return { available: tables.length > 0, tables, startAt, endAt };
  }

  private addMinutes(time: string, minutes: number) {
    const [hour, minute] = time.split(':').map(Number);
    const total = hour * 60 + minute + minutes;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }
}
