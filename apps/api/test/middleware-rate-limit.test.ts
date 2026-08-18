import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../src/middleware/errors.js';
import {
  rateLimit,
  resetRateLimitBuckets,
} from '../src/middleware/rateLimit.js';

type AuthedRequest = Request & { auth?: { userId: string } };

function mockReq(overrides: Partial<AuthedRequest> = {}): Request {
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

  it('keys by req.auth.userId when a session middleware already set it, ignoring raw headers', async () => {
    const mw = rateLimit({ keyPrefix: 't', windowMs: 60_000, max: 1 });

    // Same X-Demo-User-Id and same Authorization header on both requests,
    // but different resolved identities — must land in different buckets.
    expect(
      await run(
        mw,
        mockReq({
          headers: { authorization: 'Bearer x', 'x-demo-user-id': 'irrelevant' },
          auth: { userId: 'user-a' },
        }),
      ),
    ).toBeUndefined();
    expect(
      await run(
        mw,
        mockReq({
          headers: { authorization: 'Bearer x', 'x-demo-user-id': 'irrelevant' },
          auth: { userId: 'user-b' },
        }),
      ),
    ).toBeUndefined();
  });

  it('does not trust a raw X-Demo-User-Id header for keying — rotating it does not create fresh buckets', async () => {
    const mw = rateLimit({ keyPrefix: 't', windowMs: 60_000, max: 2 });

    // No req.auth (no session middleware ran) and no Authorization header:
    // every request here falls back to the same IP bucket regardless of
    // what X-Demo-User-Id claims, unlike the old raw-header-trusting keying.
    expect(
      await run(mw, mockReq({ headers: { 'x-demo-user-id': 'attacker-1' } })),
    ).toBeUndefined();
    expect(
      await run(mw, mockReq({ headers: { 'x-demo-user-id': 'attacker-2' } })),
    ).toBeUndefined();
    const err = await run(
      mw,
      mockReq({ headers: { 'x-demo-user-id': 'attacker-3' } }),
    );
    expect(err).toMatchObject({ code: 'RATE_LIMITED' });
  });

  it('applies a daily cap on top of the burst window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-09T00:00:00Z'));

    // Burst window is generous (1/sec); daily cap of 3 is the real limit.
    const mw = rateLimit({
      keyPrefix: 't',
      windowMs: 1_000,
      max: 1,
      dailyMax: 3,
    });
    const req = mockReq({ headers: { authorization: 'Bearer daily' } });

    for (let i = 0; i < 3; i += 1) {
      expect(await run(mw, req)).toBeUndefined();
      vi.advanceTimersByTime(2_000); // clear the burst window each time
    }

    const err = await run(mw, req);
    expect(err).toMatchObject({ statusCode: 429, code: 'RATE_LIMITED' });
  });

  it('resets the daily cap after 24 hours', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-09T00:00:00Z'));

    const mw = rateLimit({
      keyPrefix: 't',
      windowMs: 1_000,
      max: 1,
      dailyMax: 1,
    });
    const req = mockReq({ headers: { authorization: 'Bearer daily-reset' } });

    expect(await run(mw, req)).toBeUndefined();
    expect(await run(mw, req)).toMatchObject({ code: 'RATE_LIMITED' });

    vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);
    expect(await run(mw, req)).toBeUndefined();
  });
});
