import { z } from 'zod';

/** App session profile (JWT lives in Supabase client; not duplicated here). */
export const AuthSessionSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['client', 'professional', 'admin']),
  /** Ops console gate — independent of product `role`. */
  isAdmin: z.boolean(),
  displayName: z.string().min(1).max(80),
  locale: z.enum(['my', 'en']),
});

export type AuthSession = z.infer<typeof AuthSessionSchema>;

export const AuthMeResponseSchema = z.object({
  session: AuthSessionSchema,
});

export type AuthMeResponse = z.infer<typeof AuthMeResponseSchema>;

export const LogoutResponseSchema = z.object({
  ok: z.literal(true),
});

export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;

/** Myanmar mobile: +959… or 09… — reserved for phone OTP (post-hackathon). */
export const MyanmarPhoneSchema = z
  .string()
  .trim()
  .min(8)
  .max(20)
  .refine(
    (v) => {
      const d = v.replace(/[\s-]/g, '');
      return (
        /^\+?959\d{7,10}$/.test(d) ||
        /^09\d{7,9}$/.test(d) ||
        /^9\d{7,9}$/.test(d)
      );
    },
    { message: 'Enter a Myanmar mobile number' },
  );

export type MyanmarPhone = z.infer<typeof MyanmarPhoneSchema>;

export const OtpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, { message: 'Enter the 6-digit code' });

export type OtpCode = z.infer<typeof OtpCodeSchema>;

/**
 * TODO(post-hackathon): phone OTP via Supabase Auth + SMS provider.
 * Delivery to Myanmar numbers needs a tested SMS gateway — skipped for now.
 */
export const RequestOtpInputSchema = z.object({
  phone: MyanmarPhoneSchema,
  intent: z.enum(['login', 'signup']).default('login'),
});

export type RequestOtpInput = z.infer<typeof RequestOtpInputSchema>;

export const RequestOtpResponseSchema = z.object({
  ok: z.literal(true),
  demoHint: z.string().max(80).optional(),
  expiresInSec: z.number().int().positive(),
});

export type RequestOtpResponse = z.infer<typeof RequestOtpResponseSchema>;

export const VerifyOtpInputSchema = z.object({
  phone: MyanmarPhoneSchema,
  code: OtpCodeSchema,
  intent: z.enum(['login', 'signup']).default('login'),
});

export type VerifyOtpInput = z.infer<typeof VerifyOtpInputSchema>;

export const VerifyOtpResponseSchema = z.object({
  session: AuthSessionSchema,
});

export type VerifyOtpResponse = z.infer<typeof VerifyOtpResponseSchema>;
