import { z, ZodType } from 'zod';
import type { ToolDefinition, ToolContext } from './types.js';

/**
 * Fluent builder for creating type-safe tool definitions.
 *
 * @example
 * ```ts
 * const calculator = defineTool('calculator')
 *   .describe('Perform arithmetic calculations')
 *   .parameters(z.object({
 *     expression: z.string().describe('Math expression to evaluate'),
 *   }))
 *   .execute(async ({ expression }) => {
 *     return eval(expression);
 *   });
 * ```
 */
export function defineTool(name: string) {
  return new ToolBuilder(name);
}

class ToolBuilder<TParams extends ZodType = never> {
  private _name: string;
  private _description = '';
  private _parameters?: TParams;
  // _execute is assigned via the fluent API in execute() below

  constructor(name: string) {
    this._name = name;
  }

  describe(description: string): this {
    this._description = description;
    return this;
  }

  parameters<T extends ZodType>(schema: T): ToolBuilder<T> {
    const builder = this as unknown as ToolBuilder<T>;
    builder._parameters = schema;
    return builder;
  }

  execute<TResult>(
    fn: (params: z.infer<TParams>, context: ToolContext) => Promise<TResult>,
  ): ToolDefinition<TParams, TResult> {
    if (!this._parameters) {
      throw new Error(`Tool "${this._name}" must define parameters before execute`);
    }
    return {
      name: this._name,
      description: this._description,
      parameters: this._parameters,
      execute: fn as (params: z.infer<TParams>, context: ToolContext) => Promise<TResult>,
    };
  }
}
