import { v4 as uuid } from 'uuid';
import type {
  AgentConfig,
  AgentEvent,
  AgentRunOptions,
  AgentRunResult,
  ToolCall,
  ToolDefinition,
  ToolResult,
  ToolContext,
} from './types.js';
import { createModelProvider, type ModelProviderInterface } from '../providers/index.js';
import { InMemoryConversationMemory } from '../memory/conversation.js';
import { createWorkingMemory } from '../memory/working.js';
import { zodToJsonSchema } from '../schemas/converter.js';
import { logger } from '../utils/logger.js';

const DEFAULT_MAX_ITERATIONS = 10;

export class Agent {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  private systemPrompt: string;
  private tools: Map<string, ToolDefinition>;
  private provider: ModelProviderInterface;
  private maxIterations: number;
  private config: AgentConfig;
  private eventHandler?: (event: AgentEvent) => void;

  constructor(config: AgentConfig) {
    this.id = uuid();
    this.name = config.name;
    this.description = config.description ?? '';
    this.systemPrompt = config.systemPrompt;
    this.tools = new Map();
    this.maxIterations = config.maxIterations ?? DEFAULT_MAX_ITERATIONS;
    this.config = config;
    this.eventHandler = config.onEvent;

    this.provider = config.provider
      ? (config.provider as ModelProviderInterface)
      : createModelProvider(config.model);

    if (config.tools) {
      for (const tool of config.tools) {
        this.registerTool(tool);
      }
    }
  }

