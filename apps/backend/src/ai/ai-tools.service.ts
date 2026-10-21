import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { ReservationsService } from '../reservations/reservations.service';
import { maskSensitiveData } from './phone-mask.util';

@Injectable()
export class AiToolsService {
  private readonly logger = new Logger(AiToolsService.name);
  private readonly pendingMutations = new Map<string, {
    toolName: string;
    args: Record<string, any>;
    expiresAt: number;
  }>();
  private readonly mutationTools = new Set([
    'create_reservation',
    'update_reservation',
    'cancel_reservation',
  ]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityService: AvailabilityService,
    private readonly reservationsService: ReservationsService,
  ) {}

  async executeTool(
    tenantId: string,
    toolName: string,
    args: Record<string, any>,
    sessionId?: string,
    messageId?: string,
    confirmed = false,
  ): Promise<any> {
    const startTime = Date.now();
    let status: 'ok' | 'error' = 'ok';
    let result: any;

    try {
      if (this.mutationTools.has(toolName)) {
        result = this.authorizeMutation(tenantId, sessionId, toolName, args, confirmed);
        if (result) return result;
      }

      switch (toolName) {
        case 'get_restaurant_info':
          result = await this.getRestaurantInfo(tenantId, args.outletSlug);
          break;
        case 'search_menu':
          result = await this.searchMenu(tenantId, args.query, args.category, args.tags);
          break;
        case 'check_availability':
          result = await this.checkAvailability(
            tenantId,
            args.outletSlug,
            args.date,
            args.time,
            args.partySize,
          );
          break;
        case 'verify_reservation':
          result = await this.verifyReservation(tenantId, args.code, args.phoneLast4);
          break;
        case 'create_reservation':
          result = await this.createReservation(tenantId, args);
          break;
        case 'update_reservation':
          result = await this.updateReservation(tenantId, args);
          break;
        case 'cancel_reservation':
          result = await this.cancelReservation(tenantId, args.code, args.phoneLast4);
          break;
        default:
          throw new BadRequestException(`Tool ${toolName} tidak dikenal.`);
      }
    } catch (err: any) {
      status = 'error';
      result = { error: err.message || 'Gagal mengeksekusi tool' };
      this.logger.warn(`AI Tool ${toolName} failed: ${err.message}`);
    } finally {
      const latencyMs = Date.now() - startTime;
      if (sessionId) {
        await this.logToolCall(tenantId, sessionId, messageId, toolName, args, result, status, latencyMs);
      }
    }

    return result;
  }

  async confirmPendingMutation(tenantId: string, sessionId: string) {
    this.cleanExpiredMutations();
    const pending = this.pendingMutations.get(`${tenantId}:${sessionId}`);
    if (!pending) return { error: 'Tidak ada perubahan yang menunggu konfirmasi.' };
    return this.executeTool(tenantId, pending.toolName, pending.args, sessionId, undefined, true);
  }

  private authorizeMutation(
    tenantId: string,
    sessionId: string | undefined,
    toolName: string,
    args: Record<string, any>,
    confirmed: boolean,
  ) {
    if (!sessionId) {
      throw new BadRequestException('Sesi chat wajib tersedia untuk perubahan reservasi.');
    }

    this.cleanExpiredMutations();

    const key = `${tenantId}:${sessionId}`;
    const pending = this.pendingMutations.get(key);
    const canonicalize = (value: Record<string, any>) =>
      JSON.stringify(Object.keys(value).sort().map((key) => [key, value[key]]));
    if (confirmed && pending && pending.toolName === toolName
      && canonicalize(pending.args) === canonicalize(args)) {
      this.pendingMutations.delete(key);
      return undefined;
    }

    this.pendingMutations.set(key, {
      toolName,
      args: JSON.parse(JSON.stringify(args)),
      expiresAt: Date.now() + 5 * 60_000,
    });

    return {
      confirmationRequired: true,
      message: 'Konfirmasi eksplisit diperlukan. Tampilkan ringkasan data, lalu minta pelanggan mengonfirmasi dengan jelas sebelum reservasi diproses.',
    };
  }

  cleanExpiredMutations() {
    const now = Date.now();
    for (const [key, val] of this.pendingMutations.entries()) {
      if (val.expiresAt <= now) {
        this.pendingMutations.delete(key);
      }
    }
    if (this.pendingMutations.size > 1000) {
      const oldestKey = this.pendingMutations.keys().next().value;
      if (oldestKey) this.pendingMutations.delete(oldestKey);
    }
  }

  clearPendingMutation(tenantId: string, sessionId: string): boolean {
    const key = `${tenantId}:${sessionId}`;
    const exists = this.pendingMutations.has(key);
    this.pendingMutations.delete(key);
    return exists;
  }

  // --- READ-ONLY TOOLS ---

  async getRestaurantInfo(tenantId: string, outletSlug?: string) {
    const outlets = (await (this.prisma.outlet as any).findMany({
      where: {
        tenantId,
        isActive: true,
        ...(outletSlug ? { slug: outletSlug } : {}),
      },
      include: {
        openingHours: { orderBy: { weekday: 'asc' } },
        diningAreas: { select: { name: true } },
        tenant: { select: { name: true } },
      },
    })) as any[];

    if (outlets.length === 0) return { error: 'Restoran tidak ditemukan' };

    return {
      namaRestoran: outlets[0].tenant?.name || 'Padang Sederhana',
      deskripsi: 'Masakan Padang Autentik & Minang Asli dengan cita rasa pusaka.',
      cabang: outlets.map((o) => ({
        id: o.id,
        nama: o.name,
        slug: o.slug,
        alamat: o.address,
        telepon: o.phone,
        whatsapp: o.whatsapp,
        kapasitasMaksimalPerMeja: o.maxPartySize,
        durasiReservasiMenit: o.defaultDurationMinutes,
        area: o.diningAreas?.map((a: any) => a.name) || [],
        jamBuka: (o.openingHours || []).map((h: any) => ({
          hariKe: h.weekday,
          buka: h.isClosed ? 'Tutup' : `${h.openTime} - ${h.closeTime} WIB`,
        })),
      })),
    };
  }

