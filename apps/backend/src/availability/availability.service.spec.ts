import { AvailabilityService } from './availability.service';

describe('AvailabilityService', () => {
  const prisma = {
    outlet: { findFirst: jest.fn() },
    openingHour: { findUnique: jest.fn() },
    restaurantTable: { findMany: jest.fn() },
  };
  const service = new AvailabilityService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.outlet.findFirst.mockResolvedValue({
      id: 'outlet-1',
      isActive: true,
      maxPartySize: 12,
      defaultDurationMinutes: 90,
    });
    prisma.openingHour.findUnique.mockResolvedValue({
      openTime: '10:00',
      closeTime: '22:00',
      isClosed: false,
    });
    prisma.restaurantTable.findMany.mockResolvedValue([{ id: 'table-1', capacity: 4 }]);
  });

  it('applies the reservation duration buffer when checking closing time', async () => {
    const result = await service.find('outlet-1', '2025-01-06', '20:31', 2);

    expect(result).toEqual({
      available: false,
      tables: [],
      message: 'Waktu berada di luar jam operasional.',
    });
    expect(prisma.restaurantTable.findMany).not.toHaveBeenCalled();
  });

  it('queries the exact buffered interval for tables within opening hours', async () => {
    const result = await service.find('outlet-1', '2025-01-06', '20:30', 2);

    expect(result).toEqual(expect.objectContaining({ available: true }));
    expect(prisma.restaurantTable.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        reservations: expect.objectContaining({
          none: expect.objectContaining({
            startAt: { lt: new Date('2025-01-06T22:00:00+07:00') },
            endAt: { gt: new Date('2025-01-06T20:30:00+07:00') },
          }),
        }),
      }),
    }));
  });

  it('completes concurrent mock-backed availability checks within the unit response budget', async () => {
    const startedAt = performance.now();
    await Promise.all(Array.from({ length: 100 }, () => (
      service.find('outlet-1', '2025-01-06', '20:30', 2)
    )));

    expect(performance.now() - startedAt).toBeLessThan(1_000);
  });
});
