import { Link, useParams } from 'react-router-dom';
import { ActiveThreads } from '../features/messages/ActiveThreads';
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
    <section className="space-y-lg">
      {/* Mobile: full-screen thread with back */}
      <div className="md:hidden">
        <div className="mb-md flex flex-wrap gap-md">
          <Link
            to="/app/engagements"
            className="tap-target text-body-sm font-medium text-jade-600 no-underline hover:underline"
          >
            {t('messages.backToThreads')}
          </Link>
          <Link
            to="/app/briefs"
            className="tap-target text-body-sm text-ink-500 no-underline hover:underline"
          >
            {t('messages.backToBriefs')}
          </Link>
        </div>
        <div className="overflow-hidden rounded-xl2 bg-white shadow-md">
          <MessageThread engagementId={id} />
        </div>
      </div>

      {/* Desktop: list + active thread */}
      <div className="hidden gap-[14px] md:flex">
        <div className="flex min-h-[min(70vh,640px)] w-[320px] shrink-0 flex-col overflow-hidden rounded-xl2 bg-white shadow-md">
          <div className="shrink-0 border-b border-line-soft px-lg py-md">
            <h1 className="text-title text-ink-900">
              {t('messages.threadsTitle')}
            </h1>
          </div>
          <ActiveThreads
            hideWhenEmpty={false}
            variant="pane"
            selectedId={id}
          />
        </div>

        <div className="flex min-h-[min(70vh,640px)] min-w-0 flex-1 flex-col overflow-hidden rounded-xl2 bg-white shadow-md">
          <MessageThread engagementId={id} />
        </div>
      </div>
    </section>
  );
}
