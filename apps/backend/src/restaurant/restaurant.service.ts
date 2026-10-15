import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

  async openingHours(tenantId: string, outletId: string) {
    await this.ownedOutlet(tenantId, outletId);
    return this.prisma.openingHour.findMany({ where: { tenantId, outletId }, orderBy: { weekday: 'asc' } });
  }

  async updateOutlet(tenantId: string, id: string, data: { name?: string; address?: string | null; city?: string | null; phone?: string | null; whatsapp?: string | null; email?: string | null; isActive?: boolean; defaultDurationMinutes?: number; minNoticeMinutes?: number; maxAdvanceDays?: number; changeCutoffMinutes?: number; maxPartySize?: number; autoConfirm?: boolean }) {
    await this.ownedOutlet(tenantId, id);
    const { name, address, city, phone, whatsapp, email, isActive, defaultDurationMinutes, minNoticeMinutes, maxAdvanceDays, changeCutoffMinutes, maxPartySize, autoConfirm } = data;
    return this.prisma.outlet.update({
      where: { id },
      data: { name, address, city, phone, whatsapp, email, isActive, defaultDurationMinutes, minNoticeMinutes, maxAdvanceDays, changeCutoffMinutes, maxPartySize, autoConfirm },
    });
  }

  async createOutlet(tenantId: string, data: { name: string; slug: string; address?: string | null; city?: string | null; phone?: string | null; whatsapp?: string | null; email?: string | null }) {
    return this.prisma.outlet.create({
      data: {
        tenantId,
        name: data.name,
        slug: data.slug.toLowerCase().replace(/\s+/g, '-'),
        address: data.address,
        city: data.city,
        phone: data.phone,
        whatsapp: data.whatsapp,
        email: data.email,
      },
    });
  }

  async saveOpeningHours(tenantId: string, outletId: string, hours: Array<{ weekday: number; openTime: string; closeTime: string; isClosed?: boolean }>) {
    await this.ownedOutlet(tenantId, outletId);
    return this.prisma.$transaction(hours.map((hour) => this.prisma.openingHour.upsert({
      where: { outletId_weekday: { outletId, weekday: hour.weekday } },
      update: { openTime: hour.openTime, closeTime: hour.closeTime, isClosed: hour.isClosed ?? false },
      create: { tenantId, outletId, ...hour },
    })));
  }

  areas(tenantId: string, outletId: string) {
    return this.prisma.diningArea.findMany({ where: { tenantId, outletId }, orderBy: { name: 'asc' } });
  }

  async createArea(tenantId: string, outletId: string, name: string) {
    await this.ownedOutlet(tenantId, outletId);
    return this.prisma.diningArea.create({ data: { tenantId, outletId, name } });
  }

  async tables(tenantId: string, outletId: string) {
    await this.ownedOutlet(tenantId, outletId);
    return this.prisma.restaurantTable.findMany({ where: { tenantId, outletId }, include: { area: true }, orderBy: { tableNumber: 'asc' } });
  }

  async createTable(tenantId: string, outletId: string, data: { tableNumber: string; capacity: number; areaId?: string }) {
    await this.ownedOutlet(tenantId, outletId);
    return this.prisma.restaurantTable.create({ data: { tenantId, outletId, tableNumber: data.tableNumber, capacity: data.capacity, areaId: data.areaId } });
  }

  async updateTable(tenantId: string, id: string, data: { tableNumber?: string; capacity?: number; areaId?: string | null; status?: 'active' | 'inactive' }) {
    const table = await this.prisma.restaurantTable.findFirst({ where: { id, tenantId } });
    if (!table) throw new NotFoundException('Meja tidak ditemukan.');
    return this.prisma.restaurantTable.update({ where: { id }, data });
  }

  private async ownedOutlet(tenantId: string, id: string) {
    const outlet = await this.prisma.outlet.findFirst({ where: { id, tenantId } });
    if (!outlet) throw new NotFoundException('Outlet tidak ditemukan.');
    return outlet;
  }
}
