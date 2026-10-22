import { LlmClient } from './llm.client';
import { AiToolsService } from './ai-tools.service';
import { RESTAURANT_TOOLS } from './tools.definition';
import { withOutletScope } from './prompts';
import { PrismaService } from '../prisma/prisma.service';


const ChatRateLimit = createRateLimitInterceptor({
  windowMs: 60_000,
  maxRequests: 20,
  keyPrefix: 'ai-chat',
  message: 'Batas pesan chat tercapai (maksimal 20 pesan/menit). Silakan tunggu sebentar.',
});

type PendingMutation = { toolName: string; args: Record<string, any> };
const MUTATION_TOOLS = new Set(['create_reservation', 'update_reservation', 'cancel_reservation']);

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
    @Req() request?: { ip?: string },
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

        let parsedArgs: Record<string, any> = {};
        try {
          parsedArgs = typeof call.function.arguments === 'string'
            ? JSON.parse(call.function.arguments)
            : (call.function.arguments || {});
        } catch {
          toolResults.push({
            name: call.function.name,
            result: { error: 'Argumen tool dari AI tidak valid.' },
          });
          continue;
        }

        if (outlet && ['check_availability', 'create_reservation'].includes(call.function.name)) {
          parsedArgs.outletSlug ||= outlet.slug;
        }

        if (MUTATION_TOOLS.has(call.function.name)) {
          if (this.isExplicitConfirmation(body.message)) {
            const result = await this.aiToolsService.executeTool(
              tenantId,
              call.function.name,
              parsedArgs,
              sessionId,
            );
            return { sessionId, reply: this.fallbackFromTools([{ name: call.function.name, result }]) };
          }
          await this.prisma.chatSession.update({
            where: { id: sessionId },
            data: {
              pendingMutation: { toolName: call.function.name, args: parsedArgs },
              pendingMutationExpiresAt: new Date(Date.now() + 15 * 60_000),
            },
          });
          return {
            sessionId,
            reply: this.pendingMutationReply(call.function.name, parsedArgs),
          };
        }

        const toolResult = await this.aiToolsService.executeTool(
          tenantId,
          call.function.name,
          parsedArgs,
          sessionId,
        );
        toolResults.push({ name: call.function.name, result: toolResult });

        conversation.push({
          role: 'tool',
          name: call.function.name,
          tool_call_id: call.id,
          content: JSON.stringify(toolResult),
        });
      }


      };
    }

    return {
      sessionId,
      reply: this.stripXmlToolCalls(message.content || 'Ada yang bisa kami bantu seputar menu dan reservasi Padang Sederhana?'),
    };
  }


    const session = await this.prisma.chatSession.create({
      data: { tenantId },
      select: { id: true, pendingMutation: true, pendingMutationExpiresAt: true },
    });
    return session;
  }

  private clearPendingMutation(sessionId: string) {
    return this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { pendingMutation: Prisma.JsonNull, pendingMutationExpiresAt: null },
    });
  }

  private isExplicitConfirmation(message: string) {
    return /^(ya|iya|benar|lanjutkan|oke|ok|setuju)\b/i.test(message.trim());
  }

  private pendingMutationReply(toolName: string, args: Record<string, any>) {
    if (toolName === 'create_reservation') {
      return `Ringkasan: ${args.outletSlug} • ${args.date}, ${args.time} WIB • ${args.partySize} tamu • ${args.customerName} (${maskPhone(args.customerPhone)}). Balas “ya” untuk pesan.`;
    }
    if (toolName === 'update_reservation') {
      const changes = [args.date, args.time && `${args.time} WIB`, args.partySize && `${args.partySize} tamu`]
        .filter(Boolean)
        .join(' • ');
      return `Ubah ${args.code}${changes ? ` menjadi ${changes}` : ''}. Balas “ya” untuk simpan.`;
    }
    return `Batalkan reservasi ${args.code}. Balas “ya” untuk konfirmasi.`;
  }

  private fallbackFromTools(toolResults: Array<{ name: string; result: unknown }>) {
    const menuResult = toolResults.find((tool) => tool.name === 'search_menu')?.result;
    if (Array.isArray(menuResult)) {
      if (menuResult.length === 0) {
        return 'Maaf, menu yang dicari belum tersedia. Uni/Uda boleh sebutkan lauk atau rasa yang diinginkan.';
      }

      const items = menuResult.slice(0, 5).map((item: any) =>
        `- ${item.nama} — Rp${Number(item.harga).toLocaleString('id-ID')}`,
      );
      return `Berikut rekomendasi menu yang tersedia:\n${items.join('\n')}\n\nMau yang pedas, gurih, atau yang paling favorit?`;
    }

    const resultWithMessage = toolResults
      .map((tool) => tool.result as { message?: string })
      .find((result) => result?.message);
    return resultWithMessage?.message || 'Data sudah kami cek. Ada lagi yang ingin Uni/Uda tanyakan?';
  }
}
