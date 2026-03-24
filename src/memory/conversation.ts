import type { ConversationMemory, Message } from '../core/types.js';

/**
 * In-memory conversation history with token-aware windowing.
 * Maintains full history but can return windowed views to stay within token limits.
 */
export class InMemoryConversationMemory implements ConversationMemory {
  messages: Message[] = [];
  private maxMessages: number;

  constructor(maxMessages = 100) {
    this.maxMessages = maxMessages;
  }

  add(message: Message): void {
    this.messages.push(message);

    // Keep system message + trim oldest non-system messages if over limit
    if (this.messages.length > this.maxMessages) {
      const system = this.messages.filter((m) => m.role === 'system');
      const nonSystem = this.messages.filter((m) => m.role !== 'system');
      this.messages = [...system, ...nonSystem.slice(-this.maxMessages + system.length)];
    }
  }

  getRecent(n: number): Message[] {
    const system = this.messages.filter((m) => m.role === 'system');
    const nonSystem = this.messages.filter((m) => m.role !== 'system');
    return [...system, ...nonSystem.slice(-n)];
  }

  getAll(): Message[] {
    return [...this.messages];
  }

  clear(): void {
    this.messages = [];
  }

  async summarize(): Promise<string> {
    const nonSystem = this.messages.filter((m) => m.role !== 'system');
    const summary = nonSystem
      .map((m) => `${m.role}: ${m.content.slice(0, 200)}`)
      .join('\n');
    return summary;
  }

  tokenCount(): number {
    // Rough estimate: ~4 chars per token
    return Math.ceil(
      this.messages.reduce((sum, m) => sum + m.content.length, 0) / 4,
    );
  }
}
