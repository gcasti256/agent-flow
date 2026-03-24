import { z } from 'zod';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { defineTool } from '../core/tool-builder.js';

/**
 * File read tool - reads file contents from disk.
 */
export const fileReadTool = defineTool('file_read')
  .describe('Read the contents of a file from the filesystem.')
  .parameters(
    z.object({
      path: z.string().describe('Absolute or relative file path to read'),
      encoding: z.enum(['utf-8', 'base64']).default('utf-8').describe('File encoding'),
    }),
  )
  .execute(async ({ path: filePath, encoding }) => {
    const resolved = path.resolve(filePath);
    const content = await fs.readFile(resolved, encoding as BufferEncoding);
    const stats = await fs.stat(resolved);
    return {
      path: resolved,
      content,
      size: stats.size,
      modified: stats.mtime.toISOString(),
    };
  });

/**
 * File write tool - writes content to a file.
 */
export const fileWriteTool = defineTool('file_write')
  .describe('Write content to a file on the filesystem. Creates directories if needed.')
  .parameters(
    z.object({
      path: z.string().describe('Absolute or relative file path to write'),
      content: z.string().describe('Content to write to the file'),
      append: z.boolean().default(false).describe('Append to existing file instead of overwriting'),
    }),
  )
  .execute(async ({ path: filePath, content, append }) => {
    const resolved = path.resolve(filePath);
    await fs.mkdir(path.dirname(resolved), { recursive: true });

    if (append) {
      await fs.appendFile(resolved, content, 'utf-8');
    } else {
      await fs.writeFile(resolved, content, 'utf-8');
    }

    const stats = await fs.stat(resolved);
    return {
      path: resolved,
      size: stats.size,
      action: append ? 'appended' : 'written',
    };
  });
