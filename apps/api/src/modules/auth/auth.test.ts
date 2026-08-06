import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
import * as repo from './auth.repo.js';
import * as authService from './auth.service.js';

vi.mock('./auth.repo.js', () => ({
  findProfileById: vi.fn(),
  insertClientProfile: vi.fn(),
}));

vi.mock('../../lib/supabase.js', () => ({
  getSupabaseAdmin: () => ({
    auth: {
      admin: {
        signOut: vi.fn(async () => undefined),
      },
    },
  }),
}));

function googleUser(partial: Partial<User> = {}): User {
  return {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    app_metadata: {},
    user_metadata: { full_name: 'Min Thet' },
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00.000Z',
    ...partial,
  } as User;
}

describe('auth.service', () => {
  beforeEach(() => {
    vi.mocked(repo.findProfileById).mockReset();
    vi.mocked(repo.insertClientProfile).mockReset();
  });

  it('returns an existing profile on subsequent Google sign-ins', async () => {
    vi.mocked(repo.findProfileById).mockResolvedValue({
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      displayName: 'Min Thet',
      role: 'client',
      locale: 'my',
    });

    const session = await authService.ensureClientProfile(googleUser());
    expect(session.userId).toBe('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
    expect(session.role).toBe('client');
    expect(repo.insertClientProfile).not.toHaveBeenCalled();
  });

  it('creates a client profile on first Google sign-in', async () => {
    vi.mocked(repo.findProfileById).mockResolvedValue(null);
    vi.mocked(repo.insertClientProfile).mockResolvedValue({
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      displayName: 'Min Thet',
      role: 'client',
      locale: 'my',
    });

    const session = await authService.ensureClientProfile(googleUser());
    expect(repo.insertClientProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        displayName: 'Min Thet',
        locale: 'my',
      }),
    );
    expect(session.role).toBe('client');
  });

  it('rejects phone OTP until SMS is wired', async () => {
    await expect(
      authService.requestOtp({ phone: '0912345678', intent: 'login' }),
    ).rejects.toMatchObject({ code: 'OTP_NOT_IMPLEMENTED', statusCode: 501 });
  });
});
