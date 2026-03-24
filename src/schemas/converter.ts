import { ZodType, ZodObject, ZodArray, ZodString, ZodNumber, ZodBoolean, ZodEnum, ZodOptional, ZodDefault, ZodNullable } from 'zod';

type JsonSchema = Record<string, unknown>;

/**
 * Convert a Zod schema to JSON Schema format for tool definitions.
 * Handles common Zod types used in tool parameter definitions.
 */
export function zodToJsonSchema(schema: ZodType): JsonSchema {
  return convertSchema(schema);
}

function convertSchema(schema: ZodType): JsonSchema {
  // Unwrap optional/default/nullable
  if (schema instanceof ZodOptional) {
    return convertSchema(schema.unwrap());
  }
  if (schema instanceof ZodDefault) {
    const inner = convertSchema(schema.removeDefault());
    return { ...inner, default: schema._def.defaultValue() };
  }
  if (schema instanceof ZodNullable) {
    const inner = convertSchema(schema.unwrap());
    return { ...inner, nullable: true };
  }

  if (schema instanceof ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = convertSchema(value as ZodType);
      if (!(value instanceof ZodOptional) && !(value instanceof ZodDefault)) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      ...(required.length > 0 ? { required } : {}),
    };
  }

  if (schema instanceof ZodArray) {
    return {
      type: 'array',
      items: convertSchema(schema.element),
    };
  }

  if (schema instanceof ZodString) {
    const result: JsonSchema = { type: 'string' };
    if (schema.description) result.description = schema.description;
    return result;
  }

  if (schema instanceof ZodNumber) {
    const result: JsonSchema = { type: 'number' };
    if (schema.description) result.description = schema.description;
    return result;
  }

  if (schema instanceof ZodBoolean) {
    return { type: 'boolean' };
  }

  if (schema instanceof ZodEnum) {
    return {
      type: 'string',
      enum: schema._def.values,
    };
  }

  // Fallback
  return { type: 'string' };
}
