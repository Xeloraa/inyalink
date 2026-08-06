import { FormEvent, useState, type ReactNode } from 'react';
import { useI18n } from '../lib/i18n';
import { LogoMark } from './Logo';

const STORAGE_KEY = 'inyalink.access.ok';

/** Soft pre-launch gate only — password is public in the client bundle. */
export function isAccessPasswordConfigured(): boolean {
  return Boolean((import.meta.env.VITE_ACCESS_PASSWORD ?? '').trim());
}

export function hasAccessUnlock(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function unlockAccess(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* private mode — still allow this tab session via React state */
  }
}

function passwordMatches(input: string): boolean {
  const expected = (import.meta.env.VITE_ACCESS_PASSWORD ?? '').trim();
  return expected.length > 0 && input === expected;
}

/**
 * Temporary site-wide password screen for pre-launch. Not real security —
 * the value is baked into the Vite bundle. Remove before public launch.
 */
export function AccessGate({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [unlocked, setUnlocked] = useState(
    () => !isAccessPasswordConfigured() || hasAccessUnlock(),
  );
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (unlocked) return children;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!passwordMatches(password)) {
      setError(t('access.wrongPassword'));
      return;
    }
    unlockAccess();
    setError(null);
    setUnlocked(true);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-5">
      <div className="w-full max-w-sm">
        <p className="text-center text-caption font-medium uppercase tracking-wide text-amber-800">
          {t('access.temporary')}
        </p>
        <div className="mt-lg flex flex-col items-center text-center">
          <span className="text-jade-600">
            <LogoMark size={32} />
          </span>
          <h1 className="mt-md font-display text-title font-semibold text-ink-900">
            {t('access.title')}
          </h1>
          <p className="mt-sm text-body-sm text-ink-500">{t('access.body')}</p>
        </div>

        <form onSubmit={onSubmit} className="mt-2xl space-y-md">
          <label className="block">
            <span className="sr-only">{t('access.passwordLabel')}</span>
            <input
              type="password"
              name="access-password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder={t('access.passwordLabel')}
              className="tap-target w-full rounded-md border border-line bg-white px-md text-body text-ink-900 outline-none focus:border-jade-400 focus:shadow-focus"
            />
          </label>
          {error ? (
            <p className="text-body-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            className="tap-target w-full rounded-md bg-jade-600 px-lg text-body font-medium text-white transition-colors duration-fast ease-out hover:bg-jade-400 focus-visible:shadow-focus active:bg-jade-800"
          >
            {t('access.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
