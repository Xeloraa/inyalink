import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { takeAuthReturnTo } from '../lib/authReturnTo';
import { useI18n } from '../lib/i18n';
import { isSupabaseConfigured } from '../lib/supabase';

/** OAuth redirect target — waits for Supabase session, then goes to /browse. */
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

    // refreshProfile reads the current session itself (and syncProfile
    // dedupes against whatever AuthProvider's mount check / onAuthStateChange
    // already fetched) — no need to call getSession() again here first.
    async function finish() {
      try {
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
      void navigate(takeAuthReturnTo('/browse'), { replace: true });
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
