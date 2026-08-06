import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { getSupabaseBrowser, isSupabaseConfigured } from '../lib/supabase';

/** OAuth redirect target — waits for Supabase session, then goes to /app. */
export default function AuthCallback() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { refreshProfile, session, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setError(t('auth.configMissing'));
      return;
    }

    let cancelled = false;

    async function finish() {
      try {
        const supabase = getSupabaseBrowser();
        const { error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        await refreshProfile();
      } catch {
        if (!cancelled) setError(t('auth.errorGeneric'));
      }
    }

    void finish();
    return () => {
      cancelled = true;
    };
  }, [refreshProfile, t]);

  useEffect(() => {
    if (!loading && session) {
      void navigate('/app', { replace: true });
    }
  }, [loading, session, navigate]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!session) setError(t('auth.errorGeneric'));
    }, 20_000);
    return () => window.clearTimeout(timer);
  }, [session, t]);

  if (error) {
    return (
      <section className="mx-auto max-w-md py-3xl text-center">
        <p className="text-body text-danger" role="alert">
          {error}
        </p>
        <Link
          to="/login"
          className="mt-lg inline-block text-jade-600 underline"
        >
          {t('header.login')}
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-md py-3xl text-center">
      <p className="text-body text-ink-500" role="status">
        {t('common.loading')}
      </p>
    </section>
  );
}
