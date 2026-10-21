import { BadRequestException, Body, Controller, Headers, NotFoundException, Param, Post, UseInterceptors } from '@nestjs/common';
import { LlmClient } from './llm.client';
import { AiToolsService } from './ai-tools.service';
import { RESTAURANT_TOOLS } from './tools.definition';
import { SYSTEM_PROMPT } from './prompts';
import { PrismaService } from '../prisma/prisma.service';
import { createRateLimitInterceptor } from '../common/rate-limit.service';
import { ChatMessageDto } from './dto/chat-message.dto';

const ChatRateLimit = createRateLimitInterceptor({
  windowMs: 60_000,
  maxRequests: 20,
  keyPrefix: 'ai-chat',
  message: 'Batas pesan chat tercapai (maksimal 20 pesan/menit). Silakan tunggu sebentar.',
});

@Controller('ai/chat')
export class AiChatController {
  constructor(
    private readonly llmClient: LlmClient,
    private readonly aiToolsService: AiToolsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post(':tenantId')
  @UseInterceptors(ChatRateLimit)
  async chat(
    @Param('tenantId') tenantId: string,
    @Body() body: ChatMessageDto,
    @Headers('x-session-id') sessionIdHeader?: string,
  ) {

    const sessionId = await this.resolveSession(tenantId, sessionIdHeader);

    if (this.isClearlyOutOfScope(body.message)) {
      return {
        sessionId,
        reply: 'Maaf, saya hanya dapat membantu seputar informasi menu, cabang, dan reservasi meja di Rumah Makan Padang Sederhana. Ada yang bisa saya bantu terkait reservasi atau menu hari ini?',
      };
    }

    // Handle rejection or cancellation of pending proposal
    const explicitRejection = /^\s*(tidak|batal|batalkan|jangan|bukan|tidak jadi|gak jadi|nggak jadi)\b/i.test(body.message);
    if (explicitRejection) {
      const cleared = this.aiToolsService.clearPendingMutation(tenantId, sessionId);
      if (cleared) {
        return { sessionId, reply: 'Baik, perubahan atau pemesanan telah dibatalkan. Ada hal lain yang bisa saya bantu?' };
      }
    }

    // Flexible affirmative confirmation matching
    const explicitConfirmation = /^\s*(ya|iya|benar|betul|setuju|oke|ok|siap|lanjutkan|sudah sesuai|sesuai|ya benar|iya benar|oke lanjutkan|ya silakan|tolong lanjutkan|silakan proses|proses sekarang)\b/i.test(body.message);

    if (explicitConfirmation) {
      const confirmed = await this.aiToolsService.confirmPendingMutation(tenantId, sessionId);
      if (!('error' in confirmed)) {
        return { sessionId, reply: confirmed.message };
      }
      if (confirmed.error !== 'Tidak ada perubahan yang menunggu konfirmasi.') {
        return { sessionId, reply: `Maaf, konfirmasi tidak dapat diproses: ${confirmed.error}` };
      }
    }

    // Construct prompt history with reliable current date/time in restaurant timezone.
    const now = new Date();
    const currentWib = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(now);
    const conversation: any[] = [
      { role: 'system', content: `${SYSTEM_PROMPT}\n\nWAKTU SAAT INI (Asia/Jakarta, WIB): ${currentWib}. "Hari ini" berarti tanggal WIB tersebut; "besok" berarti hari berikutnya dalam WIB. Jika tamu sudah menyebut "hari ini", jangan minta tanggal kalender lagi. Jangan mengarang slot kosong; tanyakan hanya cabang dan jumlah tamu yang belum diketahui sebelum memanggil check_availability.` },
      ...(body.history || []).map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: body.message },
    ];

    // First LLM turn
    const firstResponse = await this.llmClient.chatCompletion(conversation, RESTAURANT_TOOLS);
    let message = firstResponse.message;
    let rawToolCalls = message.tool_calls || [];
    if (!rawToolCalls.length && this.hasToolMarkup(message.content)) {
      rawToolCalls = this.parseReadOnlyMarkup(message.content, body.message);
      if (!rawToolCalls.length) {
        const retry = await this.llmClient.chatCompletion([
          ...conversation,
          { role: 'system', content: 'Gunakan tool_calls terstruktur untuk mengambil data. Jangan menulis perintah tool sebagai teks jawaban.' },
        ], RESTAURANT_TOOLS);
        message = retry.message;
        rawToolCalls = message.tool_calls || [];
      }
    }

    // Handle tool call chaining

    if (rawToolCalls && rawToolCalls.length > 0) {
      conversation.push({
        ...message,
        content: message.content ? this.stripXmlToolCalls(message.content) : null,
        tool_calls: rawToolCalls,
      });

      const maxToolCalls = 5;
      const toolCallsToExecute = rawToolCalls.slice(0, maxToolCalls);

      for (const call of toolCallsToExecute) {
        let parsedArgs: Record<string, any> = {};
        try {
          parsedArgs = typeof call.function.arguments === 'string'
            ? JSON.parse(call.function.arguments)
            : (call.function.arguments || {});
        } catch {
          parsedArgs = {};
        }

        const toolResult = await this.aiToolsService.executeTool(
          tenantId,
          call.function.name,
          parsedArgs,
          sessionId,
        );

        conversation.push({
          role: 'tool',
          name: call.function.name,
          tool_call_id: call.id,
          content: JSON.stringify(toolResult),
        });
      }

      // Second turn with tool result to generate natural response.
      // Do NOT send tools array to force model to answer user directly instead of attempting another tool call or outputting raw XML tags.
      const secondResponse = await this.llmClient.chatCompletion(conversation, undefined);

      let finalReply = secondResponse.message.content?.trim();

      if (!finalReply || this.containsToolMarkup(finalReply)) {
        const hasAvailability = conversation.some((item) => item.role === 'tool' && item.name === 'check_availability');
        const hasMenu = conversation.some((item) => item.role === 'tool' && item.name === 'search_menu');

        if (hasAvailability) {
          finalReply = this.formatAvailabilityResults(conversation);
        } else if (hasMenu) {
          finalReply = this.formatMenuResults(conversation);
        } else {
          const thirdResponse = await this.llmClient.chatCompletion([
            ...conversation,
            {
              role: 'system',
              content: 'Jawab pertanyaan pelanggan secara ramah dalam Bahasa Indonesia berdasarkan data di atas. Jangan memanggil tool lagi dan jangan sertakan tag XML atau format perintah apa pun.',
            },
          ]);
          finalReply = thirdResponse.message.content?.trim();
        }
      }

      return {
        sessionId,
        reply: this.stripXmlToolCalls(finalReply || 'Berikut adalah informasi menu dan reservasi kami. Apakah ada hal lain yang ingin Anda tanyakan?'),
      };
    }

    return {
      sessionId,
      reply: this.stripXmlToolCalls(message.content || 'Ada yang bisa kami bantu seputar menu dan reservasi Padang Sederhana?'),
    };
  }

