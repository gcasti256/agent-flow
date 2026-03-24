# agent-flow

A TypeScript + Python framework for building agentic AI workflows with tool calling, multi-step reasoning, persistent memory, and structured outputs.

[![CI](https://github.com/gcasti256/agent-flow/actions/workflows/ci.yml/badge.svg)](https://github.com/gcasti256/agent-flow/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-green)](https://python.org)

## Overview

**agent-flow** is a production-ready framework for building AI agents that can reason, use tools, and produce structured outputs. It implements the **Think → Act → Observe** loop pattern used in state-of-the-art agentic systems.

### Key Features

- **Multi-step reasoning loop** — Agents iterate through think/act/observe cycles until they reach a conclusion or hit a configurable iteration limit
- **Type-safe tool system** — Define tools with Zod schemas for automatic parameter validation and JSON Schema generation
- **Dual provider support** — First-class support for both OpenAI and Anthropic models with a unified interface
- **Persistent memory** — Conversation history with token-aware windowing and file-system backed persistence
- **Working memory** — Ephemeral key-value store for sharing state between tools within a single execution
- **Structured outputs** — Validate agent responses against Zod schemas for guaranteed output shapes
- **Event system** — Subscribe to agent lifecycle events (thinking, tool calls, observations, completion)
- **Production patterns** — Rate limiting, retry with exponential backoff, abort signals, error recovery
- **Visual workflow builder** — React-based UI for composing and visualizing agent workflows
- **Python SDK** — Full Python implementation with the same patterns and tool system

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      Agent Runner                         │
│                                                          │
│  ┌─────────┐    ┌─────────┐    ┌──────────┐             │
│  │  Think   │───▶│   Act   │───▶│ Observe  │──┐          │
│  │ (LLM)   │    │ (Tools) │    │ (Results) │  │          │
│  └─────────┘    └─────────┘    └──────────┘  │          │
│       ▲                                       │          │
│       └───────────────────────────────────────┘          │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Memory      │  │   Provider   │  │   Events     │   │
│  │ conversation  │  │  openai /    │  │  lifecycle   │   │
│  │ working       │  │  anthropic   │  │  streaming   │   │
│  │ persistent    │  │              │  │              │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │                  Tool Registry                     │   │
│  │  calculator │ web_search │ file_ops │ http_request │   │
│  │                  + custom tools                    │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

## Quick Start

### Installation

```bash
npm install agent-flow
```

### Basic Usage

```typescript
import { Agent, calculatorTool, webSearchTool } from 'agent-flow';

const agent = new Agent({
  name: 'research-assistant',
  systemPrompt: 'You are a helpful research assistant.',
  tools: [calculatorTool, webSearchTool],
  model: { provider: 'openai', model: 'gpt-4o' },
});

const result = await agent.run('What is the square root of 144?');
console.log(result.output);
// → "The square root of 144 is 12."
console.log(result.iterations); // 2 (think + tool call + observe + think)
console.log(result.toolCalls);  // [{ name: 'calculator', result: { result: 12 } }]
```

### Custom Tools

```typescript
import { defineTool } from 'agent-flow';
import { z } from 'zod';

const weatherTool = defineTool('get_weather')
  .describe('Get current weather for a location')
  .parameters(z.object({
    city: z.string().describe('City name'),
    units: z.enum(['celsius', 'fahrenheit']).default('celsius'),
  }))
  .execute(async ({ city, units }) => {
    const response = await fetch(`https://api.weather.com/${city}`);
    return response.json();
  });

const agent = new Agent({
  name: 'weather-bot',
  systemPrompt: 'You help users check the weather.',
  tools: [weatherTool],
});
```

### Structured Output

```typescript
import { z } from 'zod';

