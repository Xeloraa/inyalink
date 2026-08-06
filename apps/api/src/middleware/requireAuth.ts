import type { NextFunction, Request, Response } from 'express';
import type { AuthSession } from '@inyalink/shared';
import { config } from '../lib/config.js';
import { resolveDemoSession } from '../lib/demoUser.js';
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
 * Prefer a real Bearer session. If absent and DEMO_MODE is on, attach the
 * demo session (optional `X-Demo-User-Id`).
 *
 * Invalid Bearer: hard-fail when DEMO_MODE is off; under DEMO_MODE ignore the
 * bad token and fall back to demo so a stale client header cannot take down
 * otherwise-anonymous flows on routers that use this middleware.
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
        if (!config.demoMode) {
          next(err);
          return;
        }
        // Stale Bearer while DEMO_MODE is on → demo identity, not 401.
      }
    }
    if (config.demoMode) {
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
