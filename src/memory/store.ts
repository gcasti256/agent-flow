import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { ConversationMemory, MemoryStore, Message } from '../core/types.js';

/**
 * Sanitize a conversation ID to prevent path traversal.
 * Replaces any character that is not alphanumeric, hyphen, or underscore with an underscore.
 * Rejects empty IDs.
 */
function sanitizeConversationId(conversationId: string): string {
  if (!conversationId || conversationId.trim().length === 0) {
    throw new Error('Conversation ID must not be empty');
  }
  // Replace anything that isn't alphanumeric, hyphen, or underscore
  const sanitized = conversationId.replace(/[^a-zA-Z0-9\-_]/g, '_');
  // Reject if the sanitized result is empty (e.g., all special chars)
  if (sanitized.length === 0) {
    throw new Error('Conversation ID contains no valid characters');
  }
  return sanitized;
}

/**
 * Build a safe file path within the store directory.
 * Validates the resolved path stays inside the directory.
 */
function safePath(dir: string, conversationId: string): string {
  const sanitized = sanitizeConversationId(conversationId);
  const filePath = path.join(dir, `${sanitized}.json`);
  const resolved = path.resolve(filePath);
  // Double-check the resolved path is inside the store directory
  const resolvedDir = path.resolve(dir);
  if (!resolved.startsWith(resolvedDir + path.sep) && resolved !== resolvedDir) {
    throw new Error('Path traversal detected in conversation ID');
  }
  return resolved;
}

/**
 * File-system backed memory store for persisting conversations across sessions.
 */
export class FileMemoryStore implements MemoryStore {
  private dir: string;

  constructor(directory: string) {
    this.dir = directory;
  }

  async save(conversationId: string, memory: ConversationMemory): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    const filePath = safePath(this.dir, conversationId);
    const data = JSON.stringify(memory.getAll(), null, 2);
    await fs.writeFile(filePath, data, 'utf-8');
  }

  async load(conversationId: string): Promise<Message[] | null> {
    try {
      const filePath = safePath(this.dir, conversationId);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data) as Message[];
    } catch {
      return null;
    }
  }

  async list(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.dir);
      return files
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.replace('.json', ''));
    } catch {
      return [];
    }
  }

  async delete(conversationId: string): Promise<boolean> {
    try {
      const filePath = safePath(this.dir, conversationId);
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
