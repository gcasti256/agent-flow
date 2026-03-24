/**
 * Data Analysis Agent Example
 *
 * Demonstrates an agent that reads CSV data, performs calculations,
 * and generates analysis reports.
 */
import { Agent, calculatorTool, fileReadTool, defineTool } from '../src/index.js';
import { z } from 'zod';

// Custom CSV parser tool
const csvParseTool = defineTool('parse_csv')
  .describe('Parse CSV text into structured data with column analysis')
  .parameters(
    z.object({
      csvText: z.string().describe('Raw CSV text content'),
      hasHeader: z.boolean().default(true).describe('Whether the first row is a header'),
    }),
  )
  .execute(async ({ csvText, hasHeader }) => {
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return { error: 'Empty CSV' };

    const headers = hasHeader
      ? lines[0].split(',').map((h) => h.trim())
      : lines[0].split(',').map((_, i) => `col_${i}`);

    const dataLines = hasHeader ? lines.slice(1) : lines;
    const rows = dataLines.map((line) => {
      const values = line.split(',').map((v) => v.trim());
      const row: Record<string, string | number> = {};
      headers.forEach((h, i) => {
        const val = values[i] ?? '';
        const num = Number(val);
        row[h] = isNaN(num) ? val : num;
      });
      return row;
    });

    // Column statistics for numeric columns
    const stats: Record<string, { min: number; max: number; avg: number; count: number }> = {};
    for (const header of headers) {
      const numericValues = rows.map((r) => r[header]).filter((v) => typeof v === 'number') as number[];
      if (numericValues.length > 0) {
        stats[header] = {
          min: Math.min(...numericValues),
          max: Math.max(...numericValues),
          avg: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
          count: numericValues.length,
        };
      }
    }

    return {
      headers,
      rowCount: rows.length,
      columnCount: headers.length,
      sampleRows: rows.slice(0, 5),
      numericStats: stats,
    };
  });

async function main() {
  const agent = new Agent({
    name: 'data-analysis-agent',
    description: 'Analyzes data from CSV files and produces insights',
    systemPrompt: `You are a data analyst. When given data:
1. Parse the CSV data using parse_csv
2. Use the calculator for statistical computations
3. Identify trends, outliers, and key insights
4. Present findings clearly with supporting numbers`,
    tools: [csvParseTool, calculatorTool, fileReadTool],
    maxIterations: 8,
    onEvent: (event) => {
      if (event.type === 'agent:thinking') {
        console.log(`💭 Thinking (iteration ${JSON.stringify(event.data)})...`);
      }
      if (event.type === 'agent:tool_call') {
        console.log(`🔧 Tool call:`, event.data);
      }
    },
  });

  // Sample CSV data
  const sampleCsv = `name,department,salary,experience_years,performance_score
Alice,Engineering,125000,8,4.5
Bob,Engineering,115000,5,4.2
Carol,Marketing,95000,6,4.7
Dave,Engineering,140000,12,4.8
Eve,Marketing,88000,3,3.9
Frank,Sales,92000,7,4.1
Grace,Engineering,130000,9,4.6
Henry,Sales,98000,4,4.3
Iris,Marketing,105000,8,4.4
Jack,Sales,85000,2,3.7`;

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Data Analysis Agent - agent-flow example');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const result = await agent.run(
    `Analyze this employee dataset and provide insights on salary distribution, department comparisons, and correlation between experience and performance:\n\n${sampleCsv}`,
  );

  console.log('\n━━━ Analysis Result ━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Status:', result.status);
  console.log('Iterations:', result.iterations);
  console.log('Tool calls:', result.toolCalls.length);
  console.log('\nAnalysis:\n', result.output);
}

main().catch(console.error);
