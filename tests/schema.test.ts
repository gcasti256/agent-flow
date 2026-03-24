import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { zodToJsonSchema } from '../src/schemas/converter.js';

describe('zodToJsonSchema', () => {
  it('should convert a simple object schema', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const result = zodToJsonSchema(schema);
    expect(result).toEqual({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name', 'age'],
    });
  });

  it('should handle optional fields', () => {
    const schema = z.object({
      required: z.string(),
      optional: z.string().optional(),
    });
    const result = zodToJsonSchema(schema);
    expect(result.required).toEqual(['required']);
  });

  it('should handle arrays', () => {
    const schema = z.object({
      tags: z.array(z.string()),
    });
    const result = zodToJsonSchema(schema);
    expect(result.properties).toHaveProperty('tags');
    expect((result.properties as any).tags).toEqual({
      type: 'array',
      items: { type: 'string' },
    });
  });

  it('should handle enums', () => {
    const schema = z.object({
      status: z.enum(['active', 'inactive', 'pending']),
    });
    const result = zodToJsonSchema(schema);
    expect((result.properties as any).status).toEqual({
      type: 'string',
      enum: ['active', 'inactive', 'pending'],
    });
  });

  it('should handle booleans', () => {
    const schema = z.object({
      enabled: z.boolean(),
    });
    const result = zodToJsonSchema(schema);
    expect((result.properties as any).enabled).toEqual({ type: 'boolean' });
  });

  it('should handle defaults', () => {
    const schema = z.object({
      count: z.number().default(10),
    });
    const result = zodToJsonSchema(schema);
    expect((result.properties as any).count.default).toBe(10);
  });

  it('should handle nested objects', () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
        email: z.string(),
      }),
    });
    const result = zodToJsonSchema(schema);
    expect((result.properties as any).user.type).toBe('object');
    expect((result.properties as any).user.properties).toHaveProperty('name');
  });
});
