import { z } from 'zod';
import { defineTool } from '../core/tool-builder.js';

/**
 * Safe arithmetic calculator tool.
 * Evaluates mathematical expressions without using eval().
 */
export const calculatorTool = defineTool('calculator')
  .describe('Perform arithmetic calculations. Supports +, -, *, /, ^, %, and parentheses.')
  .parameters(
    z.object({
      expression: z.string().describe('Mathematical expression to evaluate (e.g., "2 + 3 * 4")'),
    }),
  )
  .execute(async ({ expression }) => {
    const result = evaluateExpression(expression);
    return { expression, result };
  });

// ─── Safe Expression Evaluator ────────────────────────────────────────

type Token = { type: 'number'; value: number } | { type: 'op'; value: string } | { type: 'paren'; value: string };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const s = expr.replace(/\s+/g, '');

  while (i < s.length) {
    // Number (including decimals)
    if (/[\d.]/.test(s[i])) {
      let num = '';
      while (i < s.length && /[\d.]/.test(s[i])) {
        num += s[i++];
      }
      tokens.push({ type: 'number', value: parseFloat(num) });
      continue;
    }
    // Negative number after operator or at start
    if (s[i] === '-' && (tokens.length === 0 || tokens[tokens.length - 1].type === 'op' || (tokens[tokens.length - 1].type === 'paren' && tokens[tokens.length - 1].value === '('))) {
      let num = '-';
      i++;
      while (i < s.length && /[\d.]/.test(s[i])) {
        num += s[i++];
      }
      tokens.push({ type: 'number', value: parseFloat(num) });
      continue;
    }
    if ('+-*/%^'.includes(s[i])) {
      tokens.push({ type: 'op', value: s[i++] });
      continue;
    }
    if ('()'.includes(s[i])) {
      tokens.push({ type: 'paren', value: s[i++] });
      continue;
    }
    throw new Error(`Unexpected character: ${s[i]}`);
  }

  return tokens;
}

function evaluateExpression(expr: string): number {
  if (expr.length > 1000) {
    throw new Error('Expression too long (max 1000 characters)');
  }
  const tokens = tokenize(expr);
  let pos = 0;

  function parseExpression(): number {
    let left = parseTerm();
    while (pos < tokens.length && tokens[pos].type === 'op' && (tokens[pos].value === '+' || tokens[pos].value === '-')) {
      const op = tokens[pos++].value;
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseTerm(): number {
    let left = parsePower();
    while (pos < tokens.length && tokens[pos].type === 'op' && (tokens[pos].value === '*' || tokens[pos].value === '/' || tokens[pos].value === '%')) {
      const op = tokens[pos++].value;
      const right = parsePower();
      if (op === '*') left = left * right;
      else if (op === '/') {
        if (right === 0) throw new Error('Division by zero');
        left = left / right;
      } else left = left % right;
    }
    return left;
  }

  function parsePower(): number {
    let base = parseAtom();
    while (pos < tokens.length && tokens[pos].type === 'op' && tokens[pos].value === '^') {
      pos++;
      const exp = parseAtom();
      if (Math.abs(exp) > 1000) {
        throw new Error(`Exponent too large: ${exp} (max 1000)`);
      }
      base = Math.pow(base, exp);
    }
    return base;
  }

  function parseAtom(): number {
    if (pos < tokens.length && tokens[pos].type === 'paren' && tokens[pos].value === '(') {
      pos++; // skip (
      const result = parseExpression();
      if (pos >= tokens.length || tokens[pos].value !== ')') {
        throw new Error('Mismatched parentheses');
      }
      pos++; // skip )
      return result;
    }
    if (pos < tokens.length && tokens[pos].type === 'number') {
      return tokens[pos++].value as number;
    }
    throw new Error(`Unexpected token at position ${pos}`);
  }

  const result = parseExpression();
  if (pos < tokens.length) {
    throw new Error(`Unexpected token: ${JSON.stringify(tokens[pos])}`);
  }
  return result;
}
