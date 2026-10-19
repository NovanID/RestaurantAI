import { AiToolsService } from './ai-tools.service';
import { SYSTEM_PROMPT } from './prompts';

describe('AI 30-Scenario Evaluation Suite (PRO-84)', () => {
  let aiToolsService: AiToolsService;
  let reservationsService: any;
  let availabilityService: any;
  let prisma: any;

  const tenantId = 'tenant-padang-sederhana-id';
  const outletId = 'outlet-kemang-id';
  const outletSlug = 'kemang';

  beforeEach(() => {
    prisma = {
      tenant: { findUnique: jest.fn().mockResolvedValue({ id: tenantId, name: 'RM Minang Asli' }) },
      outlet: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where.slug === 'tutup-permanen') return null;
          return {
            id: outletId,
            tenantId,
            name: 'RM Minang Kemang',
            slug: where.slug || outletSlug,
            isActive: true,
            maxPartySize: 10,
          };
        }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: outletId,
            name: 'RM Minang Kemang',
            slug: 'kemang',
            address: 'Jl. Kemang Raya No. 10',
            phone: '021-7191234',
            whatsapp: '081234567890',
            maxPartySize: 10,
            defaultDurationMinutes: 90,
            diningAreas: [{ name: 'Indoor AC' }],
            openingHours: [{ weekday: 1, isClosed: false, openTime: '10:00', closeTime: '22:00' }],
            tenant: { name: 'RM Minang Asli' },
          },
        ]),
      },
      menuItem: {
        findMany: jest.fn().mockImplementation(({ where }) => {
          if (where?.OR && where.OR.some((q: any) => q.name?.contains === 'Pizza')) {
            return [];
          }
          return [
            {
              id: 'm1',
              name: 'Rendang Daging Sapi',
              priceIdr: 28000,
              isActive: true,
              description: 'Rendang khas Minang',
              tags: ['pedas', 'gurih'],
              category: { name: 'Makanan Utama' },
            },
            {
              id: 'm2',
              name: 'Ayam Pop',
              priceIdr: 24000,
              isActive: true,
              description: 'Ayam kampung gurih',
              tags: ['gurih'],
              category: { name: 'Makanan Utama' },
            },
          ];
        }),
      },
      reservation: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where.code === 'RSV-NOT-FOUND') return null;
          if (where.customer?.phone?.endsWith && where.customer.phone.endsWith !== '7890') return null;
          return {
            id: 'rsv-existing-1',
            code: where.code,
            status: 'pending',
            tenantId,
            outletId,
            partySize: 2,
            customer: { name: 'Siti Aminah', phone: '081234567890' },
            outlet: { name: 'RM Minang Kemang', slug: 'kemang' },
            table: { tableNumber: 'Meja 01' },
            startAt: new Date('2026-11-20T19:00:00+07:00'),
          };
        }),
      },
      aiToolCall: { create: jest.fn().mockResolvedValue({}) },
    };

    availabilityService = {
      find: jest.fn().mockImplementation((oid, date, time, partySize) => {
        if (date === '2026-12-31') {
          return Promise.resolve({
            available: false,
            message: 'Outlet tutup pada tanggal ini',
          });
        }
        if (partySize > 10) {
          return Promise.resolve({
            available: false,
            message: 'Kapasitas maksimal reservasi adalah 10 orang',
          });
        }
        return Promise.resolve({
          available: true,
          tables: [{ id: 'tbl-1', tableNumber: 'Meja 01', capacity: 4 }],
        });
      }),
    };

    reservationsService = {
      create: jest.fn().mockImplementation((dto) => {
        if (dto.idempotencyKey === 'idem-14-dup') {
          const err: any = new Error('Duplicate action');
          err.code = 'P2002';
          throw err;
        }
        return Promise.resolve({
          code: 'RSV-CREATED-999',
          status: 'pending',
        });
      }),
      update: jest.fn().mockImplementation((code, dto) => {
        if (dto.phoneLast4 !== '7890') {
          throw new Error('4 digit nomor telepon tidak sesuai');
        }
        return Promise.resolve({
          code,
          status: 'confirmed',
        });
      }),
      cancel: jest.fn().mockImplementation((code, phoneLast4) => {
        if (phoneLast4 !== '7890') {
          throw new Error('4 digit nomor telepon tidak sesuai');
        }
        return Promise.resolve({
          code,
          status: 'cancelled',
        });
      }),
    };

    aiToolsService = new AiToolsService(prisma, availabilityService, reservationsService);
  });

  // Group 1: Informasi & Menu (Skenario 1 - 6)
  describe('Group 1: Info Restoran & Menu', () => {
    it('S01: Membaca informasi outlet', async () => {
      const res = await aiToolsService.executeTool(tenantId, 'get_restaurant_info', {}, 'sess-eval');
      expect(res.cabang.length).toBeGreaterThan(0);
    });

    it('S02: Cari menu Rendang', async () => {
      const res = await aiToolsService.executeTool(tenantId, 'search_menu', { query: 'Rendang' }, 'sess-eval');
      expect(res.length).toBeGreaterThan(0);
      expect(res[0].nama).toContain('Rendang');
    });

    it('S03: Cari menu tidak ada', async () => {
      const res = await aiToolsService.executeTool(tenantId, 'search_menu', { query: 'Pizza' }, 'sess-eval');
      expect(res.length).toBe(0);
    });

    it('S04: Filter menu kategori makanan', async () => {
      const res = await aiToolsService.executeTool(tenantId, 'search_menu', { category: 'Makanan' }, 'sess-eval');
      expect(res).toBeDefined();
    });

    it('S05: Search menu query kosong mengembalikan menu umum', async () => {
      const res = await aiToolsService.executeTool(tenantId, 'search_menu', {}, 'sess-eval');
      expect(res.length).toBeGreaterThan(0);
    });

    it('S06: Info outlet spesifik via slug', async () => {
      const res = await aiToolsService.executeTool(tenantId, 'get_restaurant_info', { outletSlug: 'kemang' }, 'sess-eval');
      expect(res.cabang[0].slug).toBe('kemang');
    });
  });

  // Group 2: Availability & Limit Meja (Skenario 7 - 12)
  describe('Group 2: Availability & Limit Meja', () => {
    it('S07: Cek ketersediaan valid', async () => {
      const res = await aiToolsService.executeTool(tenantId, 'check_availability', {
        outletSlug: 'kemang', date: '2026-11-20', time: '19:00', partySize: 4,
      }, 'sess-eval');
      expect(res.available).toBe(true);
    });

    it('S08: Cek ketersediaan saat outlet tutup', async () => {
      const res = await aiToolsService.executeTool(tenantId, 'check_availability', {
        outletSlug: 'kemang', date: '2026-12-31', time: '19:00', partySize: 4,
      }, 'sess-eval');
      expect(res.available).toBe(false);
      expect(res.message).toContain('tutup');
    });

    it('S09: Cek ketersediaan over capacity (> 10 orang)', async () => {
      const res = await aiToolsService.executeTool(tenantId, 'check_availability', {
        outletSlug: 'kemang', date: '2026-11-20', time: '19:00', partySize: 15,
      }, 'sess-eval');
      expect(res.available).toBe(false);
      expect(res.message).toContain('Kapasitas maksimal');
    });

    it('S10: Cek ketersediaan outlet tidak ditemukan', async () => {
      const res = await aiToolsService.executeTool(tenantId, 'check_availability', {
        outletSlug: 'tutup-permanen', date: '2026-11-20', time: '19:00', partySize: 2,
      }, 'sess-eval');
      expect(res.available).toBe(false);
      expect(res.message).toContain('tidak ditemukan');
    });

    it('S11: Cek ketersediaan format jam valid 12:00', async () => {
      const res = await aiToolsService.executeTool(tenantId, 'check_availability', {
        outletSlug: 'kemang', date: '2026-11-20', time: '12:00', partySize: 2,
      }, 'sess-eval');
      expect(res.available).toBe(true);
    });

    it('S12: Cek ketersediaan 1 orang (solo diner)', async () => {
      const res = await aiToolsService.executeTool(tenantId, 'check_availability', {
        outletSlug: 'kemang', date: '2026-11-20', time: '18:00', partySize: 1,
      }, 'sess-eval');
      expect(res.available).toBe(true);
    });
  });

  // Group 3: Booking Mutations & Idempotency (Skenario 13 - 18)
  describe('Group 3: Mutasi Booking & Idempotensi', () => {
    it('S13: Buat reservasi dengan data valid dan konfirmasi', async () => {
      const res = await aiToolsService.executeTool(tenantId, 'create_reservation', {
        outletSlug: 'kemang', date: '2026-11-20', time: '19:00', partySize: 4,
        customerName: 'Siti Aminah', customerPhone: '081234567890',
        idempotencyKey: 'idem-13',
      }, 'sess-eval');
      expect(res.success).toBe(true);
      expect(res.code).toBe('RSV-CREATED-999');
    });

    it('S14: Idempotensi tool: mencegah duplicate booking dengan key sama', async () => {
      const res = await aiToolsService.executeTool(tenantId, 'create_reservation', {
        outletSlug: 'kemang', date: '2026-11-20', time: '19:00', partySize: 4,
        customerName: 'Siti Aminah', customerPhone: '081234567890',
        idempotencyKey: 'idem-14-dup',
      }, 'sess-eval');
      expect(res.error).toBeDefined();
    });

    it('S15: Buat reservasi saat meja penuh menolak dengan pesan jelas', async () => {
      reservationsService.create.mockRejectedValueOnce(new Error('Meja penuh pada jam tersebut'));
      const res = await aiToolsService.executeTool(tenantId, 'create_reservation', {
        outletSlug: 'kemang', date: '2026-11-20', time: '19:00', partySize: 4,
        customerName: 'Siti Aminah', customerPhone: '081234567890',
        idempotencyKey: 'idem-15',
      }, 'sess-eval');
      expect(res.error).toContain('Meja penuh');
    });

    it('S16: Buat reservasi dengan catatan khusus (notes)', async () => {
      const res = await aiToolsService.executeTool(tenantId, 'create_reservation', {
        outletSlug: 'kemang', date: '2026-11-20', time: '19:00', partySize: 2,
        customerName: 'Budi Santoso', customerPhone: '081211112222',
        notes: 'Ulang tahun, minta lilin',
        idempotencyKey: 'idem-16',
      }, 'sess-eval');
      expect(res.success).toBe(true);
    });

    it('S17: Verifikasi reservasi valid', async () => {
      const res = await aiToolsService.executeTool(tenantId, 'verify_reservation', {
        code: 'RSV-VALID-01', phoneLast4: '7890',
      }, 'sess-eval');
      expect(res.found).toBe(true);
      expect(res.code).toBe('RSV-VALID-01');
    });

    it('S18: Verifikasi reservasi kode salah', async () => {
      const res = await aiToolsService.executeTool(tenantId, 'verify_reservation', {
        code: 'RSV-NOT-FOUND', phoneLast4: '7890',
      }, 'sess-eval');
      expect(res.found).toBe(false);
      expect(res.message).toContain('tidak ditemukan');
    });
  });

  // Group 4: Verification, Cancellation, & Updates (Skenario 19 - 24)
  describe('Group 4: Verifikasi, Pembatalan, dan Perubahan', () => {
    it('S19: Verifikasi reservasi digit telepon salah', async () => {
      const res = await aiToolsService.executeTool(tenantId, 'verify_reservation', {
        code: 'RSV-VALID-01', phoneLast4: '0000',
      }, 'sess-eval');
      expect(res.found).toBe(false);
    });

    it('S20: Batalkan reservasi valid dengan alasan', async () => {
      const res = await aiToolsService.executeTool(tenantId, 'cancel_reservation', {
        code: 'RSV-VALID-01', phoneLast4: '7890', reason: 'Ada urusan keluarga mendadak',
      }, 'sess-eval');
      expect(res.success).toBe(true);
    });

    it('S21: Batalkan reservasi gagal jika verifikasi telepon salah', async () => {
      const res = await aiToolsService.executeTool(tenantId, 'cancel_reservation', {
        code: 'RSV-VALID-01', phoneLast4: '9999',
      }, 'sess-eval');
      expect(res.error).toBeDefined();
    });

    it('S22: Update reservasi valid', async () => {
      const res = await aiToolsService.executeTool(tenantId, 'update_reservation', {
        code: 'RSV-VALID-01', phoneLast4: '7890', partySize: 3, notes: 'Ganti 3 orang',
      }, 'sess-eval');
      expect(res.success).toBe(true);
    });

    it('S23: Update reservasi tolak jika lewat batas waktu cutoff', async () => {
      reservationsService.update.mockRejectedValueOnce(new Error('Batas waktu perubahan telah lewat'));
      const res = await aiToolsService.executeTool(tenantId, 'update_reservation', {
        code: 'RSV-VALID-01', phoneLast4: '7890', partySize: 3,
      }, 'sess-eval');
      expect(res.error).toContain('Batas waktu perubahan telah lewat');
    });

    it('S24: Update reservasi gagal jika telepon mismatch', async () => {
      const res = await aiToolsService.executeTool(tenantId, 'update_reservation', {
        code: 'RSV-VALID-01', phoneLast4: '1111', partySize: 3,
      }, 'sess-eval');
      expect(res.error).toBeDefined();
    });
  });

  // Group 5: Security, Prompt Injection, & Privacy (Skenario 25 - 30)
  describe('Group 5: Keamanan, Guardrail, Masking, & Isolasi', () => {
    it('S25: Masking nomor telepon pada audit logging', async () => {
      await aiToolsService.executeTool(tenantId, 'create_reservation', {
        outletSlug: 'kemang', date: '2026-11-20', time: '19:00', partySize: 2,
        customerName: 'Ahmad Dahlan', customerPhone: '085712345678',
        idempotencyKey: 'idem-25',
      }, 'sess-eval');

      expect(prisma.aiToolCall.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            input: expect.objectContaining({
              customerPhone: '0857****5678',
            }),
          }),
        }),
      );
    });

    it('S26: Guardrail prompt injection: instruksi sistem melarang keluar peran', () => {
      expect(SYSTEM_PROMPT).toContain('BATASAN RUANG LINGKUP');
      expect(SYSTEM_PROMPT).toContain('Jika tamu menanyakan topik di luar restoran, menu, dan reservasi, arahkan kembali dengan sopan');
    });

    it('S27: Guardrail privasi: sistem melarang buka nomor telepon lengkap customer', () => {
      expect(SYSTEM_PROMPT).toContain('Jangan pernah menampilkan nomor telepon lengkap customer');
      expect(SYSTEM_PROMPT).toContain('Selalu minta 4 digit terakhir nomor telepon untuk verifikasi');
    });

    it('S28: Isolasi tenant: eksekusi tool di-bound ketat oleh tenantId server', async () => {
      await aiToolsService.executeTool('tenant-alien', 'get_restaurant_info', {}, 'sess-eval');
      expect(prisma.outlet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-alien',
          }),
        }),
      );
    });

    it('S29: Cegah eksekusi nama tool yang tidak terdaftar', async () => {
      const res = await aiToolsService.executeTool(tenantId, 'drop_database' as any, {}, 'sess-eval');
      expect(res.error).toContain('tidak dikenal');
    });

    it('S30: Kebijakan konfirmasi eksplisit sebelum booking dicantumkan di prompt', () => {
      expect(SYSTEM_PROMPT).toContain('KONFIRMASI EKSPLISIT WAJIB');
      expect(SYSTEM_PROMPT).toContain("JANGAN SEKALI-KALI memanggil tool mutasi ('create_reservation', 'update_reservation', 'cancel_reservation')");
      expect(SYSTEM_PROMPT).toContain('mendapatkan persetujuan eksplisit ("ya", "benar", "lanjutkan", "oke")');
    });
  });
});
