import { AiToolsService } from './ai-tools.service';
import { ReservationsService } from '../reservations/reservations.service';
import { AvailabilityService } from '../availability/availability.service';
import { SYSTEM_PROMPT } from './prompts';

describe('End-to-End Reservation Flow via AI Orchestration (PRO-85)', () => {
  let aiToolsService: AiToolsService;
  let reservationsService: ReservationsService;
  let availabilityService: AvailabilityService;
  let prisma: any;

  const tenantId = 'tenant-padang-sederhana-id';
  const outletSlug = 'kemang';

  beforeEach(() => {
    prisma = {
      tenant: { findUnique: jest.fn() },
      outlet: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'outlet-kemang-id',
          tenantId,
          name: 'RM Padang Sederhana Kemang',
          slug: 'kemang',
          isActive: true,
          maxPartySize: 10,
        }),
        findFirst: jest.fn().mockResolvedValue({
          id: 'outlet-kemang-id',
          tenantId,
          name: 'RM Padang Sederhana Kemang',
          slug: 'kemang',
          isActive: true,
          maxPartySize: 10,
        }),
        findMany: jest.fn(),
      },
      customer: {
        upsert: jest.fn().mockResolvedValue({
          id: 'cust-budi-id',
          name: 'Budi Santoso',
          phone: '081234567890',
        }),
      },
      reservation: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 'rsv-created-123',
          code: data.code,
          status: 'pending',
          tenantId: data.tenantId,
          outletId: data.outletId,
          startAt: data.startAt,
          endAt: data.endAt,
          partySize: data.partySize,
        })),
        findFirst: jest.fn(),
      },
      diningArea: { findMany: jest.fn() },
      restaurantTable: { findMany: jest.fn() },
      openingHour: { findUnique: jest.fn() },
      auditEvent: { create: jest.fn() },
      reservationStatusHistory: { create: jest.fn() },
      aiToolCall: { create: jest.fn() },
      chatSession: { findFirst: jest.fn(), create: jest.fn() },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };

    availabilityService = {
      find: jest.fn().mockResolvedValue({
        available: true,
        tables: [{ id: 'tbl-1', tableNumber: 'Meja 05', capacity: 4 }],
        startAt: new Date('2026-11-20T19:00:00+07:00'),
        endAt: new Date('2026-11-20T20:30:00+07:00'),
      }),
    } as any;

    reservationsService = new ReservationsService(prisma, availabilityService);
    aiToolsService = new AiToolsService(prisma, availabilityService, reservationsService);
  });

  it('contains strict confirmation gate and booking summary requirements in prompt', () => {
    expect(SYSTEM_PROMPT).toContain('KONFIRMASI EKSPLISIT WAJIB');
    expect(SYSTEM_PROMPT).toContain('RINGKASAN LENGKAP');
    expect(SYSTEM_PROMPT).toContain('check_availability');
  });

  it('simulates full sequence: check_availability -> user confirms -> create_reservation -> ticket issued', async () => {
    // Step 1: User asks for table, AI tool calls check_availability
    const availResult = await aiToolsService.executeTool(
      tenantId,
      'check_availability',
      {
        outletSlug: 'kemang',
        date: '2026-11-20',
        time: '19:00',
        partySize: 4,
      },
      'session-sim-1',
    );

    expect(availResult.available).toBe(true);
    expect(availResult.outlet).toBe('RM Padang Sederhana Kemang');
    expect(availResult.message).toContain('Meja tersedia untuk 4 orang');

    // Step 2: System receives explicit confirmation with idempotency key and invokes create_reservation
    const proposal = await aiToolsService.executeTool(
      tenantId,
      'create_reservation',
      {
        outletSlug: 'kemang',
        date: '2026-11-20',
        time: '19:00',
        partySize: 4,
        customerName: 'Budi Santoso',
        customerPhone: '081234567890',
        notes: 'Minta meja area bebas asap rokok',
        idempotencyKey: 'idem-key-user-confirmed-123',
      },
      'session-sim-1',
    );
    expect(proposal.confirmationRequired).toBe(true);
    const bookingResult = await aiToolsService.confirmPendingMutation(tenantId, 'session-sim-1');

    expect(bookingResult.success).toBe(true);
    expect(bookingResult.code).toMatch(/^RSV-/);
    expect(bookingResult.status).toBe('pending');
    expect(bookingResult.message).toContain('Reservasi berhasil dibuat');

    // Step 3: Verify audit log recorded tool call with phone masked
    expect(prisma.aiToolCall.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          toolName: 'create_reservation',
          status: 'ok',
          input: expect.objectContaining({
            customerPhone: '0812****7890',
          }),
        }),
      }),
    );
  });
});
