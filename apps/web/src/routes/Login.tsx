import { Navigate } from 'react-router-dom';
import { AuthForm } from '../features/auth/AuthForm';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';

export default function Login() {
  const { session, loading } = useAuth();
  const { t } = useI18n();
  if (loading) {
    return (
      <p className="py-3xl text-center text-body text-ink-500" role="status">
        {t('common.loading')}
      </p>
    );
  }
  if (session) return <Navigate to="/browse" replace />;
  return <AuthForm intent="login" />;
}
