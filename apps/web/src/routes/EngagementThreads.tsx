import { Link } from 'react-router-dom';
import { ActiveThreads } from '../features/messages/ActiveThreads';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';

/** Client + professional list of accepted engagement message threads. */
export default function EngagementThreads() {
  const { t } = useI18n();
  const { session, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <p className="py-3xl text-center text-body text-ink-500" role="status">
        {t('common.loading')}
      </p>
    );
  }

  if (!session) {
    return (
      <section className="mx-auto max-w-md py-3xl text-center">
        <h1 className="text-display-sm text-ink-900">
          {t('messages.threadsTitle')}
        </h1>
        <p className="mt-sm text-body text-ink-500">{t('messages.signInBody')}</p>
        <Link
          to="/login"
          className="tap-target mt-2xl inline-flex items-center justify-center rounded-md bg-jade-600 px-xl text-body font-medium text-white no-underline"
        >
          {t('header.login')}
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold leading-[1.8] text-ink-900">
          {t('messages.threadsTitle')}
        </h1>
        <p className="mt-1 text-body-sm leading-[1.8] text-ink-500">
          {t('messages.threadsSubhead')}
        </p>
      </div>
      <ActiveThreads hideWhenEmpty={false} />
    </section>
  );
}
