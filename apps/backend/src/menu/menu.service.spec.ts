import { NotFoundException } from '@nestjs/common';
import { MenuService } from './menu.service';

describe('MenuService', () => {
  const tx = {
    menuItem: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    menuCategory: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    auditEvent: { create: jest.fn() },
  };
  const prisma = { ...tx, $transaction: jest.fn((work) => work(tx)) };
  const service = new MenuService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('does not return menu items from inactive categories', async () => {
    tx.menuItem.findMany.mockResolvedValue([]);
    await service.list('tenant-1');
    expect(tx.menuItem.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ OR: [{ categoryId: null }, { category: { is: { isActive: true } } }] }),
    }));
  });

  it('creates an item and its staff audit event in one transaction', async () => {
    tx.menuItem.create.mockResolvedValue({ id: 'item-1', name: 'Rendang' });

    await service.createItem('tenant-1', 'staff-1', { name: 'Rendang', priceIdr: 30000 });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(tx.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      tenantId: 'tenant-1', actorId: 'staff-1', action: 'menu_item.created', entityId: 'item-1',
      before: expect.anything(), after: { id: 'item-1', name: 'Rendang' },
    }) }));
  });

  it('rejects a category from another tenant before writing an item audit event', async () => {
    tx.menuCategory.findFirst.mockResolvedValue(null);

    await expect(service.createItem('tenant-1', 'staff-1', {
      name: 'Rendang', priceIdr: 30000, categoryId: 'foreign-category',
    })).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.menuItem.create).not.toHaveBeenCalled();
    expect(tx.auditEvent.create).not.toHaveBeenCalled();
  });
});
