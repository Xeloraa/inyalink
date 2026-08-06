const DEFAULT_TIMEOUT_MS = 20_000;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

type ApiErrorBody = {
  error?: { code?: string; message?: string };
};

let accessTokenGetter: () => string | null = () => null;

/** Register a getter for the current Supabase access token (Bearer). */
export function setAccessTokenGetter(getter: () => string | null): void {
  accessTokenGetter = getter;
}

/**
 * Production: absolute API origin from VITE_API_URL (baked in at build time).
 * Dev: empty → relative `/api/...` so Vite's proxy to :3001 still works.
 */
export function apiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_URL ?? '').trim();
  if (!raw) return '';
  return raw.replace(/\/$/, '');
}

function resolveUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = apiBaseUrl();
  if (!base) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const token = accessTokenGetter();

  try {
    const response = await fetch(resolveUrl(path), {
      ...rest,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...rest.headers,
      },
    });

    if (!response.ok) {
      let code = 'HTTP_ERROR';
      let message = response.statusText || 'Request failed';
      try {
        const body = (await response.json()) as ApiErrorBody;
        code = body.error?.code ?? code;
        message = body.error?.message ?? message;
      } catch {
        /* non-JSON error body */
      }
      throw new ApiError(response.status, code, message);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
