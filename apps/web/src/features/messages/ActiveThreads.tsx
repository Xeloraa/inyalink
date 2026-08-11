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
  /** Highlight the row for the open engagement (two-pane messages). */
  selectedId?: string;
  /**
   * `section` — card block used on ProBriefs.
   * `pane` — list only, for the messages two-pane shell.
   */
  variant?: 'section' | 'pane';
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase();
}

function formatThreadTime(iso: string | null, locale: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(locale === 'my' ? 'my-MM' : undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  return d.toLocaleDateString(locale === 'my' ? 'my-MM' : undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function ActiveThreads({
  hideWhenEmpty = true,
  selectedId,
  variant = 'section',
}: ActiveThreadsProps) {
  const { t, locale } = useI18n();
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
      <p className="px-lg py-xl text-body-sm text-ink-500" role="status">
        {t('common.loading')}
      </p>
    );
  }

  if (threadsQuery.isError && !threadsQuery.data) {
    return (
      <div className="space-y-2 rounded-2md border border-line bg-paper p-lg">
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

  const list = (
    <>
      {threads.length === 0 ? (
        <p className="px-lg py-xl text-body-sm text-ink-500">
          {t('messages.threadsEmpty')}
        </p>
      ) : (
        <ul className="flex flex-col gap-xs p-sm">
          {threads.map((thread) => {
            const name =
              thread.counterpartName?.trim() ||
              thread.briefTitle?.trim() ||
              t('proFeed.untitled');
            const snippet =
              thread.briefTitle?.trim() || t('messages.openThread');
            const selected = selectedId === thread.engagementId;
            const time = formatThreadTime(thread.lastMessageAt, locale);

            return (
              <li key={thread.engagementId}>
                <Link
                  to={`/app/engagements/${thread.engagementId}`}
                  aria-current={selected ? 'page' : undefined}
                  className={`tap-target flex items-center gap-md rounded-2md px-md py-md no-underline transition-colors duration-fast ease-out focus-visible:shadow-focus ${
                    selected
                      ? 'bg-jade-50'
                      : 'hover:bg-hover'
                  }`}
                >
                  <span
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-jade-100 text-caption font-semibold text-jade-800"
                    aria-hidden
                  >
                    {initials(name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-sm">
                      <span className="truncate text-body font-medium text-ink-900">
                        {name}
                      </span>
                      {time ? (
                        <time
                          dateTime={thread.lastMessageAt ?? undefined}
                          className="shrink-0 text-caption text-ink-400"
                        >
                          {time}
                        </time>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block truncate text-body-sm text-ink-500">
                      {snippet}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  if (variant === 'pane') {
    return <div className="min-h-0 flex-1 overflow-y-auto">{list}</div>;
  }

  return (
    <section className="space-y-lg rounded-xl2 border border-line bg-white p-xl shadow-md">
      <div>
        <h2 className="text-title text-ink-900">{t('messages.threadsTitle')}</h2>
        <p className="mt-1 text-body-sm text-ink-500">
          {t('messages.threadsSubhead')}
        </p>
      </div>
      {list}
    </section>
  );
}
