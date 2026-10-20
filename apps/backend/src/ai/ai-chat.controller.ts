import { Body, Controller, Headers, Param, Post } from '@nestjs/common';
import { LlmClient } from './llm.client';
import { AiToolsService } from './ai-tools.service';
import { RESTAURANT_TOOLS } from './tools.definition';
import { withOutletScope } from './prompts';
import { PrismaService } from '../prisma/prisma.service';

export interface ChatMessageRequest {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

@Controller('ai/chat')
export class AiChatController {
  constructor(
    private readonly llmClient: LlmClient,
    private readonly aiToolsService: AiToolsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post(':tenantId')
  async chat(
    @Param('tenantId') tenantId: string,
    @Body() body: ChatMessageRequest,
    @Headers('x-session-id') sessionIdHeader?: string,
  ) {
    const sessionId = sessionIdHeader || (await this.getOrCreateSession(tenantId));
    // shortcut: the earliest active outlet is the chat scope; add an explicit outlet selector when multi-outlet chat is needed.
    const outlet = await this.prisma.outlet.findFirst({
      where: { tenantId, isActive: true },
      select: { name: true, slug: true },
      orderBy: { createdAt: 'asc' },
    });

    // Construct prompt history
    const conversation: any[] = [
      { role: 'system', content: withOutletScope(outlet || undefined) },
      ...(body.history || []).map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: body.message },
    ];

    // First LLM turn
    const firstResponse = await this.llmClient.chatCompletion(conversation, RESTAURANT_TOOLS);
    const message = firstResponse.message;

    // Handle tool call chaining
    if (message.tool_calls && message.tool_calls.length > 0) {
      conversation.push(message);
      const toolResults: Array<{ name: string; result: unknown }> = [];

      for (const call of message.tool_calls) {
        let parsedArgs: Record<string, any> = {};
        try {
          parsedArgs = JSON.parse(call.function.arguments);
        } catch {
          parsedArgs = {};
        }

        if (outlet && ['check_availability', 'create_reservation'].includes(call.function.name)) {
          parsedArgs.outletSlug ||= outlet.slug;
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

      // Second turn with tool result to generate natural response
      const secondResponse = await this.llmClient.chatCompletion(conversation, RESTAURANT_TOOLS, 'none');
      const reply = secondResponse.message.content?.trim();
      return {
        sessionId,
        reply: reply && !reply.includes('<tool_call>')
          ? reply
          : this.fallbackFromTools(toolResults),
      };
    }

    return {
      sessionId,
      reply: message.content || 'Ada yang bisa kami bantu seputar menu dan reservasi Padang Sederhana?',
    };
  }

  private async getOrCreateSession(tenantId: string): Promise<string> {
    const session = await this.prisma.chatSession.create({
      data: { tenantId },
      select: { id: true },
    });
    return session.id;
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
