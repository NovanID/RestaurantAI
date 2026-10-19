import { BadRequestException, Body, Controller, Headers, NotFoundException, Param, Post, UseInterceptors } from '@nestjs/common';
import { LlmClient } from './llm.client';
import { AiToolsService } from './ai-tools.service';
import { RESTAURANT_TOOLS } from './tools.definition';
import { SYSTEM_PROMPT } from './prompts';
import { PrismaService } from '../prisma/prisma.service';
import { createRateLimitInterceptor } from '../common/rate-limit.service';

export interface ChatMessageRequest {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

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
    @Body() body: ChatMessageRequest,
    @Headers('x-session-id') sessionIdHeader?: string,
  ) {
    if (!body?.message || typeof body.message !== 'string') {
      throw new BadRequestException('Pesan chat wajib diisi.');
    }

    if (body.message.length > 1000) {
      throw new BadRequestException('Pesan terlalu panjang (maksimal 1000 karakter).');
    }

    const sessionId = await this.resolveSession(tenantId, sessionIdHeader);

    // Construct prompt history
    const conversation: any[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(body.history || []).map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: body.message },
    ];

    // First LLM turn
    const firstResponse = await this.llmClient.chatCompletion(conversation, RESTAURANT_TOOLS);
    const message = firstResponse.message;

    // Handle tool call chaining
    if (message.tool_calls && message.tool_calls.length > 0) {
      conversation.push(message);

      const maxToolCalls = 5;
      const toolCallsToExecute = message.tool_calls.slice(0, maxToolCalls);

      for (const call of toolCallsToExecute) {
        let parsedArgs: Record<string, any> = {};
        try {
          parsedArgs = JSON.parse(call.function.arguments);
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
      if (finalReply && finalReply.startsWith('<tool_call>')) {
        const thirdResponse = await this.llmClient.chatCompletion([
          ...conversation,
          {
            role: 'system',
            content: 'Format jawaban di atas menjadi rekomendasi ramah dalam Bahasa Indonesia untuk pelanggan. Jangan memanggil tool lagi.',
          },
        ]);
        finalReply = thirdResponse.message.content?.trim();
      }

      return {
        sessionId,
        reply: finalReply || 'Berikut adalah informasi menu dan reservasi kami. Apakah ada hal lain yang ingin Anda tanyakan?',
      };
    }

    return {
      sessionId,
      reply: message.content || 'Ada yang bisa kami bantu seputar menu dan reservasi Padang Sederhana?',
    };
  }

  private async resolveSession(tenantId: string, sessionIdHeader?: string): Promise<string> {
    if (sessionIdHeader) {
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
