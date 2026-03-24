/**
 * Code Review Agent Example
 *
 * Demonstrates an agent that reads source files, analyzes code quality,
 * and produces structured review feedback.
 */
import { Agent, fileReadTool, defineTool } from '../src/index.js';
import { z } from 'zod';

// Custom tool: analyze code complexity
const analyzeComplexityTool = defineTool('analyze_complexity')
  .describe('Analyze the cyclomatic complexity of code based on control flow keywords')
  .parameters(
    z.object({
      code: z.string().describe('Source code to analyze'),
      language: z.enum(['typescript', 'javascript', 'python']).describe('Programming language'),
    }),
  )
  .execute(async ({ code, language }) => {
    // Count control flow constructs as a proxy for complexity
    const patterns: Record<string, RegExp[]> = {
      typescript: [/\bif\b/g, /\belse\b/g, /\bfor\b/g, /\bwhile\b/g, /\bswitch\b/g, /\bcatch\b/g, /\?\?/g, /\?\./g, /&&/g, /\|\|/g],
      javascript: [/\bif\b/g, /\belse\b/g, /\bfor\b/g, /\bwhile\b/g, /\bswitch\b/g, /\bcatch\b/g, /\?\?/g, /&&/g, /\|\|/g],
      python: [/\bif\b/g, /\belif\b/g, /\bfor\b/g, /\bwhile\b/g, /\bexcept\b/g, /\band\b/g, /\bor\b/g],
    };

    const langPatterns = patterns[language] ?? patterns.typescript;
    let complexity = 1; // Base complexity

    for (const pattern of langPatterns) {
      const matches = code.match(pattern);
      if (matches) complexity += matches.length;
    }

    const lines = code.split('\n').length;
    const rating =
      complexity <= 5 ? 'low' : complexity <= 10 ? 'moderate' : complexity <= 20 ? 'high' : 'very high';

    return {
      complexity,
      lines,
      rating,
      suggestion:
        rating === 'low'
          ? 'Code complexity is well-managed.'
          : rating === 'moderate'
            ? 'Consider extracting some logic into helper functions.'
            : 'This code should be refactored to reduce complexity.',
    };
  });

const ReviewSchema = z.object({
  overallScore: z.number().min(1).max(10),
  summary: z.string(),
  issues: z.array(
    z.object({
      severity: z.enum(['critical', 'warning', 'info']),
      description: z.string(),
      suggestion: z.string(),
    }),
  ),
  strengths: z.array(z.string()),
});

async function main() {
  const agent = new Agent({
    name: 'code-review-agent',
    description: 'Reviews code for quality, patterns, and potential issues',
    systemPrompt: `You are an expert code reviewer. When asked to review code:
1. Read the source file using the file_read tool
2. Analyze its complexity using the analyze_complexity tool
3. Assess code quality, patterns, error handling, and maintainability
4. Provide structured feedback with scores, issues, and strengths

Be constructive and specific in your feedback.`,
    tools: [fileReadTool, analyzeComplexityTool],
    maxIterations: 5,
    onEvent: (event) => {
      if (event.type === 'agent:tool_call') {
        console.log(`🔧 Calling: ${JSON.stringify(event.data)}`);
      }
    },
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Code Review Agent - agent-flow example');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const result = await agent.run(
    'Review the file at ./src/core/agent.ts for code quality',
    { structuredOutput: ReviewSchema },
  );

  console.log('\nStatus:', result.status);
  console.log('Output:', JSON.stringify(result.output, null, 2));
}

main().catch(console.error);