  async searchMenu(tenantId: string, query?: string, category?: string, tags?: string[]) {
    const items = await this.prisma.menuItem.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(category
          ? {
              category: { name: { contains: category, mode: 'insensitive' } },
            }
          : {}),
        ...(tags && tags.length > 0
          ? {
              tags: { hasSome: tags },
            }
          : {}),
      },
      include: {
        category: { select: { name: true } },
      },
      take: 15,
      orderBy: { name: 'asc' },
    });

    return items.map((item) => ({
      id: item.id,
      nama: item.name,
      kategori: item.category?.name || 'Lainnya',
      harga: item.priceIdr,
      deskripsi: item.description,
      tagRasa: item.tags,
      gambar: item.imageUrl,
    }));
  }

  // --- RESERVATION & MUTATION TOOLS (PRO-94) ---

  async checkAvailability(
    tenantId: string,
    outletSlug: string,
    date: string,
    time: string,
    partySize: number,
  ) {
    const outlet = await this.prisma.outlet.findFirst({
      where: { tenantId, slug: outletSlug, isActive: true },
    });
    if (!outlet) return { available: false, message: `Cabang ${outletSlug} tidak ditemukan.` };

    const avail = await this.availabilityService.find(outlet.id, date, time, partySize);
    return {
      available: avail.available,
      outlet: outlet.name,
      date,
      time,
      partySize,
      message: avail.available
        ? `Meja tersedia untuk ${partySize} orang di ${outlet.name} pada ${date} pukul ${time} WIB.`
        : (avail as any).message || 'Maaf, seluruh meja pada waktu tersebut sudah penuh.',
    };
  }

  async verifyReservation(tenantId: string, code: string, phoneLast4: string) {
    const rsv = await this.prisma.reservation.findFirst({
      where: {
        tenantId,
        code,
        customer: { phone: { endsWith: phoneLast4 } },
      },
      include: {
        outlet: { select: { name: true, slug: true } },
        table: { select: { tableNumber: true } },
        customer: { select: { name: true, phone: true } },
      },
    });

    if (!rsv) return { found: false, message: 'Data reservasi tidak ditemukan atau 4 digit nomor telepon salah.' };

    const localTime = new Date(rsv.startAt.getTime() + 7 * 60 * 60_000).toISOString();
    return {
      found: true,
      code: rsv.code,
      status: rsv.status,
      cabang: rsv.outlet.name,
      tanggal: localTime.slice(0, 10),
      jam: localTime.slice(11, 16) + ' WIB',
      tamu: rsv.partySize,
      pemesan: rsv.customer.name,
      nomorTelepon: rsv.customer.phone.replace(/(\d{4})\d+(\d{4})/, '$1****$2'),
      meja: rsv.table?.tableNumber,
      catatan: rsv.notes,
    };
  }

  async createReservation(tenantId: string, args: any) {
    const outlet = await this.prisma.outlet.findFirst({
      where: { tenantId, slug: args.outletSlug, isActive: true },
    });
    if (!outlet) throw new BadRequestException(`Cabang ${args.outletSlug} tidak ditemukan.`);

    const created = await this.reservationsService.create({
      outletId: outlet.id,
      date: args.date,
      time: args.time,
      partySize: Number(args.partySize),
      name: args.customerName,
      phone: args.customerPhone,
      notes: args.notes,
      idempotencyKey: args.idempotencyKey,
    });

    return {
      success: true,
      code: created.code,
      status: created.status,
      message: `Reservasi berhasil dibuat dengan kode tiket ${created.code}. Tim kami menunggu kedatangan Uni/Uda di ${outlet.name}.`,
    };
  }

  async updateReservation(tenantId: string, args: any) {
    const updated = await this.reservationsService.update(
      args.code,
      {
        phoneLast4: args.phoneLast4,
        date: args.date,
        time: args.time,
        partySize: args.partySize ? Number(args.partySize) : undefined,
        notes: args.notes,
      },
      tenantId,
    );

    return {
      success: true,
      code: updated.code,
      status: updated.status,
      message: `Jadwal reservasi ${updated.code} berhasil diperbarui.`,
    };
  }

  async cancelReservation(tenantId: string, code: string, phoneLast4: string) {
    const cancelled = await this.reservationsService.cancel(code, phoneLast4, undefined, tenantId);
    return {
      success: true,
      code: cancelled.code,
      status: cancelled.status,
      message: `Reservasi ${cancelled.code} telah dibatalkan atas permintaan Anda.`,
    };
  }

  // --- LOGGING TOOL CALLS (PRO-93) ---

  private async logToolCall(
    tenantId: string,
    sessionId: string,
    messageId: string | undefined,
    toolName: string,
    input: any,
    output: any,
    status: 'ok' | 'error',
    latencyMs: number,
  ) {
    try {
      const maskedInput = maskSensitiveData(input);
      const maskedOutput = maskSensitiveData(output);

      await this.prisma.aiToolCall.create({
        data: {
          tenantId,
          sessionId,
          messageId,
          toolName,
          input: maskedInput as any,
          output: maskedOutput as any,
          status,
          latencyMs,
        },
      });
    } catch (err: any) {
      this.logger.error(`Gagal mencatat audit log AI tool call: ${err.message}`);
    }
  }
}
