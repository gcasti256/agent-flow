import { describe, it, expect, vi } from 'vitest';
import { Agent } from '../src/core/agent.js';
import { defineTool } from '../src/core/tool-builder.js';
import { z } from 'zod';
import type { ModelProviderInterface, ChatResponse } from '../src/providers/base.js';

// ─── Mock Provider ─────────────────────────────────────────────────────

function createMockProvider(responses: ChatResponse[]): ModelProviderInterface {
  let callIndex = 0;
  return {
    provider: 'mock',
    model: 'mock-model',
    chat: vi.fn(async () => {
      const response = responses[callIndex] ?? responses[responses.length - 1];
      callIndex++;
      return response;
    }),
  };
}

const noopProvider = createMockProvider([
  { content: '', finishReason: 'stop' },
]);

// ─── Mock Tools ────────────────────────────────────────────────────────

const echoTool = defineTool('echo')
  .describe('Echo back the input')
  .parameters(z.object({ message: z.string() }))
  .execute(async ({ message }) => `Echo: ${message}`);

const failingTool = defineTool('fail')
  .describe('Always fails')
  .parameters(z.object({ reason: z.string() }))
  .execute(async () => {
    throw new Error('Intentional failure');
  });

// ─── Tests ─────────────────────────────────────────────────────────────

describe('Agent', () => {
  it('should create an agent with config', () => {
    const agent = new Agent({
      name: 'test-agent',
      systemPrompt: 'You are a test agent.',
      provider: noopProvider,
    });
    expect(agent.name).toBe('test-agent');
    expect(agent.id).toBeTruthy();
  });

  it('should register tools', () => {
    const agent = new Agent({
      name: 'test-agent',
      systemPrompt: 'Test',
      tools: [echoTool],
      provider: noopProvider,
    });
    expect(agent.name).toBe('test-agent');
  });

  it('should throw on duplicate tool registration', () => {
    const agent = new Agent({
      name: 'test-agent',
      systemPrompt: 'Test',
      tools: [echoTool],
      provider: noopProvider,
    });
    expect(() => agent.registerTool(echoTool)).toThrow('already registered');
  });

  it('should complete a simple run without tool calls', async () => {
    const mockProvider = createMockProvider([
      {
        content: 'Hello! I can help you with that.',
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 8, totalTokens: 18 },
      },
    ]);

    const agent = new Agent({
      name: 'simple-agent',
      systemPrompt: 'You are helpful.',
      provider: mockProvider,
    });

    const result = await agent.run('Hi there');
    expect(result.status).toBe('success');
    expect(result.output).toBe('Hello! I can help you with that.');
    expect(result.iterations).toBe(1);
    expect(result.toolCalls).toHaveLength(0);
  });

  it('should execute tool calls in the think-act-observe loop', async () => {
    const mockProvider = createMockProvider([
      {
        content: 'Let me echo that for you.',
        toolCalls: [
          { id: 'tc_1', name: 'echo', arguments: { message: 'hello world' } },
        ],
        finishReason: 'tool_calls',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      },
      {
        content: 'The echo returned: "Echo: hello world"',
        finishReason: 'stop',
        usage: { promptTokens: 40, completionTokens: 10, totalTokens: 50 },
      },
    ]);

    const agent = new Agent({
      name: 'tool-agent',
      systemPrompt: 'You can use the echo tool.',
      tools: [echoTool],
      provider: mockProvider,
    });

    const result = await agent.run('Echo hello world');
    expect(result.status).toBe('success');
    expect(result.iterations).toBe(2);
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].name).toBe('echo');
    expect(result.toolCalls[0].result).toBe('Echo: hello world');
    expect(result.totalTokens).toBe(80);
  });

  it('should handle tool execution errors gracefully', async () => {
    const mockProvider = createMockProvider([
      {
        content: 'Attempting to call the failing tool.',
        toolCalls: [
          { id: 'tc_1', name: 'fail', arguments: { reason: 'test' } },
        ],
        finishReason: 'tool_calls',
        usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
      },
      {
        content: 'The tool failed with an error.',
        finishReason: 'stop',
        usage: { promptTokens: 30, completionTokens: 10, totalTokens: 40 },
      },
    ]);

    const agent = new Agent({
      name: 'error-agent',
      systemPrompt: 'Test',
      tools: [failingTool],
      provider: mockProvider,
    });

    const result = await agent.run('Trigger failure');
    expect(result.status).toBe('success');
    expect(result.toolCalls[0].error).toBe('Intentional failure');
  });

  it('should handle unknown tool calls', async () => {
    const mockProvider = createMockProvider([
      {
        content: '',
        toolCalls: [
          { id: 'tc_1', name: 'nonexistent', arguments: {} },
        ],
        finishReason: 'tool_calls',
        usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
      },
      {
        content: 'Tool not found.',
        finishReason: 'stop',
        usage: { promptTokens: 20, completionTokens: 5, totalTokens: 25 },
      },
    ]);

    const agent = new Agent({
      name: 'unknown-tool-agent',
      systemPrompt: 'Test',
      provider: mockProvider,
    });

    const result = await agent.run('Use a fake tool');
    expect(result.toolCalls[0].error).toContain('Unknown tool');
  });

  it('should stop at max iterations', async () => {
    const mockProvider = createMockProvider([
      {
        content: 'Still working...',
        toolCalls: [
          { id: 'tc_1', name: 'echo', arguments: { message: 'loop' } },
        ],
        finishReason: 'tool_calls',
        usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
      },
    ]);

    const agent = new Agent({
      name: 'loop-agent',
      systemPrompt: 'Test',
      tools: [echoTool],
      maxIterations: 3,
      provider: mockProvider,
    });

    const result = await agent.run('Loop forever');
    expect(result.status).toBe('max_iterations');
    expect(result.iterations).toBe(3);
  });

  it('should emit events during execution', async () => {
    const events: string[] = [];
    const mockProvider = createMockProvider([
      {
        content: 'Done.',
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      },
    ]);

    const agent = new Agent({
      name: 'event-agent',
      systemPrompt: 'Test',
      onEvent: (event) => events.push(event.type),
      provider: mockProvider,
    });

    await agent.run('Test events');
    expect(events).toContain('agent:start');
    expect(events).toContain('agent:thinking');
    expect(events).toContain('agent:complete');
  });

  it('should support abort via signal', async () => {
    const controller = new AbortController();
    controller.abort();

    const agent = new Agent({
      name: 'abort-agent',
      systemPrompt: 'Test',
      provider: createMockProvider([]),
    });

    const result = await agent.run('Test abort', { signal: controller.signal });
    expect(result.status).toBe('aborted');
  });
});
