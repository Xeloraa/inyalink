import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listMessageThreads } from '../../lib/api';
import { ApiError } from '../../lib/apiClient';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';

const POLL_MS = 30_000;

type ActiveThreadsProps = {
  /** When true, hide the section if there are no threads (pro briefs page). */
  hideWhenEmpty?: boolean;
};

export function ActiveThreads({ hideWhenEmpty = true }: ActiveThreadsProps) {
  const { t } = useI18n();
  const { session } = useAuth();

  const threadsQuery = useQuery({
    queryKey: ['message-threads'],
    queryFn: listMessageThreads,
    enabled: Boolean(session),
    refetchInterval: POLL_MS,
    retry: 2,
  });

  if (!session) return null;

  if (threadsQuery.isLoading && !threadsQuery.data) {
    return (
      <p className="text-body-sm text-ink-500" role="status">
        {t('common.loading')}
      </p>
    );
  }

  if (threadsQuery.isError && !threadsQuery.data) {
    return (
      <div className="space-y-2 rounded-lg border border-line bg-paper p-4">
        <p className="text-body-sm text-danger" role="alert">
          {threadsQuery.error instanceof ApiError
            ? threadsQuery.error.message
            : t('messages.threadsLoadError')}
        </p>
        <button
          type="button"
          onClick={() => void threadsQuery.refetch()}
          className="tap-target text-sm text-jade-600 hover:underline"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  const threads = threadsQuery.data?.threads ?? [];
  if (hideWhenEmpty && threads.length === 0) return null;

  return (
    <section className="space-y-4 rounded-lg border border-jade-200 bg-jade-50 p-5">
      <div>
        <h2 className="text-title text-jade-900">{t('messages.threadsTitle')}</h2>
        <p className="mt-1 text-body-sm text-jade-800">
          {t('messages.threadsSubhead')}
        </p>
      </div>

      {threads.length === 0 ? (
        <p className="text-body-sm text-ink-500">{t('messages.threadsEmpty')}</p>
      ) : (
        <ul className="space-y-3">
          {threads.map((thread) => (
            <li key={thread.engagementId}>
              <Link
                to={`/app/engagements/${thread.engagementId}`}
                className="tap-target block rounded-md border border-jade-200 bg-white p-4 no-underline transition-colors hover:border-jade-400 focus-visible:shadow-focus"
              >
                <p className="text-title text-ink-900 [overflow-wrap:anywhere]">
                  {thread.briefTitle?.trim() || t('proFeed.untitled')}
                </p>
                {thread.counterpartName ? (
                  <p className="mt-1 text-body-sm text-ink-500 [overflow-wrap:anywhere]">
                    {t('messages.withCounterpart').replace(
                      '{name}',
                      thread.counterpartName,
                    )}
                  </p>
                ) : null}
                <p className="mt-2 text-caption font-medium text-jade-700">
                  {t('messages.openThread')}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
