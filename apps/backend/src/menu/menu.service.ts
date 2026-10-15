import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
  createCategory(tenantId: string, data: { name: string; sortOrder?: number }) { return this.prisma.menuCategory.create({ data: { tenantId, name: data.name, sortOrder: data.sortOrder ?? 0 } }); }
  updateCategory(tenantId: string, id: string, data: { name?: string; sortOrder?: number; isActive?: boolean }) { return this.prisma.menuCategory.updateMany({ where: { id, tenantId }, data }).then((r) => { if (!r.count) throw new NotFoundException('Kategori tidak ditemukan.'); return this.prisma.menuCategory.findUniqueOrThrow({ where: { id } }); }); }
  createItem(tenantId: string, data: { name: string; priceIdr: number; categoryId?: string; description?: string; imageUrl?: string; tags?: string[] }) { return this.prisma.menuItem.create({ data: { tenantId, ...data } }); }
  updateItem(tenantId: string, id: string, data: { name?: string; priceIdr?: number; categoryId?: string | null; description?: string | null; imageUrl?: string | null; tags?: string[]; isActive?: boolean; isAvailable?: boolean }) { return this.prisma.menuItem.updateMany({ where: { id, tenantId }, data }).then((r) => { if (!r.count) throw new NotFoundException('Menu tidak ditemukan.'); return this.prisma.menuItem.findUniqueOrThrow({ where: { id } }); }); }
  deleteCategory(tenantId: string, id: string) { return this.prisma.$transaction([this.prisma.menuCategory.updateMany({ where: { id, tenantId, menuItems: { some: {} } }, data: { isActive: false } }), this.prisma.menuCategory.deleteMany({ where: { id, tenantId, menuItems: { none: {} } } })]).then(() => ({ success: true })); }
  deleteItem(tenantId: string, id: string) { return this.prisma.menuItem.updateMany({ where: { id, tenantId }, data: { isActive: false } }).then((r) => ({ success: r.count > 0 })); }
}
