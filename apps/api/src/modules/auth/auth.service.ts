import type { User } from '@supabase/supabase-js';
import type {
  AuthSession,
  LogoutResponse,
  RequestOtpInput,
  RequestOtpResponse,
  VerifyOtpInput,
  VerifyOtpResponse,
} from '@inyalink/shared';
import { config } from '../../lib/config.js';
import { AppError } from '../../middleware/errors.js';
import { getSupabaseAdmin } from '../../lib/supabase.js';
import * as repo from './auth.repo.js';

function displayNameFromUser(user: User): string {
  const meta = user.user_metadata ?? {};
  const fromMeta =
    (typeof meta['full_name'] === 'string' && meta['full_name']) ||
    (typeof meta['name'] === 'string' && meta['name']) ||
    (typeof meta['display_name'] === 'string' && meta['display_name']) ||
    '';
  if (fromMeta.trim()) return fromMeta.trim().slice(0, 80);
  if (user.email) {
    const local = user.email.split('@')[0] ?? '';
    if (local.trim()) return local.trim().slice(0, 80);
  }
  return 'Client';
}

function toSession(profile: repo.ProfileRow): AuthSession {
  return {
    userId: profile.id,
    role: profile.role,
    isAdmin: profile.isAdmin,
    displayName: profile.displayName,
    locale: profile.locale,
  };
}

function emailMatchesAdmin(email: string | undefined): boolean {
  if (!config.adminEmail || !email) return false;
  return email.trim().toLowerCase() === config.adminEmail;
}

/**
 * On first Google sign-in, create a profiles row with role `client`.
 * Subsequent calls return the existing profile.
 * If email matches ADMIN_EMAIL, promote to is_admin.
 */
export async function ensureClientProfile(user: User): Promise<AuthSession> {
  const existing = await repo.findProfileById(user.id);
  if (existing) {
    if (emailMatchesAdmin(user.email) && !existing.isAdmin) {
      return toSession(await repo.promoteToAdmin(user.id));
    }
    return toSession(existing);
  }

  const created = await repo.insertClientProfile({
    id: user.id,
    displayName: displayNameFromUser(user),
    locale: 'en',
  });

  if (emailMatchesAdmin(user.email)) {
    return toSession(await repo.promoteToAdmin(created.id));
  }

  return toSession(created);
}

export async function getSessionForUser(userId: string): Promise<AuthSession> {
  const profile = await repo.findProfileById(userId);
  if (!profile) {
    throw new AppError(404, 'PROFILE_NOT_FOUND', 'Profile not found');
  }
  return toSession(profile);
}

/**
 * Best-effort server-side sign-out. The browser also clears the Supabase session.
 */
export async function logout(userId: string): Promise<LogoutResponse> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.auth.admin.signOut(userId);
  } catch (err) {
    console.error('supabase signOut failed', err);
  }
  return { ok: true };
}

/**
 * TODO(post-hackathon): phone OTP via Supabase Auth + an SMS provider that
 * delivers reliably to Myanmar numbers. Not wired for the hackathon demo.
 */
export async function requestOtp(
  _input: RequestOtpInput,
): Promise<RequestOtpResponse> {
  throw new AppError(
    501,
    'OTP_NOT_IMPLEMENTED',
    'Phone sign-in is not available yet. Use Google.',
  );
}

/**
 * TODO(post-hackathon): verify SMS OTP once an SMS provider is configured.
 */
export async function verifyOtp(
  _input: VerifyOtpInput,
): Promise<VerifyOtpResponse> {
  throw new AppError(
    501,
    'OTP_NOT_IMPLEMENTED',
    'Phone sign-in is not available yet. Use Google.',
  );
}
