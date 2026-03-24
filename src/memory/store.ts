import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { ConversationMemory, MemoryStore, Message } from '../core/types.js';

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
    const filePath = path.join(this.dir, `${conversationId}.json`);
    const data = JSON.stringify(memory.getAll(), null, 2);
    await fs.writeFile(filePath, data, 'utf-8');
  }

  async load(conversationId: string): Promise<Message[] | null> {
    try {
      const filePath = path.join(this.dir, `${conversationId}.json`);
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
      const filePath = path.join(this.dir, `${conversationId}.json`);
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
