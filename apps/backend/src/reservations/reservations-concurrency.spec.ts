import { ConflictException } from '@nestjs/common';
import { ReservationsService } from './reservations.service';

describe('ReservationsService Concurrency Simulation (50 requests to 1 slot)', () => {
  it('allows exactly 1 reservation when 50 concurrent requests target the same slot', async () => {
    let booked = false;

    const mockPrisma = {
      $transaction: jest.fn(async (callback) => callback(mockPrisma)),
      $executeRaw: jest.fn(),
      outlet: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'outlet-1',
          tenantId: 'tenant-1',
          name: 'Kemang',
        }),
      },
      customer: {
        upsert: jest.fn().mockImplementation(({ create }) => ({
          id: `cust-${create.phone}`,
          name: create.name,
          phone: create.phone,
        })),
      },
      reservation: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => {
          // Simulate PostgreSQL Exclusion Constraint:
          // If slot is already booked, PostgreSQL raises an exclusion constraint error (P2010 raw / code)
          if (booked) {
            const err = new Error('Exclusion constraint violation: conflicting key value violates exclusion constraint "no_overlapping_reservations"');
            (err as any).code = 'P2010';
            throw err;
          }
          booked = true;
          return {
            id: 'res-winner',
            code: data.code,
            status: 'pending',
            startAt: data.startAt,
            endAt: data.endAt,
          };
        }),
      },
    };

    const mockAvailabilityService = {
      find: jest.fn().mockResolvedValue({
        available: true,
        tables: [{ id: 'table-1', tableNumber: 'A1' }],
        startAt: new Date('2026-11-20T13:00:00+07:00'),
        endAt: new Date('2026-11-20T14:30:00+07:00'),
      }),
    };

    const service = new ReservationsService(
      mockPrisma as any,
      mockAvailabilityService as any,
    );

    const totalRequests = 50;
    const promises = Array.from({ length: totalRequests }).map(async (_, idx) => {
      try {
        const res = await service.create({
          outletId: 'outlet-1',
          date: '2026-11-20',
          time: '13:00',
          partySize: 2,
          name: `Pemesan ${idx + 1}`,
          phone: `08129999${String(idx).padStart(4, '0')}`,
        });
        return { success: true, data: res };
      } catch (err: any) {
        return { success: false, error: err };
      }
    });

    const results = await Promise.all(promises);

    const winners = results.filter((r) => r.success);
    const conflicts = results.filter(
      (r) => !r.success && r.error instanceof ConflictException && (r.error.getResponse() as any)?.code === 'SLOT_TAKEN',
    );

    expect(winners).toHaveLength(1);
    expect(conflicts).toHaveLength(49);
    expect(winners[0].data?.code).toMatch(/^RSV-/);
  });
});
