import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { recordAdminAudit } from '../audit/admin-audit';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, query?: string, category?: string) {
    return this.prisma.menuItem.findMany({
      where: {
        tenantId,
        isActive: true,
        isAvailable: true,
        OR: [{ categoryId: null }, { category: { is: { isActive: true } } }],
        ...(query ? { name: { contains: query, mode: 'insensitive' } } : {}),
        ...(category ? { category: { is: { name: category, isActive: true } } } : {}),
      },
      include: { category: true }, orderBy: { name: 'asc' },
    });
  }
  adminItems(tenantId: string) { return this.prisma.menuItem.findMany({ where: { tenantId }, include: { category: true }, orderBy: { name: 'asc' } }); }
  categories(tenantId: string) { return this.prisma.menuCategory.findMany({ where: { tenantId }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }); }
  createCategory(tenantId: string, actorId: string, data: { name: string; sortOrder?: number }) {
    return this.prisma.$transaction(async (tx) => {
      const after = await tx.menuCategory.create({ data: { tenantId, name: data.name, sortOrder: data.sortOrder ?? 0 } });
      await recordAdminAudit(tx, tenantId, actorId, 'menu_category', after.id, 'created', null, after);
      return after;
    });
  }

  updateCategory(tenantId: string, actorId: string, id: string, data: { name?: string; sortOrder?: number; isActive?: boolean }) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.menuCategory.findFirst({ where: { id, tenantId } });
      if (!before) throw new NotFoundException('Kategori tidak ditemukan.');
      const after = await tx.menuCategory.update({ where: { id }, data });
      await recordAdminAudit(tx, tenantId, actorId, 'menu_category', id, 'updated', before, after);
      return after;
    });
  }

  createItem(tenantId: string, actorId: string, data: { name: string; priceIdr: number; categoryId?: string; description?: string; imageUrl?: string; tags?: string[] }) {
    return this.prisma.$transaction(async (tx) => {
      if (data.categoryId && !await tx.menuCategory.findFirst({ where: { id: data.categoryId, tenantId } })) {
        throw new NotFoundException('Kategori tidak ditemukan.');
      }
      const after = await tx.menuItem.create({ data: { tenantId, ...data } });
      await recordAdminAudit(tx, tenantId, actorId, 'menu_item', after.id, 'created', null, after);
      return after;
    });
  }

  updateItem(tenantId: string, actorId: string, id: string, data: { name?: string; priceIdr?: number; categoryId?: string | null; description?: string | null; imageUrl?: string | null; tags?: string[]; isActive?: boolean; isAvailable?: boolean }) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.menuItem.findFirst({ where: { id, tenantId } });
      if (!before) throw new NotFoundException('Menu tidak ditemukan.');
      if (data.categoryId && !await tx.menuCategory.findFirst({ where: { id: data.categoryId, tenantId } })) {
        throw new NotFoundException('Kategori tidak ditemukan.');
      }
      const after = await tx.menuItem.update({ where: { id }, data });
      await recordAdminAudit(tx, tenantId, actorId, 'menu_item', id, 'updated', before, after);
      return after;
    });
  }

  deleteCategory(tenantId: string, actorId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.menuCategory.findFirst({ where: { id, tenantId } });
      if (!before) throw new NotFoundException('Kategori tidak ditemukan.');
      const hasItems = await tx.menuItem.count({ where: { tenantId, categoryId: id } });
      const after = hasItems
        ? await tx.menuCategory.update({ where: { id, tenantId }, data: { isActive: false } })
        : null;
      if (!hasItems) await tx.menuCategory.delete({ where: { id } });
      await recordAdminAudit(tx, tenantId, actorId, 'menu_category', id, hasItems ? 'deactivated' : 'deleted', before, after);
      return { success: true };
    });
  }

  deleteItem(tenantId: string, actorId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.menuItem.findFirst({ where: { id, tenantId } });
      if (!before) throw new NotFoundException('Menu tidak ditemukan.');

      // Delete any outlet associations first
      await tx.outletMenuItem.deleteMany({ where: { menuItemId: id, tenantId } });

      // Hard delete the menu item so it does not linger as duplicate/inactive
      await tx.menuItem.delete({ where: { id } });
      await recordAdminAudit(tx, tenantId, actorId, 'menu_item', id, 'deleted', before, null);
      return { success: true };
    });
  }
}
