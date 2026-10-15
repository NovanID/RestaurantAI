import { ConflictException } from '@nestjs/common';
import { ReservationsService } from './reservations.service';

describe('ReservationsService', () => {
  const reservation = { id: 'reservation-1', status: 'pending' };
  const prisma = {
    reservation: {
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    reservationStatusHistory: { create: jest.fn() },
    auditEvent: { create: jest.fn() },
    $transaction: jest.fn((work) => work(prisma)),
  };
  const service = new ReservationsService(
    prisma as never,
    { find: jest.fn() } as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('confirms a pending reservation and records its history', async () => {
    prisma.reservation.findFirst.mockResolvedValue(reservation);
    prisma.reservation.update.mockResolvedValue({ ...reservation, status: 'confirmed' });

    await expect(service.approve('tenant-1', 'staff-1', reservation.id)).resolves.toMatchObject({
      status: 'confirmed',
    });
    expect(prisma.reservationStatusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ fromStatus: 'pending', toStatus: 'confirmed' }),
      }),
    );
  });

  it('does not process a reservation that is no longer pending', async () => {
    prisma.reservation.findFirst.mockResolvedValue({ ...reservation, status: 'confirmed' });

    await expect(service.approve('tenant-1', 'staff-1', reservation.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('records history and audit data when a customer cancels', async () => {
    prisma.reservation.findFirst.mockResolvedValue({
      ...reservation,
      tenantId: 'tenant-1',
      customerId: 'customer-1',
    });
    prisma.reservation.update.mockResolvedValue({ ...reservation, status: 'cancelled' });

    await expect(service.cancel('RSV-123', '1234')).resolves.toMatchObject({ status: 'cancelled' });
    expect(prisma.reservationStatusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ fromStatus: 'pending', toStatus: 'cancelled', actorType: 'customer' }),
      }),
    );
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'reservation.cancelled' }) }),
    );
  });
});