const SentimentSchema = z.object({
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

const result = await agent.run('Analyze: "This product is amazing!"', {
  structuredOutput: SentimentSchema,
});

// result.output is typed and validated:
// { sentiment: 'positive', confidence: 0.95, reasoning: '...' }
```

### Persistent Memory

```typescript
import { Agent, FileMemoryStore } from 'agent-flow';

const agent = new Agent({
  name: 'assistant',
  systemPrompt: 'You are a helpful assistant with memory.',
  memoryStore: new FileMemoryStore('./data/conversations'),
});

// First conversation
await agent.run('My name is Alice', { conversationId: 'conv-1' });

// Later — agent remembers the conversation
await agent.run('What is my name?', { conversationId: 'conv-1' });
// → "Your name is Alice."
```

### Using Anthropic

```typescript
const agent = new Agent({
  name: 'claude-agent',
  systemPrompt: 'You are Claude, a helpful assistant.',
  model: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  tools: [calculatorTool],
});
```

### Event Handling

```typescript
const agent = new Agent({
  name: 'observable-agent',
  systemPrompt: 'You are helpful.',
  tools: [webSearchTool],
  onEvent: (event) => {
    switch (event.type) {
      case 'agent:thinking':
        console.log('🤔 Thinking...');
        break;
      case 'agent:tool_call':
        console.log('🔧 Calling tool:', event.data);
        break;
      case 'agent:complete':
        console.log('✅ Done!', event.data);
        break;
    }
  },
});
```

## Python SDK

```bash
cd python && pip install -e ".[dev]"
```

```python
import asyncio
from agent_flow import Agent, AgentConfig, tool

@tool(name="calculator", description="Do math")
def calculator(expression: str) -> dict:
    import ast, operator
    # Safe evaluation
    return {"result": eval(expression)}  # simplified for demo

agent = Agent(AgentConfig(
    name="assistant",
    system_prompt="You are helpful.",
    tools=[calculator],
))

result = asyncio.run(agent.run("What is 42 * 17?"))
print(result.output)
```

## Visual Workflow Builder

The included React UI provides a drag-and-drop interface for composing agent workflows:

```bash
cd src/ui && npm install && npm run dev
```

Features:
- Drag-and-drop workflow composition
- Real-time execution trace visualization
- Tool call inspection with timing
- Think → Act → Observe step highlighting

## API Reference

### `Agent`

| Method | Description |
|--------|-------------|
| `constructor(config: AgentConfig)` | Create a new agent |
| `run(input: string, options?: AgentRunOptions)` | Run the agent |
| `registerTool(tool: ToolDefinition)` | Register an additional tool |

### `AgentConfig`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `name` | `string` | required | Agent name |
| `systemPrompt` | `string` | required | System prompt |
| `model` | `ModelConfig` | OpenAI gpt-4o | Model configuration |
| `tools` | `ToolDefinition[]` | `[]` | Available tools |
| `maxIterations` | `number` | `10` | Max think/act/observe cycles |
| `memoryStore` | `MemoryStore` | none | Persistent memory backend |
| `onEvent` | `(event) => void` | none | Event handler |

### `AgentRunOptions`

| Property | Type | Description |
|----------|------|-------------|
| `conversationId` | `string` | Resume a conversation |
| `signal` | `AbortSignal` | Cancel execution |
| `structuredOutput` | `ZodType` | Validate output schema |

### `AgentRunResult`

| Property | Type | Description |
|----------|------|-------------|
| `output` | `string \| T` | Agent's final response |
| `messages` | `Message[]` | Full conversation history |
| `toolCalls` | `ToolResult[]` | All tool executions |
| `iterations` | `number` | Number of think/act cycles |
| `totalTokens` | `number` | Total tokens consumed |
| `durationMs` | `number` | Total execution time |
| `status` | `string` | `success`, `max_iterations`, `aborted`, `error` |

### Built-in Tools

| Tool | Description |
|------|-------------|
| `calculatorTool` | Safe arithmetic evaluation |
| `webSearchTool` | Web search (mock/configurable) |
| `fileReadTool` | Read files from filesystem |
| `fileWriteTool` | Write files to filesystem |
| `httpRequestTool` | Make HTTP requests |

## Project Structure

```
agent-flow/
├── src/
│   ├── core/           # Agent class, types, tool builder
│   ├── providers/      # OpenAI + Anthropic adapters
│   ├── tools/          # Built-in tool implementations
│   ├── memory/         # Conversation + working memory
│   ├── schemas/        # Zod → JSON Schema converter
│   ├── utils/          # Logger, retry, rate limiter
│   ├── ui/             # React visual workflow builder
│   └── index.ts        # Package entry point
├── python/
│   ├── agent_flow/     # Python SDK
│   └── tests/          # Python tests
├── examples/           # Example agents
├── tests/              # TypeScript tests
├── docker/             # Docker configuration
└── .github/workflows/  # CI/CD
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type check
npm run typecheck

# Build
npm run build

# Run visual UI
cd src/ui && npm install && npm run dev
```

## Tech Stack

- **TypeScript** — Strict mode, modern ESM
- **Zod** — Runtime type validation + JSON Schema generation
- **OpenAI SDK** — GPT-4o, GPT-4 Turbo integration
- **Anthropic SDK** — Claude 3.5 Sonnet, Claude 3 Opus integration
- **React 19** — Visual workflow builder UI
- **Tailwind CSS v4** — Utility-first styling
- **Vitest** — Fast unit testing
- **tsup** — Zero-config TypeScript bundling
- **Docker** — Containerized deployment
- **GitHub Actions** — CI/CD pipeline

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure:
- All tests pass (`npm test`)
- Code is type-safe (`npm run typecheck`)
- Code follows the existing style (`npm run lint`)

## License

MIT License — see [LICENSE](LICENSE) for details.
