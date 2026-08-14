import type { NextFunction, Request, Response } from 'express';
import { AppError } from './errors.js';

export type RateLimitOptions = {
  /** Unique bucket name (e.g. brief-create, ai, message-send). */
  keyPrefix: string;
  /** Sliding window length in milliseconds. */
  windowMs: number;
  /** Max requests per key within the window. */
  max: number;
};

type Bucket = {
  timestamps: number[];
};

/** In-memory sliding-window store. Fine for a single API instance. */
const buckets = new Map<string, Bucket>();

function clientKey(req: Request): string {
  const auth = req.headers.authorization?.trim() ?? '';
  const demoHeader = req.headers['x-demo-user-id'];
  const demo =
    typeof demoHeader === 'string'
      ? demoHeader
      : Array.isArray(demoHeader)
        ? (demoHeader[0] ?? '')
        : '';
  const ip =
    req.ip ||
    (typeof req.socket?.remoteAddress === 'string'
      ? req.socket.remoteAddress
      : '') ||
    'unknown';
  // Prefer identity material when present; fall back to IP.
  if (auth.length > 0) return `auth:${auth.slice(0, 48)}`;
  if (demo.length > 0) return `demo:${demo}`;
  return `ip:${ip}`;
}

function prune(bucket: Bucket, cutoff: number): void {
  let i = 0;
  while (i < bucket.timestamps.length && bucket.timestamps[i]! <= cutoff) {
    i += 1;
  }
  if (i > 0) bucket.timestamps.splice(0, i);
}

/**
 * Sliding-window rate limiter. Returns 429 RATE_LIMITED when exceeded.
 * No external dependency — keeps the API bundle small for Myanmar 3G.
 */
export function rateLimit(options: RateLimitOptions) {
  const { keyPrefix, windowMs, max } = options;

  return (req: Request, _res: Response, next: NextFunction): void => {
    const now = Date.now();
    const cutoff = now - windowMs;
    const key = `${keyPrefix}:${clientKey(req)}`;

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { timestamps: [] };
      buckets.set(key, bucket);
    }

    prune(bucket, cutoff);

    if (bucket.timestamps.length >= max) {
      next(
        new AppError(
          429,
          'RATE_LIMITED',
          'Too many requests. Please wait a moment and try again.',
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

export const aiRateLimit = rateLimit({
  keyPrefix: 'ai',
  windowMs: 15 * 60 * 1000,
  max: 40,
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
