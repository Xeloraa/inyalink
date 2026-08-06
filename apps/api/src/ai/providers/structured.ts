import { z, ZodError, type ZodType } from 'zod';
import type { TokenUsage } from './types.js';

export type RawCompletion = {
  content: string;
  usage: TokenUsage;
};

/** JSON Schema suitable for OpenAI / Groq / Gemini structured output APIs. */
export function toModelJsonSchema(
  schema: ZodType,
  target?: 'draft-2020-12' | 'openapi-3.0',
): Record<string, unknown> {
  const raw = z.toJSONSchema(schema, {
    ...(target ? { target } : {}),
  }) as Record<string, unknown>;

  const { $schema: _ignored, ...rest } = raw;
  return rest;
}

function formatValidationError(err: unknown): string {
  if (err instanceof ZodError) {
    return z.prettifyError(err);
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

function parseContent(content: string): unknown {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error('completion was not valid JSON');
  }
}

function isSchemaFailure(err: unknown): boolean {
  if (err instanceof ZodError) {
    return true;
  }
  return err instanceof Error && err.message.includes('not valid JSON');
}

/**
 * Call the model with a JSON Schema constraint, validate with Zod, and on
 * validation/parse failure retry once with the error appended to the input.
 * Non-schema errors (e.g. HTTP / rate limit) propagate immediately.
 */
export async function completeWithSchemaRetry<T>(opts: {
  schema: ZodType<T>;
  prompt: string;
  input: string;
  jsonSchemaTarget?: 'draft-2020-12' | 'openapi-3.0';
  run: (args: {
    prompt: string;
    input: string;
    jsonSchema: Record<string, unknown>;
    validationError?: string;
  }) => Promise<RawCompletion>;
}): Promise<{ data: T; usage: TokenUsage; latencyMs: number }> {
  const started = Date.now();
  const jsonSchema = toModelJsonSchema(opts.schema, opts.jsonSchemaTarget);
  const usage: TokenUsage = { tokensIn: 0, tokensOut: 0 };

  const attempt = async (validationError?: string): Promise<T> => {
    const raw = await opts.run({
      prompt: opts.prompt,
      input: opts.input,
      jsonSchema,
      validationError,
    });
    usage.tokensIn += raw.usage.tokensIn;
    usage.tokensOut += raw.usage.tokensOut;
    return opts.schema.parse(parseContent(raw.content));
  };

  try {
    const data = await attempt();
    return { data, usage, latencyMs: Date.now() - started };
  } catch (firstErr) {
    if (!isSchemaFailure(firstErr)) {
      throw firstErr;
    }
    const data = await attempt(formatValidationError(firstErr));
    return { data, usage, latencyMs: Date.now() - started };
  }
}

export function withValidationFeedback(
  input: string,
  validationError: string | undefined,
): string {
  if (!validationError) {
    return input;
  }
  return [
    input,
    '',
    'Your previous JSON failed validation. Fix it to satisfy the schema.',
    validationError,
  ].join('\n');
}
