import Anthropic from '@anthropic-ai/sdk';
import type { Message } from '../core/types.js';
import type { ChatResponse, ModelProviderInterface, ToolDefinitionForProvider } from './base.js';
import { logger } from '../utils/logger.js';

export class AnthropicProvider implements ModelProviderInterface {
  readonly provider = 'anthropic';
  readonly model: string;
  private client: Anthropic;
  private temperature: number;
  private maxTokens: number;

  constructor(config: { model?: string; temperature?: number; maxTokens?: number; apiKey?: string }) {
    this.model = config.model ?? 'claude-sonnet-4-20250514';
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 4096;
    this.client = new Anthropic({ apiKey: config.apiKey ?? process.env.ANTHROPIC_API_KEY });
  }

  async chat(messages: Message[], tools?: ToolDefinitionForProvider[]): Promise<ChatResponse> {
    const systemMsg = messages.find((m) => m.role === 'system');
    const nonSystemMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => this.toAnthropicMessage(m));

    const params: Anthropic.MessageCreateParams = {
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      messages: nonSystemMessages,
    };

    if (systemMsg) {
      params.system = systemMsg.content;
    }

    if (tools && tools.length > 0) {
      params.tools = tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters as Anthropic.Tool.InputSchema,
      }));
    }

    logger.debug(`Anthropic request: ${this.model}, ${nonSystemMessages.length} messages, ${tools?.length ?? 0} tools`);

    const response = await this.client.messages.create(params);

    let content = '';
    const toolCalls: { id: string; name: string; arguments: Record<string, unknown> }[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        content += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input as Record<string, unknown>,
        });
      }
    }

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      finishReason: response.stop_reason === 'tool_use' ? 'tool_calls' : 'stop',
    };
  }

  private toAnthropicMessage(msg: Message): Anthropic.MessageParam {
    if (msg.role === 'tool') {
      return {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: msg.toolCallId ?? '',
            content: msg.content,
          },
        ],
      };
    }
    if (msg.role === 'assistant' && msg.toolCalls) {
      const content: Anthropic.ContentBlock[] = [];
      if (msg.content) {
        content.push({ type: 'text', text: msg.content });
      }
      for (const tc of msg.toolCalls) {
        content.push({
          type: 'tool_use',
          id: tc.id,
          name: tc.name,
          input: tc.arguments,
        } as Anthropic.ContentBlock);
      }
      return { role: 'assistant', content };
    }
    return {
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    };
  }
}
