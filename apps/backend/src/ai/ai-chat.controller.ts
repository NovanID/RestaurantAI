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

    // Construct prompt history
    const conversation: any[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(body.history || []).map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: body.message },
    ];

    // First LLM turn
    const firstResponse = await this.llmClient.chatCompletion(conversation, RESTAURANT_TOOLS);
    let message = firstResponse.message;
    if (this.hasToolMarkup(message.content)) {
      const retry = await this.llmClient.chatCompletion([
        ...conversation,
        { role: 'system', content: 'Gunakan tool_calls terstruktur untuk mengambil data. Jangan menulis XML atau perintah tool sebagai teks jawaban.' },
      ], RESTAURANT_TOOLS);
      message = retry.message;
    }

    // Handle tool call chaining
    const rawToolCalls = message.tool_calls || [];

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

      // Clean up if model still outputs raw tool tags
      if (finalReply && (finalReply.startsWith('<tool_call>') || finalReply.startsWith('<dots_function_call>'))) {
        const thirdResponse = await this.llmClient.chatCompletion([
          ...conversation,
          {
            role: 'system',
            content: 'Format jawaban di atas menjadi rekomendasi ramah dalam Bahasa Indonesia untuk pelanggan. Jangan memanggil tool lagi dan jangan sertakan tag XML apa pun.',
          },
        ]);
        finalReply = thirdResponse.message.content?.trim();
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

  private hasToolMarkup(text: string | null | undefined): boolean {
    return /<\/?(?:dots_function_call|tool_call|invoke|parameter)\b/i.test(text || '');
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
