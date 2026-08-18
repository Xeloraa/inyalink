import type { NextFunction, Request, Response } from 'express';
import type { AuthSession } from '@inyalink/shared';
import { config } from './config.js';

/**
 * Demo sessions for local/scripts and DEMO_SHARED_USER when no Bearer token
 * is present. Real Google sign-in always wins via `attachSession` /
 * `requireAuth` in middleware/requireAuth.ts.
 */

export const DEMO_CLIENT_ID = 'b0000000-0000-4000-8000-000000000001';
export const DEMO_PRO_ID = 'a0000000-0000-4000-8000-000000000001';
export const DEMO_ADMIN_ID = 'c0000000-0000-4000-8000-000000000001';

const DEMO_USERS: Record<
  string,
  {
    role: AuthSession['role'];
    displayName: string;
    locale: 'my' | 'en';
  }
> = {
  [DEMO_CLIENT_ID]: {
    role: 'client',
    displayName: 'Demo Client 01',
    locale: 'en',
  },
  [DEMO_PRO_ID]: {
    role: 'professional',
    displayName: 'မင်းထက် · Min Thet',
    locale: 'my',
  },
  [DEMO_ADMIN_ID]: {
    role: 'admin',
    displayName: 'Demo Admin',
    locale: 'en',
  },
  'a0000000-0000-4000-8000-000000000002': {
    role: 'professional',
    displayName: 'သူဇာ · Su Zar',
    locale: 'my',
  },
  'a0000000-0000-4000-8000-000000000003': {
    role: 'professional',
    displayName: 'နေလင်း · Nay Lin',
    locale: 'my',
  },
  'a0000000-0000-4000-8000-000000000004': {
    role: 'professional',
    displayName: 'ခိုင်ဇော် · Khine Zaw',
    locale: 'my',
  },
};

function toDemoSession(
  userId: string,
  meta: { role: AuthSession['role']; displayName: string; locale: 'my' | 'en' },
): AuthSession {
  return {
    userId,
    role: meta.role,
    isAdmin: meta.role === 'admin',
    displayName: meta.displayName,
    locale: meta.locale,
  };
}

export const DEMO_SESSION: AuthSession = toDemoSession(DEMO_CLIENT_ID, {
  role: 'client',
  displayName: 'Demo Client 01',
  locale: 'en',
});

/** Resolve demo identity from optional `X-Demo-User-Id` when DEMO_SHARED_USER is on. */
export function resolveDemoSession(req: Request): AuthSession {
  if (!config.demoSharedUser) return DEMO_SESSION;
  const header = req.header('x-demo-user-id')?.trim();
  if (!header || !DEMO_USERS[header]) return DEMO_SESSION;
  return toDemoSession(header, DEMO_USERS[header]!);
}

/**
 * Like `resolveDemoSession`, but only ever returns an identity the caller
 * explicitly and correctly asked for — an unset or unrecognised header
 * yields `null` instead of silently falling back to the shared demo client.
 *
 * Used where "no identity" must stay a distinct, first-class outcome (the
 * AI endpoints' anonymous path via `attachOptionalSession`, and rate-limit
 * keying) rather than being folded into one shared bucket that every real
 * anonymous visitor would otherwise collide into.
 */
export function resolveExplicitDemoSession(req: Request): AuthSession | null {
  if (!config.demoSharedUser) return null;
  const header = req.header('x-demo-user-id')?.trim();
  if (!header || !DEMO_USERS[header]) return null;
  return toDemoSession(header, DEMO_USERS[header]!);
}

/**
 * @deprecated Prefer `attachSession` from middleware/requireAuth.js.
 * Kept for scripts that import demoAuth directly.
 */
export function demoAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  (req as Request & { auth: AuthSession }).auth = resolveDemoSession(req);
  next();
}
