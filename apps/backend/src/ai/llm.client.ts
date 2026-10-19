import { Injectable, Logger } from '@nestjs/common';

export interface ChatMessageDto {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
}

export interface ToolCallResult {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

@Injectable()
export class LlmClient {
  private readonly logger = new Logger(LlmClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly appUrl?: string;
  private readonly appName?: string;

  constructor() {
    this.baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.model = process.env.LLM_TOOL_MODEL || process.env.LLM_DEFAULT_MODEL || '';
    this.appUrl = process.env.OPENROUTER_APP_URL;
    this.appName = process.env.OPENROUTER_APP_NAME;
  }

  private getModel(): string {
    return process.env.LLM_TOOL_MODEL || process.env.LLM_DEFAULT_MODEL || this.model;
  }

  async chatCompletion(
    messages: ChatMessageDto[],
    tools?: any[],
    toolChoice: 'auto' | 'none' = 'auto',
  ): Promise<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: ToolCallResult[];
    };
  }> {
    const activeModel = this.getModel();
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY belum dikonfigurasi. Isi pada file .env lokal backend.');
    }
    if (!activeModel) {
      throw new Error('LLM_TOOL_MODEL atau LLM_DEFAULT_MODEL belum dikonfigurasi.');
    }

    const payload = {
      model: activeModel,
      messages,
      tools: tools?.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      })),
      tool_choice: tools && tools.length > 0 ? toolChoice : undefined,
      temperature: 0.2,
    };

    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          ...(this.appUrl ? { 'HTTP-Referer': this.appUrl } : {}),
          ...(this.appName ? { 'X-OpenRouter-Title': this.appName } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`OpenRouter error (${res.status}): ${errorText}`);
      }

      const data = await res.json();
      return data.choices[0];
    } catch (err: any) {
      this.logger.error(`Failed to invoke OpenRouter: ${err.message}`);
      throw err;
    }
  }
}
