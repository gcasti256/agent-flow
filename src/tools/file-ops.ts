import { z } from 'zod';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { defineTool } from '../core/tool-builder.js';

/**
 * Default base directory for file operations.
 * All file paths are resolved relative to this and must stay within it.
 */
let _basePath: string = process.cwd();

/**
 * Configure the base directory for file operations.
 * All file reads/writes are restricted to paths within this directory.
 */
export function setFileOpsBasePath(basePath: string): void {
  _basePath = path.resolve(basePath);
}

/**
 * Get the current base directory for file operations.
 */
export function getFileOpsBasePath(): string {
  return _basePath;
}

/**
 * Validate that a file path resolves to a location within the base directory.
 * Rejects path traversal attempts (e.g., '../../../etc/passwd').
 */
function validatePath(filePath: string): string {
  // Reject absolute paths that don't start with the base path
  if (path.isAbsolute(filePath) && !filePath.startsWith(_basePath)) {
    throw new Error(`Path is outside the allowed base directory: ${filePath}`);
  }

  // Resolve relative to base path
  const resolved = path.resolve(_basePath, filePath);

  // Ensure the resolved path is within the base directory
  // Use path.sep to ensure we check the full directory component
  // (e.g., /base/path-evil should not match /base/path)
  if (!resolved.startsWith(_basePath + path.sep) && resolved !== _basePath) {
    throw new Error(`Path traversal detected: "${filePath}" resolves outside the allowed base directory`);
  }

  return resolved;
}

/**
 * File read tool - reads file contents from disk.
 * Paths are restricted to the configured base directory.
 */
export const fileReadTool = defineTool('file_read')
  .describe('Read the contents of a file from the filesystem.')
  .parameters(
    z.object({
      path: z.string().describe('File path relative to the working directory'),
      encoding: z.enum(['utf-8', 'base64']).default('utf-8').describe('File encoding'),
    }),
  )
  .execute(async ({ path: filePath, encoding }) => {
    const resolved = validatePath(filePath);
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
 * Paths are restricted to the configured base directory.
 */
export const fileWriteTool = defineTool('file_write')
  .describe('Write content to a file on the filesystem. Creates directories if needed.')
  .parameters(
    z.object({
      path: z.string().describe('File path relative to the working directory'),
      content: z.string().describe('Content to write to the file'),
      append: z.boolean().default(false).describe('Append to existing file instead of overwriting'),
    }),
  )
  .execute(async ({ path: filePath, content, append }) => {
    const resolved = validatePath(filePath);
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
