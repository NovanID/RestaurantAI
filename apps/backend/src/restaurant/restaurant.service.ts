import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { recordAdminAudit } from '../audit/admin-audit';

@Injectable()
export class RestaurantService {
  constructor(private readonly prisma: PrismaService) {}

  outlets(tenantId?: string) {
    return this.prisma.outlet.findMany({
      where: { isActive: true, ...(tenantId ? { tenantId } : {}) },
      include: { openingHours: true },
      orderBy: { name: 'asc' },
    });
  }

  async outlet(tenantId: string, id: string) {
    return this.prisma.outlet.findFirstOrThrow({
      where: { id, tenantId },
      include: { openingHours: true },
    });
  }

  async openingHours(tenantId: string | undefined, outletId: string) {
    if (tenantId) {
      await this.ownedOutlet(tenantId, outletId);
    }
    return this.prisma.openingHour.findMany({
      where: { outletId, ...(tenantId ? { tenantId } : {}) },
      orderBy: { weekday: 'asc' },
    });
  }

  async updateOutlet(tenantId: string, actorId: string, id: string, data: { name?: string; address?: string | null; city?: string | null; phone?: string | null; whatsapp?: string | null; email?: string | null; isActive?: boolean; defaultDurationMinutes?: number; minNoticeMinutes?: number; maxAdvanceDays?: number; changeCutoffMinutes?: number; maxPartySize?: number; autoConfirm?: boolean }) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.outlet.findFirst({ where: { id, tenantId } });
      if (!before) throw new NotFoundException('Outlet tidak ditemukan.');
      const after = await tx.outlet.update({ where: { id }, data });
      await recordAdminAudit(tx, tenantId, actorId, 'outlet', id, 'updated', before, after);
      return after;
    });
  }

  async deleteOutlet(tenantId: string, actorId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.outlet.findFirst({ where: { id, tenantId } });
      if (!before) throw new NotFoundException('Outlet tidak ditemukan.');
      const after = await tx.outlet.update({ where: { id }, data: { isActive: false } });
      await recordAdminAudit(tx, tenantId, actorId, 'outlet', id, 'deactivated', before, after);
      return { success: true };
    });
  }

  async createOutlet(tenantId: string, actorId: string, data: { name: string; slug: string; address?: string | null; city?: string | null; phone?: string | null; whatsapp?: string | null; email?: string | null }) {
    return this.prisma.$transaction(async (tx) => {
      const after = await tx.outlet.create({
        data: { tenantId, name: data.name, slug: data.slug.toLowerCase().replace(/\s+/g, '-'), address: data.address, city: data.city, phone: data.phone, whatsapp: data.whatsapp, email: data.email },
      });
      await recordAdminAudit(tx, tenantId, actorId, 'outlet', after.id, 'created', null, after);
      return after;
    });
  }

  async saveOpeningHours(tenantId: string, actorId: string, outletId: string, hours: Array<{ weekday: number; openTime: string; closeTime: string; isClosed?: boolean }>) {
    return this.prisma.$transaction(async (tx) => {
      const outlet = await tx.outlet.findFirst({ where: { id: outletId, tenantId } });
      if (!outlet) throw new NotFoundException('Outlet tidak ditemukan.');
      const before = await tx.openingHour.findMany({ where: { tenantId, outletId }, orderBy: { weekday: 'asc' } });
      const after = await Promise.all(hours.map((hour) => tx.openingHour.upsert({
        where: { outletId_weekday: { outletId, weekday: hour.weekday } },
        update: { openTime: hour.openTime, closeTime: hour.closeTime, isClosed: hour.isClosed ?? false },
        create: { tenantId, outletId, ...hour },
      })));
      await recordAdminAudit(tx, tenantId, actorId, 'opening_hours', outletId, 'saved', before, after);
      return after;
    });
  }

  areas(tenantId: string, outletId: string) {
    return this.prisma.diningArea.findMany({ where: { tenantId, outletId }, orderBy: { name: 'asc' } });
  }

  async createArea(tenantId: string, actorId: string, outletId: string, name: string) {
    return this.prisma.$transaction(async (tx) => {
      const outlet = await tx.outlet.findFirst({ where: { id: outletId, tenantId } });
      if (!outlet) throw new NotFoundException('Outlet tidak ditemukan.');
      const after = await tx.diningArea.create({ data: { tenantId, outletId, name } });
      await recordAdminAudit(tx, tenantId, actorId, 'dining_area', after.id, 'created', null, after);
      return after;
    });
  }

  async updateArea(tenantId: string, actorId: string, id: string, name: string) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.diningArea.findFirst({ where: { id, tenantId } });
      if (!before) throw new NotFoundException('Area tidak ditemukan.');
      const after = await tx.diningArea.update({ where: { id }, data: { name } });
      await recordAdminAudit(tx, tenantId, actorId, 'dining_area', id, 'updated', before, after);
      return after;
    });
  }

  async deleteArea(tenantId: string, actorId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.diningArea.findFirst({
        where: { id, tenantId },
        include: { restaurantTables: true },
      });
      if (!before) throw new NotFoundException('Area tidak ditemukan.');

      // Safe delete: unassign tables from this area before deletion
      if (before.restaurantTables.length > 0) {
        await tx.restaurantTable.updateMany({
          where: { areaId: id, tenantId },
          data: { areaId: null },
        });
      }

      await tx.diningArea.delete({ where: { id } });
      await recordAdminAudit(tx, tenantId, actorId, 'dining_area', id, 'deleted', before, null);
      return { success: true };
    });
  }

  async tables(tenantId: string, outletId: string) {
    await this.ownedOutlet(tenantId, outletId);
    return this.prisma.restaurantTable.findMany({ where: { tenantId, outletId }, include: { area: true }, orderBy: { tableNumber: 'asc' } });
  }

  async createTable(tenantId: string, actorId: string, outletId: string, data: { tableNumber: string; capacity: number; areaId?: string }) {
    return this.prisma.$transaction(async (tx) => {
      const outlet = await tx.outlet.findFirst({ where: { id: outletId, tenantId } });
      if (!outlet) throw new NotFoundException('Outlet tidak ditemukan.');
      if (data.areaId && !await tx.diningArea.findFirst({ where: { id: data.areaId, outletId, tenantId } })) throw new NotFoundException('Area tidak ditemukan.');
      const after = await tx.restaurantTable.create({ data: { tenantId, outletId, tableNumber: data.tableNumber, capacity: data.capacity, areaId: data.areaId } });
      await recordAdminAudit(tx, tenantId, actorId, 'restaurant_table', after.id, 'created', null, after);
      return after;
    });
  }

  async updateTable(tenantId: string, actorId: string, id: string, data: { tableNumber?: string; capacity?: number; areaId?: string | null; status?: 'active' | 'inactive' }) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.restaurantTable.findFirst({ where: { id, tenantId } });
      if (!before) throw new NotFoundException('Meja tidak ditemukan.');
      if (data.areaId && !await tx.diningArea.findFirst({ where: { id: data.areaId, outletId: before.outletId, tenantId } })) throw new NotFoundException('Area tidak ditemukan.');
      const after = await tx.restaurantTable.update({ where: { id }, data });
      await recordAdminAudit(tx, tenantId, actorId, 'restaurant_table', id, 'updated', before, after);
      return after;
    });
  }

  async deleteTable(tenantId: string, actorId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.restaurantTable.findFirst({
        where: { id, tenantId },
        include: { reservations: { select: { id: true }, take: 1 } },
      });
      if (!before) throw new NotFoundException('Meja tidak ditemukan.');

      // If reservations exist, soft delete via status: inactive to protect foreign keys and historical integrity
      if (before.reservations.length > 0) {
        const after = await tx.restaurantTable.update({
          where: { id },
          data: { status: 'inactive' },
        });
        await recordAdminAudit(tx, tenantId, actorId, 'restaurant_table', id, 'deactivated', before, after);
        return { success: true, softDeleted: true };
      }

      await tx.restaurantTable.delete({ where: { id } });
      await recordAdminAudit(tx, tenantId, actorId, 'restaurant_table', id, 'deleted', before, null);
      return { success: true, softDeleted: false };
    });
  }

  private async ownedOutlet(tenantId: string, id: string) {
    const outlet = await this.prisma.outlet.findFirst({ where: { id, tenantId } });
    if (!outlet) throw new NotFoundException('Outlet tidak ditemukan.');
    return outlet;
  }
}
