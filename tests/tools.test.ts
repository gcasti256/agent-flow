import { describe, it, expect } from 'vitest';
import { calculatorTool } from '../src/tools/calculator.js';
import { webSearchTool } from '../src/tools/web-search.js';
import { defineTool } from '../src/core/tool-builder.js';
import { z } from 'zod';
import type { ToolContext, WorkingMemory } from '../src/core/types.js';

const mockContext: ToolContext = {
  agentId: 'test',
  conversationId: 'test',
  workingMemory: {
    get: () => undefined,
    set: () => {},
    delete: () => false,
    entries: function* () {},
    clear: () => {},
    toJSON: () => ({}),
  } as WorkingMemory,
  emit: () => {},
};

describe('Calculator Tool', () => {
  it('should evaluate basic arithmetic', async () => {
    const result = await calculatorTool.execute({ expression: '2 + 3' }, mockContext);
    expect(result).toEqual({ expression: '2 + 3', result: 5 });
  });

  it('should handle multiplication and division', async () => {
    const result = await calculatorTool.execute({ expression: '10 * 5 / 2' }, mockContext);
    expect(result).toEqual({ expression: '10 * 5 / 2', result: 25 });
  });

  it('should handle parentheses', async () => {
    const result = await calculatorTool.execute({ expression: '(3 + 4) * 2' }, mockContext);
    expect(result).toEqual({ expression: '(3 + 4) * 2', result: 14 });
  });

  it('should handle exponents', async () => {
    const result = await calculatorTool.execute({ expression: '2 ^ 10' }, mockContext);
    expect(result).toEqual({ expression: '2 ^ 10', result: 1024 });
  });

  it('should handle negative numbers', async () => {
    const result = await calculatorTool.execute({ expression: '-5 + 3' }, mockContext);
    expect(result).toEqual({ expression: '-5 + 3', result: -2 });
  });

  it('should throw on division by zero', async () => {
    await expect(
      calculatorTool.execute({ expression: '5 / 0' }, mockContext),
    ).rejects.toThrow('Division by zero');
  });

  it('should handle complex expressions', async () => {
    const result = await calculatorTool.execute(
      { expression: '(2 + 3) * (4 - 1) + 10 / 2' },
      mockContext,
    );
    expect(result).toEqual({ expression: '(2 + 3) * (4 - 1) + 10 / 2', result: 20 });
  });
});

describe('Web Search Tool', () => {
  it('should return mock results', async () => {
    const result = await webSearchTool.execute(
      { query: 'typescript agent frameworks', maxResults: 3 },
      mockContext,
    );
    expect(result.query).toBe('typescript agent frameworks');
    expect(result.totalResults).toBe(3);
    expect(result.results).toHaveLength(3);
    expect(result.results[0].title).toContain('Typescript Agent Frameworks');
  });

  it('should respect maxResults', async () => {
    const result = await webSearchTool.execute(
      { query: 'test', maxResults: 2 },
      mockContext,
    );
    expect(result.results).toHaveLength(2);
  });
});

describe('defineTool', () => {
  it('should create a valid tool definition', () => {
    const tool = defineTool('test')
      .describe('A test tool')
      .parameters(z.object({ input: z.string() }))
      .execute(async ({ input }) => input.toUpperCase());

    expect(tool.name).toBe('test');
    expect(tool.description).toBe('A test tool');
  });

  it('should throw if parameters not defined before execute', () => {
    expect(() => {
      defineTool('bad')
        .describe('Bad tool')
        .execute(async () => 'nope');
    }).toThrow('must define parameters');
  });
});
