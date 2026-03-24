// ─── agent-flow ───────────────────────────────────────────────────────
//
// A TypeScript framework for building agentic AI workflows.
// Supports tool calling, multi-step reasoning, persistent memory,
// and structured outputs with OpenAI and Anthropic providers.

// Core
export { Agent } from './core/agent.js';
export { defineTool } from './core/tool-builder.js';
export type {
  AgentConfig,
  AgentEvent,
  AgentEventType,
  AgentRunOptions,
  AgentRunResult,
  AgentStatus,
  ConversationMemory,
  MemoryStore,
  Message,
  MessageRole,
  ModelConfig,
  ModelProvider,
  StructuredOutputConfig,
  ToolCall,
  ToolContext,
  ToolDefinition,
  ToolResult,
  WorkingMemory,
} from './core/types.js';

// Tools
export { calculatorTool } from './tools/calculator.js';
export { webSearchTool } from './tools/web-search.js';
export { fileReadTool, fileWriteTool } from './tools/file-ops.js';
export { httpRequestTool } from './tools/http-request.js';

// Providers
export { createModelProvider, OpenAIProvider, AnthropicProvider } from './providers/index.js';
export type { ModelProviderInterface, ChatResponse } from './providers/base.js';

// Memory
export { InMemoryConversationMemory } from './memory/conversation.js';
export { createWorkingMemory } from './memory/working.js';
export { FileMemoryStore } from './memory/store.js';

// Utilities
export { withRetry } from './utils/retry.js';
export { RateLimiter } from './utils/rate-limiter.js';
export { zodToJsonSchema } from './schemas/converter.js';
