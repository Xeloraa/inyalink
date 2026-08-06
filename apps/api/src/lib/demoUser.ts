import type { NextFunction, Request, Response } from 'express';
import type { AuthSession } from '@inyalink/shared';
import { config } from './config.js';

/**
 * Hackathon mode: Google sign-in is parked, so every request acts as a
 * seeded demo user. Default is the demo client. When DEMO_MODE is on,
 * pass `X-Demo-User-Id` to act as a seeded professional (for /app/briefs).
 *
 * To re-enable real auth, swap routers back to `middleware/requireAuth.js`.
 */

export const DEMO_CLIENT_ID = 'b0000000-0000-4000-8000-000000000001';
export const DEMO_PRO_ID = 'a0000000-0000-4000-8000-000000000001';

const DEMO_USERS: Record<
  string,
  { role: AuthSession['role']; displayName: string; locale: 'my' | 'en' }
> = {
  [DEMO_CLIENT_ID]: {
    role: 'client',
    displayName: 'Demo Client 01',
    locale: 'my',
  },
  [DEMO_PRO_ID]: {
    role: 'professional',
    displayName: 'မင်းထက် · Min Thet',
    locale: 'my',
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

export const DEMO_SESSION: AuthSession = {
  userId: DEMO_CLIENT_ID,
  role: 'client',
  displayName: 'Demo Client 01',
  locale: 'my',
};

type DemoAuthedRequest = Request & { auth: AuthSession };

function resolveDemoSession(req: Request): AuthSession {
  if (!config.demoMode) return DEMO_SESSION;
  const header = req.header('x-demo-user-id')?.trim();
  if (!header || !DEMO_USERS[header]) return DEMO_SESSION;
  const meta = DEMO_USERS[header]!;
  return {
    userId: header,
    role: meta.role,
    displayName: meta.displayName,
    locale: meta.locale,
  };
}

/** Drop-in stand-in for requireAuth: attaches the demo session, never 401s. */
export function demoAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  (req as DemoAuthedRequest).auth = resolveDemoSession(req);
  next();
}

export function getAuth(req: Request): AuthSession {
  return (req as DemoAuthedRequest).auth ?? DEMO_SESSION;
}
