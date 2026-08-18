import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { DEMO_ADMIN_ID } from '../src/lib/demoUser.js';

const getUserMock = vi.fn();

vi.mock('../src/lib/supabase.js', () => ({
  getSupabaseAdmin: () => ({ auth: { getUser: getUserMock } }),
}));

vi.mock('../src/modules/auth/auth.service.js', () => ({
  ensureClientProfile: vi.fn(async (user: { id: string }) => ({
    userId: user.id,
    role: 'client',
    isAdmin: false,
    displayName: 'Real User',
    locale: 'en',
  })),
}));

const configMock = vi.hoisted(() => ({ demoSharedUser: false }));
vi.mock('../src/lib/config.js', () => ({ config: configMock }));

import { attachOptionalSession } from '../src/middleware/requireAuth.js';

type AuthedRequest = Request & { auth?: unknown };

function mockReq(headers: Record<string, string> = {}): AuthedRequest {
  return {
    headers,
    header: (name: string) => headers[name.toLowerCase()],
  } as unknown as AuthedRequest;
}

function run(req: AuthedRequest): Promise<unknown> {
  return new Promise((resolve) => {
    attachOptionalSession(req, {} as Response, ((err?: unknown) =>
      resolve(err)) as NextFunction);
  });
}

describe('attachOptionalSession', () => {
  afterEach(() => {
    configMock.demoSharedUser = false;
    getUserMock.mockReset();
  });

  it('proceeds with no req.auth when anonymous, regardless of DEMO_SHARED_USER', async () => {
    const anonOff = mockReq();
    expect(await run(anonOff)).toBeUndefined();
    expect(anonOff.auth).toBeUndefined();

    configMock.demoSharedUser = true;
    const anonOn = mockReq();
    expect(await run(anonOn)).toBeUndefined();
    expect(anonOn.auth).toBeUndefined();
  });

  it('ignores X-Demo-User-Id entirely when DEMO_SHARED_USER is off', async () => {
    const req = mockReq({ 'x-demo-user-id': DEMO_ADMIN_ID });
    expect(await run(req)).toBeUndefined();
    expect(req.auth).toBeUndefined();
  });

  it('proceeds with no req.auth for an unrecognised X-Demo-User-Id even when DEMO_SHARED_USER is on (no shared-default fallback)', async () => {
    configMock.demoSharedUser = true;
    const req = mockReq({ 'x-demo-user-id': 'not-a-real-seed-id' });
    expect(await run(req)).toBeUndefined();
    expect(req.auth).toBeUndefined();
  });

  it('honours an explicit, recognised X-Demo-User-Id when DEMO_SHARED_USER is on', async () => {
    configMock.demoSharedUser = true;
    const req = mockReq({ 'x-demo-user-id': DEMO_ADMIN_ID });
    expect(await run(req)).toBeUndefined();
    expect(req.auth).toMatchObject({ userId: DEMO_ADMIN_ID, role: 'admin' });
  });

  it('uses a valid Bearer token regardless of DEMO_SHARED_USER', async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: 'real-user-id' } },
      error: null,
    });
    const req = mockReq({ authorization: 'Bearer good-token' });
    expect(await run(req)).toBeUndefined();
    expect(req.auth).toMatchObject({ userId: 'real-user-id' });
  });

  it('drops an invalid Bearer token and proceeds anonymously — never 401s, unlike attachSession', async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: new Error('bad'),
    });
    const req = mockReq({ authorization: 'Bearer stale-token' });
    expect(await run(req)).toBeUndefined();
    expect(req.auth).toBeUndefined();
  });
});