  private isClearlyOutOfScope(message: string): boolean {
    return /\b(?:html|css|javascript|typescript|python|java|php|golang|rust|sql|coding|program(?:ming|mer)?|source\s*code|buat(?:kan)?\s+(?:kode|code|script)|skrip)\b/i.test(message);
  }

  private hasToolMarkup(text: string | null | undefined): boolean {
    return /<\/?(?:dots_function_call|tool_call|invoke|parameter)\b|<\|tool_call_(?:start|end)\|>/i.test(text || '');
  }

  private containsToolMarkup(text: string | null | undefined): boolean {
    return this.hasToolMarkup(text) || /^\s*\[[a-z_]+\(/i.test(text || '');
  }

  private formatAvailabilityResults(conversation: any[]): string {
    const results = conversation
      .filter((item) => item.role === 'tool' && item.name === 'check_availability')
      .map((item) => {
        try {
          const parsed = JSON.parse(item.content);
          if (parsed.error || typeof parsed.available !== 'boolean') {
            return `${parsed.outlet || 'Cabang'}: pengecekan gagal; ketersediaan belum diketahui.`;
          }
          return `${parsed.outlet || 'Cabang'}: ${parsed.available ? 'tersedia' : 'tidak tersedia'}${parsed.message ? ` (${parsed.message})` : ''}`;
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    return results.length
      ? `Hasil pengecekan ketersediaan meja:\n${results.map((result) => `- ${result}`).join('\n')}\n\nApakah Anda ingin mencari waktu lain atau melanjutkan reservasi?`
      : 'Maaf, pengecekan ketersediaan belum dapat diproses. Silakan coba lagi.';
  }

  private formatMenuResults(conversation: any[]): string {
    const dishes: Array<{ nama: string; harga: number }> = [];
    for (const item of conversation) {
      if (item.role === 'tool' && item.name === 'search_menu') {
        try {
          const parsed = JSON.parse(item.content);
          if (Array.isArray(parsed)) {
            for (const dish of parsed) {
              if (dish?.nama && typeof dish?.harga === 'number') dishes.push(dish);
            }
          }
        } catch {
          // ignore
        }
      }
    }
    return dishes.length
      ? `Berikut pilihan menu yang tersedia:\n${dishes.map((d) => `- **${d.nama}** (Rp ${d.harga.toLocaleString('id-ID')})`).join('\n')}\n\nAda menu lain yang ingin Anda tanyakan?`
      : 'Maaf, menu yang Anda cari belum ditemukan saat ini. Silakan tanyakan menu lainnya!';
  }

  private parseReadOnlyMarkup(content: string | null, userMessage: string): any[] {
    const block = content?.match(/^\s*<\|tool_call_start\|>\s*\[([\s\S]*?)\]\s*<\|tool_call_end\|>\s*$/i);
    if (!block) return [];
    const calls: any[] = [];
    const pattern = /(search_menu|check_availability)\s*\(([^()]*)\)/gi;
    let match: RegExpExecArray | null;
    let remainder = block[1];
    while ((match = pattern.exec(block[1])) !== null && calls.length < 5) {
      remainder = remainder.replace(match[0], '');
      const args: Record<string, string | number> = {};
      const argPattern = /([a-zA-Z]+)\s*=\s*(?:(['"])([^'"\r\n]*)\2|(\d{1,2}))/g;
      let argMatch: RegExpExecArray | null;
      let argRemainder = match[2];
      while ((argMatch = argPattern.exec(match[2])) !== null) {
        if (Object.hasOwn(args, argMatch[1])) return [];
        args[argMatch[1]] = argMatch[3] ?? Number(argMatch[4]);
        argRemainder = argRemainder.replace(argMatch[0], '');
      }
      if (argRemainder.replace(/[\s,]/g, '')) return [];
      if (match[1].toLowerCase() === 'check_availability') {
        const partySize = args.partySize ?? userMessage.match(/\b(?:untuk\s+)?(\d{1,2})\s*orang\b/i)?.[1];
        if (!partySize || !/^\d{1,2}$/.test(String(partySize)) || Number(partySize) < 1 || Number(partySize) > 12 ||
          typeof args.outletSlug !== 'string' || !/^[a-z0-9-]+$/i.test(args.outletSlug) ||
          typeof args.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(args.date) ||
          !Number.isFinite(Date.parse(`${args.date}T00:00:00Z`)) ||
          new Date(`${args.date}T00:00:00Z`).toISOString().slice(0, 10) !== args.date ||
          typeof args.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(args.time) ||
          Object.keys(args).some((key) => !['outletSlug', 'date', 'time', 'partySize'].includes(key))) return [];
        args.partySize = Number(partySize);
      } else if (Object.keys(args).some((key) => !['query', 'category'].includes(key))) return [];
      calls.push({
        id: `read_${calls.length}`,
        type: 'function',
        function: { name: match[1].toLowerCase(), arguments: JSON.stringify(args) },
      });
    }
    return calls.length && !remainder.replace(/[\s,]/g, '') ? calls : [];
  }

  private stripXmlToolCalls(text: string): string {
    return this.hasToolMarkup(text)
      ? 'Maaf, informasi belum dapat diproses. Silakan coba lagi; belum ada perubahan reservasi yang dikonfirmasi melalui pesan ini.'
      : text.trim() || 'Maaf, saya belum dapat menjawab pertanyaan tersebut. Silakan coba lagi.';
  }

  private static readonly UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  private async resolveSession(tenantId: string, sessionIdHeader?: string): Promise<string> {
    if (sessionIdHeader) {
      if (!AiChatController.UUID_REGEX.test(sessionIdHeader)) {
        throw new BadRequestException('Format session ID tidak valid.');
      }
      const existing = await this.prisma.chatSession.findFirst({
        where: { id: sessionIdHeader, tenantId },
        select: { id: true },
      });
      if (!existing) throw new NotFoundException('Sesi chat tidak ditemukan.');
      return existing.id;
    }
    return this.getOrCreateSession(tenantId);
  }

  private async getOrCreateSession(tenantId: string): Promise<string> {
    const session = await this.prisma.chatSession.create({
      data: { tenantId },
      select: { id: true },
    });
    return session.id;
  }
}
