import { Navigate, useLocation } from 'react-router-dom';
import { AuthForm } from '../features/auth/AuthForm';
import { useAuth } from '../lib/auth';
import { rememberAuthReturnTo, takeAuthReturnTo } from '../lib/authReturnTo';
import { useI18n } from '../lib/i18n';

function returnPathFromState(state: unknown): string | null {
  if (
    typeof state === 'object' &&
    state !== null &&
    'from' in state &&
    typeof (state as { from?: unknown }).from === 'string'
  ) {
    const from = (state as { from: string }).from;
    if (from.startsWith('/') && !from.startsWith('//')) return from;
  }
  return null;
}

export default function Login() {
  const { session, loading } = useAuth();
  const location = useLocation();
  const { t } = useI18n();
  const from = returnPathFromState(location.state);

  if (loading) {
    return (
      <p className="py-3xl text-center text-body text-ink-500" role="status">
        {t('common.loading')}
      </p>
    );
  }

  if (session) {
    return <Navigate to={from ?? takeAuthReturnTo('/browse')} replace />;
  }

  if (from) rememberAuthReturnTo(from);

  return <AuthForm intent="login" />;
}
