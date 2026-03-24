import type { Message, ToolCall } from '../core/types.js';

export interface ChatResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'tool_calls' | 'max_tokens' | 'error';
}

export interface ToolDefinitionForProvider {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ModelProviderInterface {
  readonly provider: string;
  readonly model: string;
  chat(messages: Message[], tools?: ToolDefinitionForProvider[]): Promise<ChatResponse>;
}
