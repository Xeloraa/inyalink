import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  createOpenAICompatibleProvider,
  parseRateLimitBackoffMs,
} from '../src/ai/providers/openai-compatible.js';

describe('parseRateLimitBackoffMs', () => {
  it('reads Retry-After seconds', () => {
    const res = new Response('', {
      headers: { 'retry-after': '3' },
    });
    expect(parseRateLimitBackoffMs(res, '')).toBe(3000);
  });

  it('parses Groq body hint and caps at 15s', () => {
    const res = new Response('');
    expect(
      parseRateLimitBackoffMs(
        res,
        'Please try again in 8.317499999s. Need more tokens?',
      ),
    ).toBe(8318);
    expect(parseRateLimitBackoffMs(res, 'try again in 30s')).toBe(15_000);
  });
});

describe('rate limit handling', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('retries once on 429 then returns AI_RATE_LIMIT', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: { message: 'Please try again in 1s.' },
          }),
          { status: 429, headers: { 'retry-after': '1' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: { message: 'still limited' } }),
          { status: 429 },
        ),
      );

    vi.stubGlobal('fetch', fetchMock);

    const provider = createOpenAICompatibleProvider({
      name: 'groq',
      apiKey: 'test-key',
      baseUrl: 'https://api.groq.com/openai/v1',
      model: 'openai/gpt-oss-120b',
      retryRateLimit: true,
    });

    const pending = provider.complete({
      prompt: 'p',
      input: 'i',
      schema: z.object({ status: z.literal('ok') }),
    });

    await vi.advanceTimersByTimeAsync(1000);
    const result = await pending;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      ok: false,
      error: {
        code: 'AI_RATE_LIMIT',
        message: 'The AI service is busy. Please try again shortly.',
      },
    });
  });
});
