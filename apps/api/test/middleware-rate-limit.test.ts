import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../src/middleware/errors.js';
import {
  rateLimit,
  resetRateLimitBuckets,
} from '../src/middleware/rateLimit.js';

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides,
  } as Request;
}

function run(
  mw: (req: Request, res: Response, next: NextFunction) => void,
  req: Request,
): Promise<unknown> {
  return new Promise((resolve) => {
    mw(req, {} as Response, (err?: unknown) => resolve(err));
  });
}

describe('rateLimit middleware', () => {
  afterEach(() => {
    resetRateLimitBuckets();
    vi.useRealTimers();
  });

  it('allows requests under the max', async () => {
    const mw = rateLimit({ keyPrefix: 't', windowMs: 60_000, max: 3 });
    const req = mockReq();

    expect(await run(mw, req)).toBeUndefined();
    expect(await run(mw, req)).toBeUndefined();
    expect(await run(mw, req)).toBeUndefined();
  });

  it('returns 429 RATE_LIMITED when max is exceeded', async () => {
    const mw = rateLimit({ keyPrefix: 't', windowMs: 60_000, max: 2 });
    const req = mockReq({
      headers: { authorization: 'Bearer user-a' },
    });

    expect(await run(mw, req)).toBeUndefined();
    expect(await run(mw, req)).toBeUndefined();

    const err = await run(mw, req);
    expect(err).toBeInstanceOf(AppError);
    expect(err).toMatchObject({
      statusCode: 429,
      code: 'RATE_LIMITED',
    });
  });

  it('isolates buckets by client key', async () => {
    const mw = rateLimit({ keyPrefix: 't', windowMs: 60_000, max: 1 });

    expect(
      await run(mw, mockReq({ headers: { authorization: 'Bearer a' } })),
    ).toBeUndefined();
    expect(
      await run(mw, mockReq({ headers: { authorization: 'Bearer b' } })),
    ).toBeUndefined();

    const err = await run(
      mw,
      mockReq({ headers: { authorization: 'Bearer a' } }),
    );
    expect(err).toMatchObject({ code: 'RATE_LIMITED' });
  });

  it('slides the window so older hits expire', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-09T12:00:00Z'));

    const mw = rateLimit({ keyPrefix: 't', windowMs: 10_000, max: 1 });
    const req = mockReq({ headers: { authorization: 'Bearer slide' } });

    expect(await run(mw, req)).toBeUndefined();
    expect(await run(mw, req)).toMatchObject({ code: 'RATE_LIMITED' });

    vi.advanceTimersByTime(10_001);
    expect(await run(mw, req)).toBeUndefined();
  });
});
