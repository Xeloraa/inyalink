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

async function attachSupabaseUser(
  req: Request,
  token: string,
): Promise<AuthSession> {
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
    (req as AuthedRequest).auth = await attachSupabaseUser(req, token);
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Prefer a real Bearer session. If absent and DEMO_MODE is on, attach the
 * demo session (optional `X-Demo-User-Id`). Never use demo when a Bearer
 * token is present — invalid tokens 401 instead of falling through.
 */
export async function attachSession(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = bearerToken(req);
    if (token) {
      (req as AuthedRequest).auth = await attachSupabaseUser(req, token);
      next();
      return;
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
