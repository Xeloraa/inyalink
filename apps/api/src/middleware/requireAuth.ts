import type { NextFunction, Request, Response } from 'express';
import type { AuthSession } from '@inyalink/shared';
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

/**
 * Verifies the Supabase JWT, ensures a profiles row exists (role client on
 * first sign-in), and attaches `req.auth`.
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

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Invalid or expired session');
    }

    const session = await authService.ensureClientProfile(data.user);
    (req as AuthedRequest).auth = session;
    next();
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
