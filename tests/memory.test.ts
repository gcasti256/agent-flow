import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryConversationMemory } from '../src/memory/conversation.js';
import { createWorkingMemory } from '../src/memory/working.js';
import type { Message } from '../src/core/types.js';

describe('InMemoryConversationMemory', () => {
  let memory: InMemoryConversationMemory;

  beforeEach(() => {
    memory = new InMemoryConversationMemory(10);
  });

  it('should add and retrieve messages', () => {
    memory.add({ role: 'user', content: 'Hello' });
    memory.add({ role: 'assistant', content: 'Hi there!' });
    expect(memory.getAll()).toHaveLength(2);
  });

  it('should return recent messages', () => {
    memory.add({ role: 'system', content: 'System prompt' });
    memory.add({ role: 'user', content: 'Message 1' });
    memory.add({ role: 'assistant', content: 'Response 1' });
    memory.add({ role: 'user', content: 'Message 2' });
    memory.add({ role: 'assistant', content: 'Response 2' });

    const recent = memory.getRecent(2);
    // Should include system + last 2 non-system messages
    expect(recent.length).toBe(3);
    expect(recent[0].role).toBe('system');
    expect(recent[recent.length - 1].content).toBe('Response 2');
  });

  it('should trim old messages when over limit', () => {
    // Set limit to 5
    const smallMemory = new InMemoryConversationMemory(5);
    smallMemory.add({ role: 'system', content: 'System' });
    for (let i = 0; i < 10; i++) {
      smallMemory.add({ role: 'user', content: `Message ${i}` });
    }
    // Should keep system + last 4 messages
    expect(smallMemory.getAll().length).toBeLessThanOrEqual(5);
    expect(smallMemory.getAll()[0].role).toBe('system');
  });

  it('should clear all messages', () => {
    memory.add({ role: 'user', content: 'Test' });
    memory.clear();
    expect(memory.getAll()).toHaveLength(0);
  });

  it('should estimate token count', () => {
    memory.add({ role: 'user', content: 'Hello world' }); // ~11 chars / 4 = ~3 tokens
    expect(memory.tokenCount()).toBeGreaterThan(0);
  });

  it('should produce a summary', async () => {
    memory.add({ role: 'system', content: 'System' });
    memory.add({ role: 'user', content: 'What is AI?' });
    memory.add({ role: 'assistant', content: 'AI is artificial intelligence.' });
    const summary = await memory.summarize();
    expect(summary).toContain('user:');
    expect(summary).toContain('assistant:');
  });
});

describe('WorkingMemory', () => {
  it('should set and get values', () => {
    const wm = createWorkingMemory();
    wm.set('key1', 'value1');
    expect(wm.get('key1')).toBe('value1');
  });

  it('should delete values', () => {
    const wm = createWorkingMemory();
    wm.set('key1', 'value1');
    expect(wm.delete('key1')).toBe(true);
    expect(wm.get('key1')).toBeUndefined();
  });

  it('should clear all values', () => {
    const wm = createWorkingMemory();
    wm.set('a', 1);
    wm.set('b', 2);
    wm.clear();
    expect(wm.toJSON()).toEqual({});
  });

  it('should serialize to JSON', () => {
    const wm = createWorkingMemory();
    wm.set('name', 'test');
    wm.set('count', 42);
    expect(wm.toJSON()).toEqual({ name: 'test', count: 42 });
  });

  it('should iterate entries', () => {
    const wm = createWorkingMemory();
    wm.set('a', 1);
    wm.set('b', 2);
    const entries = Array.from(wm.entries());
    expect(entries).toHaveLength(2);
  });
});
