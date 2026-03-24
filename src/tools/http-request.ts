import { z } from 'zod';
import { defineTool } from '../core/tool-builder.js';

/**
 * HTTP request tool for making API calls.
 */
export const httpRequestTool = defineTool('http_request')
  .describe('Make an HTTP request to a URL and return the response.')
  .parameters(
    z.object({
      url: z.string().url().describe('The URL to request'),
      method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('GET').describe('HTTP method'),
      headers: z.record(z.string()).optional().describe('Request headers'),
      body: z.string().optional().describe('Request body (for POST/PUT/PATCH)'),
      timeout: z.number().min(1000).max(30000).default(10000).describe('Request timeout in ms'),
    }),
  )
  .execute(async ({ url, method, headers, body, timeout }) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: headers ?? {},
        body: body ?? undefined,
        signal: controller.signal,
      });

      const contentType = response.headers.get('content-type') ?? '';
      let responseBody: unknown;

      if (contentType.includes('application/json')) {
        responseBody = await response.json();
      } else {
        responseBody = await response.text();
      }

      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  });
