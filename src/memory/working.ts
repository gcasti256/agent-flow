import type { WorkingMemory } from '../core/types.js';

/**
 * Ephemeral key-value store for agent scratch space during a single run.
 * Tools can read/write working memory to share state within an execution.
 */
export function createWorkingMemory(): WorkingMemory {
  const store = new Map<string, unknown>();

  return {
    get(key: string): unknown {
      return store.get(key);
    },
    set(key: string, value: unknown): void {
      store.set(key, value);
    },
    delete(key: string): boolean {
      return store.delete(key);
    },
    entries(): IterableIterator<[string, unknown]> {
      return store.entries();
    },
    clear(): void {
      store.clear();
    },
    toJSON(): Record<string, unknown> {
      return Object.fromEntries(store);
    },
  };
}
