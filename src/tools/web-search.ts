import { z } from 'zod';
import { defineTool } from '../core/tool-builder.js';

/**
 * Web search tool. Uses a mock implementation for demo purposes,
 * but can be configured to use real search APIs.
 */
export const webSearchTool = defineTool('web_search')
  .describe(
    'Search the web for information. Returns relevant search results with titles, URLs, and snippets.',
  )
  .parameters(
    z.object({
      query: z.string().describe('Search query string'),
      maxResults: z.number().min(1).max(10).default(5).describe('Maximum number of results to return'),
    }),
  )
  .execute(async ({ query, maxResults }) => {
    // In production, this would call a real search API (Google, Bing, Brave, etc.)
    // For demo purposes, returns mock results that illustrate the pattern
    const results = generateMockResults(query, maxResults);
    return {
      query,
      totalResults: results.length,
      results,
    };
  });

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

function generateMockResults(query: string, maxResults: number): SearchResult[] {
  const words = query.toLowerCase().split(/\s+/);
  const results: SearchResult[] = [
    {
      title: `${capitalize(query)} - Wikipedia`,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query.replace(/\s+/g, '_'))}`,
      snippet: `${capitalize(query)} is a topic of interest. This article provides comprehensive information about ${query}, including history, applications, and current developments.`,
    },
    {
      title: `Understanding ${capitalize(query)} - A Complete Guide`,
      url: `https://example.com/guide/${words.join('-')}`,
      snippet: `Learn everything you need to know about ${query}. Our guide covers fundamentals, best practices, and advanced techniques for working with ${query}.`,
    },
    {
      title: `${capitalize(query)} | Latest Research and Papers`,
      url: `https://arxiv.org/search/?query=${encodeURIComponent(query)}`,
      snippet: `Recent academic research on ${query}. Browse the latest papers, preprints, and publications related to ${query} and its applications.`,
    },
    {
      title: `How to Use ${capitalize(query)} - Tutorial`,
      url: `https://example.com/tutorials/${words.join('-')}`,
      snippet: `Step-by-step tutorial on ${query}. Includes code examples, diagrams, and practical exercises to help you master ${query}.`,
    },
    {
      title: `${capitalize(query)} Documentation`,
      url: `https://docs.example.com/${words.join('-')}`,
      snippet: `Official documentation for ${query}. API reference, configuration options, and integration guides.`,
    },
    {
      title: `${capitalize(query)} vs Alternatives - Comparison`,
      url: `https://example.com/compare/${words.join('-')}`,
      snippet: `Detailed comparison of ${query} against popular alternatives. Performance benchmarks, feature matrices, and community insights.`,
    },
  ];

  return results.slice(0, maxResults);
}

function capitalize(s: string): string {
  return s
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
