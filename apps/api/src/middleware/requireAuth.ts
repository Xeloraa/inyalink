import type { NextFunction, Request, Response } from 'express';
import type { AuthSession } from '@inyalink/shared';
import { config } from '../lib/config.js';
import { resolveDemoSession, resolveExplicitDemoSession } from '../lib/demoUser.js';
import { getSupabaseAdmin } from '../lib/supabase.js';
import * as authService from '../modules/auth/auth.service.js';
import { AppError } from './errors.js';

export type AuthedRequest = Request & {
  auth: AuthSession;
};

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
}

async function attachSupabaseUser(token: string): Promise<AuthSession> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Invalid or expired session');
  }
  return authService.ensureClientProfile(data.user);
}

/**
 * Verifies the Supabase JWT, ensures a profiles row exists (role client on
 * first sign-in), and attaches `req.auth`. No demo fallback.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = bearerToken(req);
    if (!token) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Sign in required');
    }
    (req as AuthedRequest).auth = await attachSupabaseUser(token);
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Prefer a real Bearer session. If absent and DEMO_SHARED_USER is on, attach
 * the demo session (optional `X-Demo-User-Id`).
 *
 * Invalid Bearer: hard-fail when DEMO_SHARED_USER is off; under
 * DEMO_SHARED_USER ignore the bad token and fall back to demo so a stale
 * client header cannot take down otherwise-anonymous flows on routers that
 * use this middleware.
 *
 * Public directory GETs must NOT use this middleware — see professionals.routes.
 */
export async function attachSession(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = bearerToken(req);
    if (token) {
      try {
        (req as AuthedRequest).auth = await attachSupabaseUser(token);
        next();
        return;
      } catch (err) {
        if (!config.demoSharedUser) {
          next(err);
          return;
        }
        // Stale Bearer while DEMO_SHARED_USER is on → demo identity, not 401.
      }
    }
    if (config.demoSharedUser) {
      (req as AuthedRequest).auth = resolveDemoSession(req);
      next();
      return;
    }
    throw new AppError(401, 'UNAUTHENTICATED', 'Sign in required');
  } catch (err) {
    next(err);
  }
}

export function getAuth(req: Request): AuthSession {
  const auth = (req as AuthedRequest).auth;
  if (!auth) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Sign in required');
  }
  return auth;
}

/** Like `getAuth`, but returns `null` instead of throwing when anonymous. */
export function getOptionalAuth(req: Request): AuthSession | null {
  return (req as AuthedRequest).auth ?? null;
}

/**
 * Like `attachSession`, but never 401s: a caller with no real session (or
 * an invalid/expired one) proceeds anonymously — no `req.auth` at all —
 * instead of being rejected. Anonymous is a legitimate, first-class outcome
 * here, unconditionally, regardless of DEMO_SHARED_USER or any other demo
 * flag: describing a problem and getting a roadmap/matches must work with
 * no account, in every environment.
 *
 * An explicit, recognised `X-Demo-User-Id` still resolves to that identity
 * when DEMO_SHARED_USER is on (useful for testing "as professional X"), but
 * this is additive only — it can never block anonymous access. And unlike
 * `attachSession`, there is no shared-default fallback for a missing or
 * unrecognised header: every genuine anonymous caller (the normal case —
 * real visitors never send that header) stays anonymous rather than
 * colliding into one shared identity.
 *
 * Only for routes that work with or without an identity and that never call
 * `getAuth` unconditionally (see modules/ai/ai.routes.ts). Everywhere else,
 * use `attachSession` / `requireAuth` so ownership-bound resources keep
 * requiring a real identity.
 */
export async function attachOptionalSession(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = bearerToken(req);
    if (token) {
      try {
        (req as AuthedRequest).auth = await attachSupabaseUser(token);
        next();
        return;
      } catch {
        // Invalid/expired token: this router always has a valid anonymous
        // fallback, so just drop it and continue — never gated behind a
        // demo flag here, unlike attachSession.
      }
    }
    const demo = resolveExplicitDemoSession(req);
    if (demo) {
      (req as AuthedRequest).auth = demo;
    }
    next();
  } catch (err) {
    next(err);
  }
}
