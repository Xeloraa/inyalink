/** sessionStorage key for post-OAuth return path (RequireAuth → login → Google). */
export const AUTH_RETURN_TO_KEY = 'inyalink.authReturnTo';

export function rememberAuthReturnTo(path: string | null | undefined): void {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return;
  if (path.startsWith('/login') || path.startsWith('/signup') || path.startsWith('/auth/')) {
    return;
  }
  try {
    sessionStorage.setItem(AUTH_RETURN_TO_KEY, path);
  } catch {
    /* private mode / quota */
  }
}

export function takeAuthReturnTo(fallback = '/browse'): string {
  try {
    const stored = sessionStorage.getItem(AUTH_RETURN_TO_KEY);
    sessionStorage.removeItem(AUTH_RETURN_TO_KEY);
    if (
      stored &&
      stored.startsWith('/') &&
      !stored.startsWith('//') &&
      !stored.startsWith('/login') &&
      !stored.startsWith('/signup') &&
      !stored.startsWith('/auth/')
    ) {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return fallback;
}
