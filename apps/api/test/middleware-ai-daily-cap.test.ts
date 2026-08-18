import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

const configMock = vi.hoisted(() => ({ aiDailyCallCap: 3 }));
vi.mock('../src/lib/config.js', () => ({ config: configMock }));

import { aiDailyCap, resetAiDailyCap } from '../src/middleware/aiDailyCap.js';

function run(): Promise<unknown> {
  return new Promise((resolve) => {
    aiDailyCap({} as Request, {} as Response, ((err?: unknown) =>
      resolve(err)) as NextFunction);
  });
}

describe('aiDailyCap', () => {
  afterEach(() => {
    configMock.aiDailyCallCap = 3;
    resetAiDailyCap();
  });

  it('allows requests under the global daily cap', async () => {
    expect(await run()).toBeUndefined();
    expect(await run()).toBeUndefined();
    expect(await run()).toBeUndefined();
  });

  it('trips for every caller once the aggregate cap is reached, regardless of identity', async () => {
    await run();
    await run();
    await run();
    const err = await run();
    expect(err).toMatchObject({ statusCode: 429, code: 'AI_DAILY_CAP_REACHED' });
  });

  it('counts across different callers, not per-key', async () => {
    // Three different "callers" (this middleware takes no identity input at
    // all) still share one counter — that's the point of a global breaker.
    await run();
    await run();
    await run();
    const err = await run();
    expect(err).toMatchObject({ code: 'AI_DAILY_CAP_REACHED' });
  });
});
