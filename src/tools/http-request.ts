import { z } from 'zod';
import { defineTool } from '../core/tool-builder.js';

/**
 * Checks whether a hostname resolves to a private/reserved IP range.
 * Blocks SSRF attacks targeting internal network addresses.
 */
function isBlockedHostname(hostname: string): boolean {
  // Block localhost variants
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === '::1' ||
    hostname === '0.0.0.0'
  ) {
    return true;
  }

  // Block IP-based hostnames in private/reserved ranges
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);

    // 10.0.0.0/8 — Private
    if (a === 10) return true;

    // 172.16.0.0/12 — Private
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 192.168.0.0/16 — Private
    if (a === 192 && b === 168) return true;

    // 169.254.0.0/16 — Link-local / cloud metadata (AWS, GCP, Azure)
    if (a === 169 && b === 254) return true;

    // 127.0.0.0/8 — Loopback
    if (a === 127) return true;

    // 0.0.0.0/8
    if (a === 0) return true;

    // 100.64.0.0/10 — Carrier-grade NAT
    if (a === 100 && b >= 64 && b <= 127) return true;

    // 198.18.0.0/15 — Benchmarking
    if (a === 198 && (b === 18 || b === 19)) return true;

    // 224.0.0.0/4 — Multicast
    if (a >= 224 && a <= 239) return true;

    // 240.0.0.0/4 — Reserved
    if (a >= 240) return true;
  }

  // Block common metadata service hostnames
  const blockedHosts = [
    'metadata.google.internal',
    'metadata.google',
    'instance-data',
  ];
  if (blockedHosts.includes(hostname.toLowerCase())) {
    return true;
  }

  return false;
}

/**
 * Validate a URL to prevent SSRF attacks.
 * Only allows http/https schemes and blocks private/reserved IP ranges.
 */
function validateUrl(urlString: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error(`Invalid URL: ${urlString}`);
  }

  // Only allow http and https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Blocked URL scheme: ${parsed.protocol} — only http and https are allowed`);
  }

  // Check hostname against blocklist
  const hostname = parsed.hostname;
  if (isBlockedHostname(hostname)) {
    throw new Error(`Blocked URL: requests to private/internal network addresses are not allowed`);
  }

  return parsed;
}

/**
 * HTTP request tool for making API calls.
 * Includes SSRF protection: blocks requests to private/reserved IP ranges and localhost.
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
    // Validate URL before making request (SSRF protection)
    validateUrl(url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: headers ?? {},
        body: body ?? undefined,
        signal: controller.signal,
        redirect: 'manual', // Don't follow redirects to prevent redirect-based SSRF
      });

      // If the response is a redirect, validate the redirect target too
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (location) {
          // Validate redirect target — throws if it targets a private address
          validateUrl(new URL(location, url).href);
        }
        return {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: `Redirect to: ${location ?? 'unknown'}`,
        };
      }

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
