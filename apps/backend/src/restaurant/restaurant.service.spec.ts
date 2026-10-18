import { NotFoundException } from '@nestjs/common';
import { RestaurantService } from './restaurant.service';

describe('RestaurantService admin audit', () => {
  const tx = {
    outlet: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
    openingHour: { findMany: jest.fn(), upsert: jest.fn() },
    diningArea: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    restaurantTable: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn(), updateMany: jest.fn(), delete: jest.fn() },
    auditEvent: { create: jest.fn() },
  };
  const prisma = { ...tx, $transaction: jest.fn((work) => work(tx)) };
  const service = new RestaurantService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('records before and after with actor in the outlet transaction', async () => {
    tx.outlet.findFirst.mockResolvedValue({ id: 'outlet-1', name: 'Sebelum' });
    tx.outlet.update.mockResolvedValue({ id: 'outlet-1', name: 'Sesudah' });

    await service.updateOutlet('tenant-1', 'staff-1', 'outlet-1', { name: 'Sesudah' });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(tx.auditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      tenantId: 'tenant-1', actorId: 'staff-1', action: 'outlet.updated',
      before: { id: 'outlet-1', name: 'Sebelum' }, after: { id: 'outlet-1', name: 'Sesudah' },
    }) });
  });

  it('records the opening hours batch with tenant ownership', async () => {
    tx.outlet.findFirst.mockResolvedValue({ id: 'outlet-1' });
    tx.openingHour.findMany.mockResolvedValue([{ weekday: 0, openTime: '09:00' }]);
    tx.openingHour.upsert.mockResolvedValue({ weekday: 0, openTime: '10:00' });

    await service.saveOpeningHours('tenant-1', 'staff-1', 'outlet-1', [
      { weekday: 0, openTime: '10:00', closeTime: '20:00' },
    ]);

    expect(tx.auditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      tenantId: 'tenant-1', actorId: 'staff-1', action: 'opening_hours.saved',
      before: [{ weekday: 0, openTime: '09:00' }], after: [{ weekday: 0, openTime: '10:00' }],
    }) });
  });

  it('updates an owned area with an audit trail', async () => {
    tx.diningArea.findFirst.mockResolvedValue({ id: 'area-1', name: 'Indoor' });
    tx.diningArea.update.mockResolvedValue({ id: 'area-1', name: 'Teras' });

    await service.updateArea('tenant-1', 'staff-1', 'area-1', 'Teras');

    expect(tx.diningArea.findFirst).toHaveBeenCalledWith({ where: { id: 'area-1', tenantId: 'tenant-1' } });
    expect(tx.auditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: 'dining_area.updated', before: { id: 'area-1', name: 'Indoor' },
      after: { id: 'area-1', name: 'Teras' },
    }) });
  });

  it('unassigns tables before deleting an owned area', async () => {
    tx.diningArea.findFirst.mockResolvedValue({ id: 'area-1', restaurantTables: [{ id: 'table-1' }] });

    await service.deleteArea('tenant-1', 'staff-1', 'area-1');

    expect(tx.restaurantTable.updateMany).toHaveBeenCalledWith({
      where: { areaId: 'area-1', tenantId: 'tenant-1' }, data: { areaId: null },
    });
    expect(tx.diningArea.delete).toHaveBeenCalledWith({ where: { id: 'area-1' } });
    expect(tx.auditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: 'dining_area.deleted',
    }) });
  });

  it('soft-deletes tables with reservations and preserves history', async () => {
    tx.restaurantTable.findFirst.mockResolvedValue({ id: 'table-1', reservations: [{ id: 'reservation-1' }] });
    tx.restaurantTable.update.mockResolvedValue({ id: 'table-1', status: 'inactive' });

    await expect(service.deleteTable('tenant-1', 'staff-1', 'table-1')).resolves.toEqual({ success: true, softDeleted: true });

    expect(tx.restaurantTable.delete).not.toHaveBeenCalled();
    expect(tx.auditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'restaurant_table.deactivated' }) });
  });

  it('deletes tables without reservations', async () => {
    tx.restaurantTable.findFirst.mockResolvedValue({ id: 'table-1', reservations: [] });

    await expect(service.deleteTable('tenant-1', 'staff-1', 'table-1')).resolves.toEqual({ success: true, softDeleted: false });

    expect(tx.restaurantTable.delete).toHaveBeenCalledWith({ where: { id: 'table-1' } });
    expect(tx.auditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'restaurant_table.deleted' }) });
  });

  it('rejects a table area belonging to another outlet', async () => {
    tx.restaurantTable.findFirst.mockResolvedValue({ id: 'table-1', outletId: 'outlet-1' });
    tx.diningArea.findFirst.mockResolvedValue(null);

    await expect(service.updateTable('tenant-1', 'staff-1', 'table-1', {
      areaId: 'foreign-area',
    })).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.restaurantTable.update).not.toHaveBeenCalled();
    expect(tx.auditEvent.create).not.toHaveBeenCalled();
  });
});
