import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  completeWithSchemaRetry,
  toModelJsonSchema,
} from '../src/ai/providers/structured.js';

describe('toModelJsonSchema', () => {
  it('strips $schema for model APIs', () => {
    const schema = z.object({ status: z.literal('ok') });
    const json = toModelJsonSchema(schema);
    expect(json).not.toHaveProperty('$schema');
    expect(json).toMatchObject({
      type: 'object',
      properties: { status: { const: 'ok' } },
      required: ['status'],
      additionalProperties: false,
    });
  });
});

describe('completeWithSchemaRetry', () => {
  it('retries once when the first payload fails Zod validation', async () => {
    const schema = z.object({ status: z.literal('ok') });
    const run = vi
      .fn()
      .mockResolvedValueOnce({
        content: '{"status":"nope"}',
        usage: { tokensIn: 1, tokensOut: 1 },
      })
      .mockResolvedValueOnce({
        content: '{"status":"ok"}',
        usage: { tokensIn: 2, tokensOut: 2 },
      });

    const result = await completeWithSchemaRetry({
      schema,
      prompt: 'p',
      input: 'i',
      run,
    });

    expect(result.data).toEqual({ status: 'ok' });
    expect(result.usage).toEqual({ tokensIn: 3, tokensOut: 3 });
    expect(run).toHaveBeenCalledTimes(2);
    expect(run.mock.calls[1]?.[0].validationError).toBeTruthy();
  });

  it('throws when the retry also fails validation', async () => {
    const schema = z.object({ status: z.literal('ok') });
    const run = vi.fn().mockResolvedValue({
      content: '{"status":"nope"}',
      usage: { tokensIn: 1, tokensOut: 1 },
    });

    await expect(
      completeWithSchemaRetry({
        schema,
        prompt: 'p',
        input: 'i',
        run,
      }),
    ).rejects.toBeTruthy();
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('does not schema-retry on non-validation errors', async () => {
    const schema = z.object({ status: z.literal('ok') });
    const run = vi.fn().mockRejectedValue(new Error('HTTP 429'));

    await expect(
      completeWithSchemaRetry({ schema, prompt: 'p', input: 'i', run }),
    ).rejects.toThrow('HTTP 429');
    expect(run).toHaveBeenCalledTimes(1);
  });
});
