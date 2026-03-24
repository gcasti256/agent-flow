// ─── Core ─────────────────────────────────────────────────────────────
//
// Agent class, types, and tool builder.

export { Agent } from './agent.js';
export { defineTool } from './tool-builder.js';
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
} from './types.js';