  /** Register a tool the agent can use */
  registerTool(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool);
    logger.debug(`Registered tool: ${tool.name}`);
  }

  /** Run the agent with a user message */
  async run(input: string, options: AgentRunOptions = {}): Promise<AgentRunResult> {
    const conversationId = options.conversationId ?? uuid();
    const startTime = Date.now();
    const allToolResults: ToolResult[] = [];
    let totalTokens = 0;
    let iterations = 0;

    const memory = new InMemoryConversationMemory();
    const workingMemory = createWorkingMemory();

    // Load persisted history if available
    if (this.config.memoryStore) {
      const saved = await this.config.memoryStore.load(conversationId);
      if (saved) {
        for (const msg of saved) memory.add(msg);
      }
    }

    // Build system message with tool descriptions and structured output instructions
    let systemContent = this.systemPrompt;
    if (this.tools.size > 0) {
      systemContent += '\n\n## Available Tools\n';
      systemContent += 'You can call tools to help accomplish tasks. ';
      systemContent += 'When you need to use a tool, respond with a tool call.\n\n';
      for (const tool of this.tools.values()) {
        const schema = zodToJsonSchema(tool.parameters);
        systemContent += `### ${tool.name}\n${tool.description}\nParameters: ${JSON.stringify(schema, null, 2)}\n\n`;
      }
    }
    if (options.structuredOutput) {
      const outputSchema = zodToJsonSchema(options.structuredOutput);
      systemContent += '\n\n## Output Format\n';
      systemContent += 'You MUST respond with valid JSON matching this schema:\n';
      systemContent += '```json\n' + JSON.stringify(outputSchema, null, 2) + '\n```\n';
    }

    memory.add({ role: 'system', content: systemContent });
    memory.add({ role: 'user', content: input });

    this.emit({
      type: 'agent:start',
      agentId: this.id,
      timestamp: Date.now(),
      data: { input, conversationId },
    });

    // ─── Think → Act → Observe Loop ──────────────────────────────

    while (iterations < this.maxIterations) {
      if (options.signal?.aborted) {
        return this.buildResult('aborted', memory, allToolResults, iterations, totalTokens, startTime);
      }

      iterations++;
      this.emit({
        type: 'agent:thinking',
        agentId: this.id,
        timestamp: Date.now(),
        data: { iteration: iterations },
      });

      // Think: get model response
      const toolDefs = this.getToolDefinitions();
      const response = await this.provider.chat(memory.getAll(), toolDefs);
      totalTokens += response.usage?.totalTokens ?? 0;

      // If the model produced text content, add it
      if (response.content) {
        memory.add({ role: 'assistant', content: response.content, toolCalls: response.toolCalls });
      }

      // If no tool calls, the agent is done
      if (!response.toolCalls || response.toolCalls.length === 0) {
        break;
      }

      // Act: execute tool calls
      this.emit({
        type: 'agent:tool_call',
        agentId: this.id,
        timestamp: Date.now(),
        data: { toolCalls: response.toolCalls },
      });

      const results = await this.executeToolCalls(response.toolCalls, {
        agentId: this.id,
        conversationId,
        workingMemory,
        emit: (event) => this.emit(event),
      });

      allToolResults.push(...results);

      // Observe: add tool results to conversation
      for (const result of results) {
        const content = result.error
          ? `Error: ${result.error}`
          : typeof result.result === 'string'
            ? result.result
            : JSON.stringify(result.result, null, 2);

        memory.add({
          role: 'tool',
          content,
          toolCallId: result.toolCallId,
          name: result.name,
        });
      }

      this.emit({
        type: 'agent:observation',
        agentId: this.id,
        timestamp: Date.now(),
        data: { results: results.map((r) => ({ name: r.name, hasError: !!r.error })) },
      });

      this.emit({
        type: 'agent:iteration',
        agentId: this.id,
        timestamp: Date.now(),
        data: { iteration: iterations, toolCallCount: results.length },
      });
    }

    // Persist conversation
    if (this.config.memoryStore) {
      await this.config.memoryStore.save(conversationId, memory);
    }

    const status = iterations >= this.maxIterations ? 'max_iterations' : 'success';
    const result = this.buildResult(status, memory, allToolResults, iterations, totalTokens, startTime);

    // Validate structured output if requested
    if (options.structuredOutput && status === 'success') {
      try {
        const parsed = JSON.parse(result.output as string);
        const validated = options.structuredOutput.parse(parsed);
        return { ...result, output: validated };
      } catch (err) {
        return {
          ...result,
          status: 'error',
          error: `Structured output validation failed: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }

    this.emit({
      type: 'agent:complete',
      agentId: this.id,
      timestamp: Date.now(),
      data: { status: result.status, iterations, totalTokens },
    });

    return result;
  }

  private getToolDefinitions() {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: zodToJsonSchema(tool.parameters),
    }));
  }

  private async executeToolCalls(toolCalls: ToolCall[], context: ToolContext): Promise<ToolResult[]> {
    return Promise.all(
      toolCalls.map(async (call) => {
        const start = Date.now();
        const tool = this.tools.get(call.name);

        if (!tool) {
          return {
            toolCallId: call.id,
            name: call.name,
            result: null,
            error: `Unknown tool: ${call.name}`,
            durationMs: Date.now() - start,
          };
        }

        try {
          // Validate parameters
          const params = tool.parameters.parse(call.arguments);
          const result = await tool.execute(params, context);
          return {
            toolCallId: call.id,
            name: call.name,
            result,
            durationMs: Date.now() - start,
          };
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          logger.error(`Tool ${call.name} failed: ${error}`);
          return {
            toolCallId: call.id,
            name: call.name,
            result: null,
            error,
            durationMs: Date.now() - start,
          };
        }
      }),
    );
  }

  private buildResult(
    status: AgentRunResult['status'],
    memory: InMemoryConversationMemory,
    toolResults: ToolResult[],
    iterations: number,
    totalTokens: number,
    startTime: number,
  ): AgentRunResult {
    const messages = memory.getAll();
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    return {
      output: lastAssistant?.content ?? '',
      messages,
      toolCalls: toolResults,
      iterations,
      totalTokens,
      durationMs: Date.now() - startTime,
      status,
    };
  }

  private emit(event: AgentEvent): void {
    this.eventHandler?.(event);
  }
}
