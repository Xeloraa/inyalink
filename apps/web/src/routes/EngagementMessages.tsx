import { Link, useParams } from 'react-router-dom';
import { MessageThread } from '../features/messages/MessageThread';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';

export default function EngagementMessages() {
  const { id } = useParams<{ id: string }>();
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
        <h1 className="text-display-sm text-ink-900">{t('messages.title')}</h1>
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

  if (!id) {
    return (
      <p className="py-3xl text-center text-body text-danger" role="alert">
        {t('messages.invalidEngagement')}
      </p>
    );
  }

  return (
    <section className="mx-auto max-w-lg">
      <div className="mb-3 flex flex-wrap gap-3">
        <Link
          to="/app/briefs"
          className="tap-target text-body-sm text-jade-600 no-underline hover:underline"
        >
          {t('messages.backToBriefs')}
        </Link>
        <Link
          to="/app/engagements"
          className="tap-target text-body-sm text-jade-600 no-underline hover:underline"
        >
          {t('messages.backToThreads')}
        </Link>
      </div>
      <MessageThread engagementId={id} />
    </section>
  );
}
