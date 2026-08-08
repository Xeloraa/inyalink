import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { AppError } from './errors.js';

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path = issue?.path?.length ? `${issue.path.join('.')}: ` : '';
      next(
        new AppError(
          400,
          'VALIDATION_ERROR',
          `${path}${issue?.message ?? 'Invalid request body'}`,
        ),
      );
      return;
    }
    req.body = parsed.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      next(
        new AppError(
          400,
          'VALIDATION_ERROR',
          parsed.error.issues[0]?.message ?? 'Invalid query parameters',
        ),
      );
      return;
    }
    // Express types query as ParsedQs; validated payload is what handlers read.
    Object.assign(req.query, parsed.data);
    next();
  };
}
