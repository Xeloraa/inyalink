import type { NextFunction, Request, Response } from 'express';
import { config } from '../lib/config.js';
import { AppError } from './errors.js';

function currentUtcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

let state = { day: currentUtcDay(), count: 0 };

/**
 * Circuit breaker on total /api/v1/ai/* requests per UTC day, across every
 * caller combined. middleware/rateLimit.ts's aiRateLimit bounds one
 * identity/IP; it can't stop many distinct callers from draining the Groq
 * quota together. This is the aggregate backstop — trips regardless of who
 * is asking once the whole API has made AI_DAILY_CALL_CAP requests today.
 *
 * In-memory, single instance — same constraint as rateLimit.ts's buckets.
 */
export function aiDailyCap(req: Request, _res: Response, next: NextFunction): void {
  const day = currentUtcDay();
  if (state.day !== day) {
    state = { day, count: 0 };
  }

  if (state.count >= config.aiDailyCallCap) {
    next(
      new AppError(
        429,
        'AI_DAILY_CAP_REACHED',
        'Daily AI usage limit reached. Please try again tomorrow.',
      ),
    );
    return;
  }

  state.count += 1;
  next();
}

/** Test helper — resets the shared counter between cases. */
export function resetAiDailyCap(): void {
  state = { day: currentUtcDay(), count: 0 };
}
