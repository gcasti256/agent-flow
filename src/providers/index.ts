import type { ModelConfig } from '../core/types.js';
import type { ModelProviderInterface } from './base.js';
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';

export type { ModelProviderInterface, ChatResponse, ToolDefinitionForProvider } from './base.js';
export { OpenAIProvider } from './openai.js';
export { AnthropicProvider } from './anthropic.js';

export function createModelProvider(config?: ModelConfig): ModelProviderInterface {
  const provider = config?.provider ?? (process.env.DEFAULT_PROVIDER as 'openai' | 'anthropic') ?? 'openai';
  const model = config?.model ?? process.env.DEFAULT_MODEL;

  switch (provider) {
    case 'anthropic':
      return new AnthropicProvider({
        model,
        temperature: config?.temperature,
        maxTokens: config?.maxTokens,
      });
    case 'openai':
    default:
      return new OpenAIProvider({
        model,
        temperature: config?.temperature,
        maxTokens: config?.maxTokens,
      });
  }
}
