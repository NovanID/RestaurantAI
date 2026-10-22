import { AiToolsService } from './ai-tools.service';

describe('AiToolsService Unit Tests', () => {
  let service: AiToolsService;
  let prisma: any;
  let availabilityService: any;
  let reservationsService: any;

  beforeEach(() => {
    prisma = {
      tenant: { findUnique: jest.fn() },
      menuItem: { findMany: jest.fn() },
      outlet: { findFirst: jest.fn() },
      reservation: { findFirst: jest.fn() },
      aiToolCall: { create: jest.fn().mockResolvedValue({}) },
    };
    availabilityService = { find: jest.fn() };
    reservationsService = {
      create: jest.fn(),
      update: jest.fn(),
      cancel: jest.fn(),
    };
    service = new AiToolsService(prisma, availabilityService, reservationsService);
  });

  describe('get_restaurant_info (PRO-95)', () => {
    it('returns structured restaurant and outlet profile', async () => {
      prisma.outlet.findMany = jest.fn().mockResolvedValue([
        {
          id: 'o-1',
          name: 'Kemang',
          slug: 'kemang',
          address: 'Jl. Kemang Raya No. 12',
          phone: '021-7191234',
          whatsapp: '081234567890',
          maxPartySize: 10,
          defaultDurationMinutes: 90,
          diningAreas: [{ name: 'Indoor AC' }],
          openingHours: [{ weekday: 1, isClosed: false, openTime: '10:00', closeTime: '22:00' }],
          tenant: { name: 'Padang Sederhana' },
        },
      ]);

      const res = await service.executeTool('t-1', 'get_restaurant_info', { outletSlug: 'kemang' });
      expect(res.namaRestoran).toBe('Padang Sederhana');
      expect(res.cabang).toHaveLength(1);
      expect(res.cabang[0].slug).toBe('kemang');
      expect(res.cabang[0].jamBuka[0].buka).toBe('10:00 - 22:00 WIB');
    });
  });

  describe('search_menu (PRO-95)', () => {
    it('filters dishes by keyword, category, or tags', async () => {
      prisma.menuItem.findMany.mockResolvedValue([
        {
          id: 'm-1',
          name: 'Rendang Daging Sapi',
          category: { name: 'Lauk Utama' },
          priceIdr: 28000,
          description: 'Dimasak perlahan 8 jam',
          tags: ['pedas', 'gurih'],
          imageUrl: '/uploads/menu/rendang.webp',
        },
      ]);

      const res = await service.executeTool('t-1', 'search_menu', { query: 'rendang' });
      expect(res).toHaveLength(1);
      expect(res[0].nama).toBe('Rendang Daging Sapi');
      expect(res[0].harga).toBe(28000);
      expect(res[0].tagRasa).toContain('pedas');
    });
  });

  describe('check_availability and verify_reservation (PRO-94)', () => {
    it('checks table availability via availability service', async () => {
      prisma.outlet.findFirst.mockResolvedValue({ id: 'out-1', name: 'Cabang Tebet' });
      availabilityService.find.mockResolvedValue({ available: true });

      const res = await service.executeTool('t-1', 'check_availability', {
        outletSlug: 'tebet',
        date: '2026-11-25',
        time: '19:00',
        partySize: 4,
      });

      expect(res.available).toBe(true);
      expect(res.outlet).toBe('Cabang Tebet');
    });

    it('verifies existing reservation with 4 digit phone matching', async () => {
      prisma.reservation.findFirst.mockResolvedValue({
        code: 'RSV-888',
        status: 'confirmed',
        startAt: new Date('2026-11-25T12:00:00Z'),
        partySize: 2,
        notes: 'Dekat jendela',
        outlet: { name: 'Cabang Kemang', slug: 'kemang' },
        table: { tableNumber: 'A1' },
        customer: { name: 'Uni Rina', phone: '081299994321' },
      });

      const res = await service.executeTool('t-1', 'verify_reservation', {
        code: 'RSV-888',
        phoneLast4: '4321',
      });

      expect(res.found).toBe(true);
      expect(res.code).toBe('RSV-888');
      expect(res.nomorTelepon).toBe('0812****4321');
    });

    it('masks formatted phone numbers returned by verification', async () => {
      prisma.reservation.findFirst.mockResolvedValue({
        code: 'RSV-888', status: 'confirmed', startAt: new Date('2026-11-25T12:00:00Z'), partySize: 2,
        outlet: { name: 'Cabang Kemang', slug: 'kemang' }, table: null,
        customer: { name: 'Uni Rina', phone: '0812-3456-7890' },
      });

      const res = await service.executeTool('t-1', 'verify_reservation', {
        code: 'RSV-888', phoneLast4: '7890',
      });

      expect(res.nomorTelepon).not.toContain('3456');
      expect(res.nomorTelepon).toContain('7890');
    });
  });

  describe('tool logging and phone masking (PRO-93)', () => {
    it('records tool execution with masked input and output into audit log', async () => {
      prisma.outlet.findFirst.mockResolvedValue({ id: 'out-1', name: 'Kemang' });
      reservationsService.create.mockResolvedValue({
        code: 'RSV-NEW1',
        status: 'pending',
      });

      await service.executeTool(
        't-1',
        'create_reservation',
        {
          outletSlug: 'kemang',
          date: '2026-11-25',
          time: '18:00',
          partySize: 2,
          customerName: 'Budi',
          customerPhone: '081234567890',
          idempotencyKey: 'idem-1',
        },
        'session-123',
        'msg-456',
      );

      expect(prisma.aiToolCall.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sessionId: 'session-123',
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

  it('passes the chat tenant to reservation update and cancellation', async () => {
    reservationsService.update.mockResolvedValue({ code: 'RSV-1', status: 'pending' });
    reservationsService.cancel.mockResolvedValue({ code: 'RSV-1', status: 'cancelled' });

    await service.executeTool('tenant-1', 'update_reservation', {
      code: 'RSV-1', phoneLast4: '1234', partySize: 3,
    });
    await service.executeTool('tenant-1', 'cancel_reservation', {
      code: 'RSV-1', phoneLast4: '1234',
    });

    expect(reservationsService.update).toHaveBeenCalledWith(
      'RSV-1',
      expect.objectContaining({ phoneLast4: '1234', partySize: 3 }),
      'tenant-1',
    );
    expect(reservationsService.cancel).toHaveBeenCalledWith('RSV-1', '1234', undefined, 'tenant-1');
  });
});
