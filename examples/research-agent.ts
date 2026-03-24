/**
 * Research Agent Example
 *
 * Demonstrates an agent that can search the web and synthesize
 * information into a structured research report.
 */
import { Agent, defineTool, webSearchTool, calculatorTool } from '../src/index.js';
import { z } from 'zod';

// Define the structured output schema for research reports
const ResearchReportSchema = z.object({
  topic: z.string(),
  summary: z.string(),
  keyFindings: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      source: z.string().optional(),
    }),
  ),
  confidence: z.enum(['high', 'medium', 'low']),
});

async function main() {
  const agent = new Agent({
    name: 'research-agent',
    description: 'An agent that researches topics and produces structured reports',
    systemPrompt: `You are a thorough research assistant. When given a topic:
1. Search for relevant information using the web_search tool
2. Analyze and cross-reference the results
3. Use the calculator if any numerical analysis is needed
4. Produce a comprehensive research report

Always cite your sources and rate your confidence level.`,
    tools: [webSearchTool, calculatorTool],
    maxIterations: 5,
    onEvent: (event) => {
      const icons: Record<string, string> = {
        'agent:start': '🚀',
        'agent:thinking': '🤔',
        'agent:tool_call': '🔧',
        'agent:observation': '👁️',
        'agent:complete': '✅',
      };
      const icon = icons[event.type] ?? '📌';
      console.log(`${icon} [${event.type}]`, JSON.stringify(event.data, null, 2));
    },
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Research Agent - agent-flow example');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const result = await agent.run(
    'Research the current state of agentic AI frameworks. What are the leading tools and approaches?',
    {
      structuredOutput: ResearchReportSchema,
    },
  );

  console.log('\n━━━ Result ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Status:', result.status);
  console.log('Iterations:', result.iterations);
  console.log('Tool calls:', result.toolCalls.length);
  console.log('Duration:', `${result.durationMs}ms`);
  console.log('Output:', JSON.stringify(result.output, null, 2));
}

main().catch(console.error);
