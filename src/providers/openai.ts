import OpenAI from 'openai';
import type { Message } from '../core/types.js';
import type { ChatResponse, ModelProviderInterface, ToolDefinitionForProvider } from './base.js';
import { logger } from '../utils/logger.js';

export class OpenAIProvider implements ModelProviderInterface {
  readonly provider = 'openai';
  readonly model: string;
  private client: OpenAI;
  private temperature: number;
  private maxTokens: number;

  constructor(config: { model?: string; temperature?: number; maxTokens?: number; apiKey?: string }) {
    this.model = config.model ?? 'gpt-4o';
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 4096;
    this.client = new OpenAI({ apiKey: config.apiKey ?? process.env.OPENAI_API_KEY });
  }

  async chat(messages: Message[], tools?: ToolDefinitionForProvider[]): Promise<ChatResponse> {
    const openaiMessages = messages.map((m) => this.toOpenAIMessage(m));

    const params: OpenAI.Chat.ChatCompletionCreateParams = {
      model: this.model,
      messages: openaiMessages,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
    };

    if (tools && tools.length > 0) {
      params.tools = tools.map((t) => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters as Record<string, unknown>,
        },
      }));
    }

    logger.debug(`OpenAI request: ${this.model}, ${messages.length} messages, ${tools?.length ?? 0} tools`);

    const response = await this.client.chat.completions.create(params);
    const choice = response.choices[0];

    const toolCalls = choice?.message.tool_calls?.map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments),
    }));

    return {
      content: choice?.message.content ?? '',
      toolCalls,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
      finishReason: choice?.finish_reason === 'tool_calls' ? 'tool_calls' : 'stop',
    };
  }

  private toOpenAIMessage(
    msg: Message,
  ): OpenAI.Chat.ChatCompletionMessageParam {
    if (msg.role === 'tool') {
      return {
        role: 'tool',
        content: msg.content,
        tool_call_id: msg.toolCallId ?? '',
      };
    }
    if (msg.role === 'assistant' && msg.toolCalls) {
      return {
        role: 'assistant',
        content: msg.content || null,
        tool_calls: msg.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        })),
      };
    }
    return {
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content,
    };
  }
}
