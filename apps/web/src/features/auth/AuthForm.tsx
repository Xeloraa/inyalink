import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { isSupabaseConfigured } from '../../lib/supabase';

type Intent = 'login' | 'signup';

type AuthFormProps = {
  intent: Intent;
};

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function AuthForm({ intent }: AuthFormProps) {
  const { t } = useI18n();
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const title =
    intent === 'login' ? t('auth.loginTitle') : t('auth.signupTitle');
  const subtitle =
    intent === 'login' ? t('auth.loginSubhead') : t('auth.signupSubhead');

  async function onGoogle() {
    setError(null);
    setLoading(true);
    try {
      if (!isSupabaseConfigured()) {
        setError(t('auth.configMissing'));
        return;
      }
      await signInWithGoogle();
      // Browser navigates away to Google; loading stays until redirect.
    } catch {
      setError(t('auth.errorGeneric'));
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-md py-3xl">
      <h1 className="text-display-sm text-ink-900">{title}</h1>
      <p className="mt-sm text-body text-ink-500">{subtitle}</p>

      <div className="mt-2xl space-y-lg">
        <button
          type="button"
          disabled={loading}
          onClick={() => void onGoogle()}
          className="tap-target flex w-full items-center justify-center gap-md rounded-md border border-line bg-white px-lg text-body font-medium text-ink-900 transition-colors duration-fast ease-out hover:border-jade-400 hover:bg-jade-50 focus-visible:shadow-focus active:bg-jade-100 disabled:opacity-50"
        >
          <GoogleIcon />
          {loading ? t('common.loading') : t('auth.google')}
        </button>
        <p className="text-caption text-ink-400">{t('auth.phoneLater')}</p>
      </div>

      {error ? (
        <p className="mt-lg text-body-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <p className="mt-2xl text-center text-body-sm text-ink-500">
        {intent === 'login' ? (
          <Link
            to="/signup"
            className="text-jade-600 underline-offset-4 hover:underline focus-visible:shadow-focus"
          >
            {t('auth.switchToSignup')}
          </Link>
        ) : (
          <Link
            to="/login"
            className="text-jade-600 underline-offset-4 hover:underline focus-visible:shadow-focus"
          >
            {t('auth.switchToLogin')}
          </Link>
        )}
      </p>
    </section>
  );
}
