import { NotFoundException } from '@nestjs/common';
import { AiToolsService } from './ai-tools.service';
import { AiChatController } from './ai-chat.controller';
import { ReservationsService } from '../reservations/reservations.service';

describe('Multi-Tenant Isolation & Guard Tests (PRO-87)', () => {
  let aiToolsService: AiToolsService;
  let aiChatController: AiChatController;
  let reservationsService: ReservationsService;
  let prisma: any;
  let availabilityService: any;
  let llmClient: any;

  const tenantA = 'tenant-padang-sederhana-id';
  const tenantB = 'tenant-sari-bundo-id';

  beforeEach(() => {
    prisma = {
      tenant: { findUnique: jest.fn() },
      outlet: { findFirst: jest.fn(), findMany: jest.fn() },
      menuItem: { findMany: jest.fn() },
      reservation: { findFirst: jest.fn(), create: jest.fn(), updateMany: jest.fn(), findUniqueOrThrow: jest.fn() },
      auditEvent: { create: jest.fn() },
      reservationStatusHistory: { create: jest.fn() },
      aiToolCall: { create: jest.fn() },
      chatSession: { findFirst: jest.fn(), create: jest.fn() },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };
    availabilityService = { find: jest.fn() };
    llmClient = { chatCompletion: jest.fn().mockResolvedValue({ message: { role: 'assistant', content: 'Halo' } }) };
    reservationsService = new ReservationsService(prisma, availabilityService);
    aiToolsService = new AiToolsService(prisma, availabilityService, reservationsService);
    aiChatController = new AiChatController(llmClient, aiToolsService, prisma);
  });

  describe('AI Tools Tenant Scoping', () => {
    it('prevents get_restaurant_info from leaking outlets across tenants', async () => {
      // Mock findMany on outlet with where clause
      (prisma.outlet.findMany as jest.Mock).mockImplementation(({ where }) => {
        if (where.tenantId === tenantA) {
          return Promise.resolve([
            { id: 'out-a1', name: 'Sederhana Kemang', tenant: { name: 'Padang Sederhana' }, diningAreas: [], openingHours: [] },
          ]);
        }
        return Promise.resolve([]);
      });

      const resTenantA = await aiToolsService.getRestaurantInfo(tenantA);
      expect(resTenantA.cabang).toHaveLength(1);
      expect(resTenantA.cabang?.[0].nama).toBe('Sederhana Kemang');

      const resTenantB = await aiToolsService.getRestaurantInfo(tenantB);
      expect(resTenantB.error).toBe('Restoran tidak ditemukan');
    });

    it('prevents search_menu from returning dishes from another tenant', async () => {
      (prisma.menuItem.findMany as jest.Mock).mockImplementation(({ where }) => {
        if (where.tenantId === tenantA) {
          return Promise.resolve([
            { id: 'm-1', name: 'Rendang Sederhana', priceIdr: 30000, tags: ['pedas'], category: { name: 'Lauk' } },
          ]);
        }
        return Promise.resolve([]);
      });

      const menuA = await aiToolsService.searchMenu(tenantA, 'Rendang');
      expect(menuA).toHaveLength(1);
      expect(menuA[0].nama).toBe('Rendang Sederhana');

      const menuB = await aiToolsService.searchMenu(tenantB, 'Rendang');
      expect(menuB).toHaveLength(0);
    });

    it('rejects reservation verification if booking code belongs to another tenant', async () => {
      (prisma.reservation.findFirst as jest.Mock).mockImplementation(({ where }) => {
        // Reservation exists under Tenant A, not Tenant B
        if (where.tenantId === tenantA && where.code === 'RSV-TENANT-A') {
          return Promise.resolve({
            code: 'RSV-TENANT-A',
            tenantId: tenantA,
            status: 'confirmed',
            startAt: new Date(),
            partySize: 2,
            outlet: { name: 'Kemang' },
            table: { tableNumber: '1' },
            customer: { name: 'Rizal', phone: '081234567890' },
          });
        }
        return Promise.resolve(null);
      });

      // Tenant A can verify its own reservation
      const resA = await aiToolsService.verifyReservation(tenantA, 'RSV-TENANT-A', '7890');
      expect(resA.found).toBe(true);

      // Tenant B trying to verify Tenant A's reservation is blocked
      const resB = await aiToolsService.verifyReservation(tenantB, 'RSV-TENANT-A', '7890');
      expect(resB.found).toBe(false);
      expect(resB.message).toContain('Data reservasi tidak ditemukan');
    });

    it('rejects reservation update or cancellation across tenants', async () => {
      (prisma.reservation.findFirst as jest.Mock).mockImplementation(({ where }) => {
        if (where.tenantId === tenantA && where.code === 'RSV-A') {
          return Promise.resolve({
            id: 'rsv-id-1',
            code: 'RSV-A',
            tenantId: tenantA,
            customerId: 'cust-1',
            status: 'confirmed',
            startAt: new Date(Date.now() + 24 * 60 * 60_000),
            outlet: { changeCutoffMinutes: 60 },
            customer: { phone: '081234567890' },
          });
        }
        return Promise.resolve(null);
      });

      // Tenant B cannot cancel Tenant A's reservation
      await expect(
        reservationsService.cancel('RSV-A', '7890', undefined, tenantB),
      ).rejects.toBeInstanceOf(NotFoundException);

      // Tenant B cannot update Tenant A's reservation
      await expect(
        reservationsService.update('RSV-A', { phoneLast4: '7890', partySize: 4 }, tenantB),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('Chat Session Tenant Guard', () => {
    it('supplies current Jakarta date across the UTC day boundary', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-10-20T18:15:00Z'));
      try {
        prisma.chatSession.create.mockResolvedValue({ id: 'new-session-id' });
        await aiChatController.chat(tenantA, { message: 'hari ini jam 16.00 WIB ada slot?' } as any);
        const prompt = llmClient.chatCompletion.mock.calls[0][0][0].content;
        expect(prompt).toContain('2026-10-21 01:15');
        expect(prompt).toContain('Asia/Jakarta');
        expect(prompt).toContain('jangan minta tanggal kalender lagi');
      } finally {
        jest.useRealTimers();
      }
    });
    it('retries XML-like model output using structured tool calls without exposing markup', async () => {
      (prisma.chatSession.create as jest.Mock).mockResolvedValue({ id: 'new-session-id' });
      const executeTool = jest.spyOn(aiToolsService, 'executeTool').mockResolvedValue([
        { nama: 'Es Teh', harga: 5000 },
      ] as any);
      llmClient.chatCompletion
        .mockResolvedValueOnce({
          message: {
            role: 'assistant',
            content: '<dots_function_call><invoke name="search_menu"><parameter name="query">teh</parameter></invoke></dots_function_call>',
          },
        })
        .mockResolvedValueOnce({
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [{
              id: 'tool-1',
              type: 'function',
              function: { name: 'search_menu', arguments: '{"query":"teh"}' },
            }],
          },
        })
        .mockResolvedValueOnce({
          message: { role: 'assistant', content: 'Kami menyediakan Es Teh seharga Rp5.000.' },
        });

      const res = await aiChatController.chat(tenantA, { message: 'Minuman yang tersedia apa saja?' } as any);

      expect(executeTool).toHaveBeenCalledWith(tenantA, 'search_menu', { query: 'teh' }, 'new-session-id');
      expect(res.reply).toBe('Kami menyediakan Es Teh seharga Rp5.000.');
      expect(res.reply).not.toContain('<dots_function_call>');
    });

    it('executes multiple read-only calls from free-model markup without leaking tags', async () => {
      (prisma.chatSession.create as jest.Mock).mockResolvedValue({ id: 'new-session-id' });
      const executeTool = jest.spyOn(aiToolsService, 'executeTool').mockResolvedValue({ available: true } as any);
      llmClient.chatCompletion
        .mockResolvedValueOnce({
          message: {
            role: 'assistant',
            content: '<|tool_call_start|>\n[check_availability(outletSlug="kemang", date="2026-10-21", time="18:00"), check_availability(outletSlug="tebet", date="2026-10-21", time="18:00")]\n<|tool_call_end|>',
          },
        })
        .mockResolvedValueOnce({
          message: { role: 'assistant', content: 'Saya sudah mengecek ketersediaan kedua cabang.' },
        });

      const res = await aiChatController.chat(tenantA, {
        message: 'untuk 5 orang',
        history: [{ role: 'user', content: 'untuk hari ini jam 18.00 WIB ada slot?' }],
      } as any);

      expect(executeTool).toHaveBeenNthCalledWith(1, tenantA, 'check_availability', {
        outletSlug: 'kemang', date: '2026-10-21', time: '18:00', partySize: 5,
      }, 'new-session-id');
      expect(executeTool).toHaveBeenNthCalledWith(2, tenantA, 'check_availability', {
        outletSlug: 'tebet', date: '2026-10-21', time: '18:00', partySize: 5,
      }, 'new-session-id');
      expect(res.reply).toBe('Saya sudah mengecek ketersediaan kedua cabang.');
      expect(res.reply).not.toContain('tool_call');
    });

    it('uses tool results when formatter turn returns raw tool markup for menu', async () => {
      prisma.chatSession.create.mockResolvedValue({ id: 'new-session-id' });
      jest.spyOn(aiToolsService, 'executeTool').mockResolvedValue([
        { nama: 'Es Teh', harga: 5000 },
      ] as any);
      llmClient.chatCompletion
        .mockResolvedValueOnce({ message: {
          role: 'assistant',
          content: '<|tool_call_start|>[search_menu(category="Minuman")]<|tool_call_end|>',
        } })
        .mockResolvedValueOnce({ message: {
          role: 'assistant', content: '<|tool_call_start|>[search_menu(category="Minuman")]<|tool_call_end|>',
        } });

      const res = await aiChatController.chat(tenantA, { message: 'minuman apa saja?' } as any);

      expect(res.reply).toContain('Es Teh');
      expect(res.reply).not.toContain('tool_call');
    });

    it('uses tool results when formatter turn returns raw tool markup', async () => {
      prisma.chatSession.create.mockResolvedValue({ id: 'new-session-id' });
      jest.spyOn(aiToolsService, 'executeTool').mockResolvedValue({
        available: false, outlet: 'Kemang', message: 'Seluruh meja penuh.',
      } as any);
      llmClient.chatCompletion
        .mockResolvedValueOnce({ message: {
          role: 'assistant',
          content: '<|tool_call_start|>[check_availability(outletSlug="kemang", date="2026-10-21", time="18:00", partySize=4)]<|tool_call_end|>',
        } })
        .mockResolvedValueOnce({ message: {
          role: 'assistant', content: '<|tool_call_start|>[check_availability(outletSlug="kemang")]<|tool_call_end|>',
        } });

      const res = await aiChatController.chat(tenantA, { message: 'kalau untuk 4 orang?' } as any);

      expect(res.reply).toContain('Kemang: tidak tersedia');
      expect(res.reply).not.toContain('tool_call');
    });

    it.each([
      'cancel_reservation(code="RSV-123")',
      'check_availability(outletSlug="kemang", date="2026-10-21", time="18:00")',
      'check_availability(outletSlug="kemang", date="2026-02-31", time="18:00", partySize="5")',
      'check_availability(outletSlug="kemang", date="2026-10-21", time="18:00", partySize="13")',
      'search_menu(tags="pedas")',
    ])('rejects unsafe or incomplete markup: %s', async (call) => {
      prisma.chatSession.create.mockResolvedValue({ id: 'new-session-id' });
      const executeTool = jest.spyOn(aiToolsService, 'executeTool');
      llmClient.chatCompletion.mockResolvedValue({ message: {
        role: 'assistant', content: `<|tool_call_start|>[${call}]<|tool_call_end|>`,
      } });
      const res = await aiChatController.chat(tenantA, { message: 'cek meja' } as any);
      expect(executeTool).not.toHaveBeenCalled();
      expect(res.reply).not.toContain('tool_call');
    });

    it('returns a safe message if model keeps emitting tool markup', async () => {
      (prisma.chatSession.create as jest.Mock).mockResolvedValue({ id: 'new-session-id' });
      llmClient.chatCompletion.mockResolvedValue({
        message: {
          role: 'assistant',
          content: '<dots_function_call><invoke name="cancel_reservation"></invoke></dots_function_call>',
        },
      });

      const res = await aiChatController.chat(tenantA, { message: 'halo' } as any);

      expect(res.reply).not.toContain('<dots_function_call>');
      expect(res.reply).toContain('belum ada perubahan reservasi');
    });

    it('rejects chat session header if session belongs to another tenant', async () => {
      // Session exists for Tenant A, not Tenant B
      const sessionA = 'a0000000-0000-4000-8000-000000000001';
      (prisma.chatSession.findFirst as jest.Mock).mockImplementation(({ where }) => {
        if (where.id === sessionA && where.tenantId === tenantA) {
          return Promise.resolve({ id: sessionA, tenantId: tenantA });
        }
        return Promise.resolve(null);
      });

      // Request sent to Tenant B with Tenant A's session header
      await expect(
        aiChatController.chat(tenantB, { message: 'halo' } as any, sessionA),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('creates fresh session when header is omitted', async () => {
      (prisma.chatSession.create as jest.Mock).mockResolvedValue({ id: 'new-session-id' });

      const res = await aiChatController.chat(tenantA, { message: 'halo' } as any);
      expect(res.sessionId).toBe('new-session-id');
      expect(prisma.chatSession.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { tenantId: tenantA } }),
      );
    });
  });
});
