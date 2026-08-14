/**
 * CORS_ORIGIN helpers — comma-separated allowlist, optional surrounding quotes,
 * plus https://*.vercel.app for preview deploys.
 */

export type CorsAllowlist = '*' | string[];

/**
 * Parse CORS_ORIGIN env into '*' or a trimmed origin list.
 * Unset/empty defaults to [] (deny, aside from the *.vercel.app preview
 * allowance in isOriginAllowed) — a blank env var must never silently
 * widen to allow every origin. '*' only applies if explicitly set.
 */
export function parseCorsOrigins(raw: string | undefined): CorsAllowlist {
  let value = (raw ?? '').trim();
  if (!value) return [];
  if (value === '*') return '*';

  // Env UIs often persist the whole CSV wrapped in double quotes.
  if (value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1).trim();
  }
  if (!value) return [];
  if (value === '*') return '*';

  const origins = value
    .split(',')
    .map((part) => stripWrappingQuotes(part.trim()).trim())
    .filter((part) => part.length > 0);

  return origins;
}

function stripWrappingQuotes(s: string): string {
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1);
  }
  return s;
}

/** True when origin is on the allowlist or is an https://*.vercel.app host. */
export function isOriginAllowed(
  origin: string | undefined,
  allowlist: CorsAllowlist,
): boolean {
  if (!origin) return false;
  if (allowlist === '*') return true;
  if (allowlist.includes(origin)) return true;
  return isVercelPreviewOrigin(origin);
}

export function isVercelPreviewOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      url.protocol === 'https:' &&
      (url.hostname === 'vercel.app' || url.hostname.endsWith('.vercel.app'))
    );
  } catch {
    return false;
  }
}
