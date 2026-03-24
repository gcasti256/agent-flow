import { z, ZodType } from 'zod';
import type { ModelProviderInterface } from '../providers/base.js';

// ─── Model Provider Types ─────────────────────────────────────────────

export type ModelProvider = 'openai' | 'anthropic';

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  provider: 'openai',
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 4096,
};

// ─── Message Types ────────────────────────────────────────────────────

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface Message {
  role: MessageRole;
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

// ─── Tool Types ───────────────────────────────────────────────────────

export interface ToolDefinition<TParams extends ZodType = ZodType, TResult = unknown> {
  name: string;
  description: string;
  parameters: TParams;
  execute: (params: z.infer<TParams>, context: ToolContext) => Promise<TResult>;
}

export interface ToolContext {
  agentId: string;
  conversationId: string;
  workingMemory: WorkingMemory;
  emit: (event: AgentEvent) => void;
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  result: unknown;
  error?: string;
  durationMs: number;
}

// ─── Memory Types ─────────────────────────────────────────────────────

export interface WorkingMemory {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  delete(key: string): boolean;
  entries(): IterableIterator<[string, unknown]>;
  clear(): void;
  toJSON(): Record<string, unknown>;
}

export interface ConversationMemory {
  messages: Message[];
  add(message: Message): void;
  getRecent(n: number): Message[];
  getAll(): Message[];
  clear(): void;
  summarize(): Promise<string>;
  tokenCount(): number;
}

export interface MemoryStore {
  save(conversationId: string, memory: ConversationMemory): Promise<void>;
  load(conversationId: string): Promise<Message[] | null>;
  list(): Promise<string[]>;
  delete(conversationId: string): Promise<boolean>;
}

// ─── Agent Types ──────────────────────────────────────────────────────

export type AgentStatus = 'idle' | 'thinking' | 'acting' | 'observing' | 'complete' | 'error';

export interface AgentConfig {
  name: string;
  description?: string;
  systemPrompt: string;
  model?: ModelConfig;
  /** Inject a custom model provider (useful for testing). Overrides `model`. */
  provider?: ModelProviderInterface;
  tools?: ToolDefinition[];
  maxIterations?: number;
  memoryStore?: MemoryStore;
  onEvent?: (event: AgentEvent) => void;
}

export interface AgentRunOptions {
  conversationId?: string;
  signal?: AbortSignal;
  structuredOutput?: ZodType;
  metadata?: Record<string, unknown>;
}

export interface AgentRunResult<T = string> {
  output: T;
  messages: Message[];
  toolCalls: ToolResult[];
  iterations: number;
  totalTokens: number;
  durationMs: number;
  status: 'success' | 'max_iterations' | 'aborted' | 'error';
  error?: string;
}

// ─── Event Types ──────────────────────────────────────────────────────

export type AgentEventType =
  | 'agent:start'
  | 'agent:thinking'
  | 'agent:tool_call'
  | 'agent:tool_result'
  | 'agent:observation'
  | 'agent:iteration'
  | 'agent:complete'
  | 'agent:error'
  | 'memory:updated';

export interface AgentEvent {
  type: AgentEventType;
  agentId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

// ─── Structured Output ───────────────────────────────────────────────

export interface StructuredOutputConfig<T extends ZodType> {
  schema: T;
  instructions?: string;
}
