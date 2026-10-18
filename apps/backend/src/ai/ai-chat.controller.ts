import { Body, Controller, Headers, Param, Post } from '@nestjs/common';
import { LlmClient } from './llm.client';
import { AiToolsService } from './ai-tools.service';
import { RESTAURANT_TOOLS } from './tools.definition';
import { SYSTEM_PROMPT } from './prompts';
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

      for (const call of message.tool_calls) {
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

      // Second turn with tool result to generate natural response
      const secondResponse = await this.llmClient.chatCompletion(conversation, RESTAURANT_TOOLS);
      return {
        sessionId,
        reply: secondResponse.message.content || 'Terima kasih, ada hal lain yang bisa kami bantu?',
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
}
