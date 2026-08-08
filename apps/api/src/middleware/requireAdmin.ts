import type { NextFunction, Request, Response } from 'express';
import { AppError } from './errors.js';
import { getAuth, requireAuth } from './requireAuth.js';

/**
 * requireAuth then 403 unless session.isAdmin.
 * Use on the entire /admin router.
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  void requireAuth(req, res, (err?: unknown) => {
    if (err) {
      next(err);
      return;
    }
    try {
      const auth = getAuth(req);
      if (!auth.isAdmin) {
        next(new AppError(403, 'FORBIDDEN', 'Admin access required'));
        return;
      }
      next();
    } catch (e) {
      next(e);
    }
  });
}
