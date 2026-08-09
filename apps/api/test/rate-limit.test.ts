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

  it('parses Groq body hint and caps at 4s', () => {
    const res = new Response('');
    expect(
      parseRateLimitBackoffMs(
        res,
        'Please try again in 8.317499999s. Need more tokens?',
      ),
    ).toBe(4_000);
    expect(parseRateLimitBackoffMs(res, 'try again in 30s')).toBe(4_000);
  });

  it('uses exponential default by attempt', () => {
    const res = new Response('');
    expect(parseRateLimitBackoffMs(res, '', 0)).toBe(1_500);
    expect(parseRateLimitBackoffMs(res, '', 1)).toBe(3_000);
    expect(parseRateLimitBackoffMs(res, '', 2)).toBe(4_000);
  });
});

describe('rate limit handling', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('retries multiple times on 429 then returns AI_RATE_LIMIT', async () => {
    vi.useFakeTimers();
    const limited = () =>
      new Response(
        JSON.stringify({
          error: { message: 'Please try again in 1s.' },
        }),
        { status: 429, headers: { 'retry-after': '1' } },
      );

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(limited())
      .mockResolvedValueOnce(limited())
      .mockResolvedValueOnce(limited());

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

    await vi.advanceTimersByTimeAsync(10_000);
    const result = await pending;

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result).toEqual({
      ok: false,
      error: {
        code: 'AI_RATE_LIMIT',
        message: 'The AI service is busy. Please try again shortly.',
      },
    });
  });
});
