import type { NextFunction, Request, Response } from 'express';
import type { AuthSession } from '@inyalink/shared';
import { AppError } from './errors.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export type RateLimitOptions = {
  /** Unique bucket name (e.g. brief-create, ai, message-send). */
  keyPrefix: string;
  /** Sliding window length in milliseconds. */
  windowMs: number;
  /** Max requests per key within the window. */
  max: number;
  /**
   * Optional second, longer ceiling on top of the burst window — e.g. a
   * per-key daily cap so a caller sitting just under `max` every window
   * can't sustain that indefinitely. Checked over a rolling 24h.
   */
  dailyMax?: number;
};

type Bucket = {
  timestamps: number[];
};

/** In-memory sliding-window store. Fine for a single API instance. */
const buckets = new Map<string, Bucket>();

type OptionallyAuthedRequest = Request & { auth?: AuthSession };

/**
 * Key by the identity a session middleware already validated — a real
 * Supabase user, or an explicitly-recognised demo identity (see
 * attachSession / attachOptionalSession in middleware/requireAuth.ts).
 *
 * Deliberately never reads X-Demo-User-Id (or any other client-supplied
 * identity header) directly: doing so let a caller mint an unlimited number
 * of fresh buckets simply by changing the header value per request. Routers
 * that never attach a session (e.g. auth.routes.ts's pre-login OTP
 * endpoints) have no req.auth to key off, so those fall back to the raw
 * bearer text, then to IP — same as before.
 */
function clientKey(req: Request): string {
  const auth = (req as OptionallyAuthedRequest).auth;
  if (auth?.userId) return `user:${auth.userId}`;

  const bearer = req.headers.authorization?.trim() ?? '';
  if (bearer.length > 0) return `auth:${bearer.slice(0, 48)}`;

  const ip =
    req.ip ||
    (typeof req.socket?.remoteAddress === 'string'
      ? req.socket.remoteAddress
      : '') ||
    'unknown';
  return `ip:${ip}`;
}

function pruneBefore(bucket: Bucket, cutoff: number): void {
  let i = 0;
  while (i < bucket.timestamps.length && bucket.timestamps[i]! <= cutoff) {
    i += 1;
  }
  if (i > 0) bucket.timestamps.splice(0, i);
}

/** Count entries after `cutoff`. Timestamps are append-order, so ascending. */
function countSince(bucket: Bucket, cutoff: number): number {
  let count = 0;
  for (let i = bucket.timestamps.length - 1; i >= 0; i -= 1) {
    if (bucket.timestamps[i]! <= cutoff) break;
    count += 1;
  }
  return count;
}

/**
 * Sliding-window rate limiter. Returns 429 RATE_LIMITED when exceeded.
 * No external dependency — keeps the API bundle small for Myanmar 3G.
 */
export function rateLimit(options: RateLimitOptions) {
  const { keyPrefix, windowMs, max, dailyMax } = options;
  const retentionMs =
    dailyMax !== undefined ? Math.max(windowMs, DAY_MS) : windowMs;

  return (req: Request, _res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = `${keyPrefix}:${clientKey(req)}`;

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { timestamps: [] };
      buckets.set(key, bucket);
    }

    pruneBefore(bucket, now - retentionMs);

    if (countSince(bucket, now - windowMs) >= max) {
      next(
        new AppError(
          429,
          'RATE_LIMITED',
          'Too many requests. Please wait a moment and try again.',
        ),
      );
      return;
    }

    if (dailyMax !== undefined && countSince(bucket, now - DAY_MS) >= dailyMax) {
      next(
        new AppError(
          429,
          'RATE_LIMITED',
          "You've reached today's limit. Please try again tomorrow.",
        ),
      );
      return;
    }

    bucket.timestamps.push(now);
    next();
  };
}

/** Test helper — clears all buckets between cases. */
export function resetRateLimitBuckets(): void {
  buckets.clear();
}

/** Shared limiters for expensive / abuse-prone write paths. */
export const briefCreateRateLimit = rateLimit({
  keyPrefix: 'brief-create',
  windowMs: 60 * 60 * 1000,
  max: 20,
});

/**
 * 40/15min guards bursts; 150/day guards a slow drip that stays under the
 * burst window all day and would otherwise run up Groq usage unnoticed.
 */
export const aiRateLimit = rateLimit({
  keyPrefix: 'ai',
  windowMs: 15 * 60 * 1000,
  max: 40,
  dailyMax: 150,
});

export const messageSendRateLimit = rateLimit({
  keyPrefix: 'message-send',
  windowMs: 15 * 60 * 1000,
  max: 60,
});

/** OTP request costs real SMS money and can be used to spam a phone number. */
export const otpRequestRateLimit = rateLimit({
  keyPrefix: 'otp-request',
  windowMs: 15 * 60 * 1000,
  max: 5,
});

/** OTP verify is a brute-force target for guessing the code. */
export const otpVerifyRateLimit = rateLimit({
  keyPrefix: 'otp-verify',
  windowMs: 15 * 60 * 1000,
  max: 10,
});
