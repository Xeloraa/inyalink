import { useEffect, useState } from 'react';
import type { ConversationSummary } from '@inyalink/shared';
import { fetchConversationSummaries } from '../lib/conversationStore';
import { useI18n } from '../lib/i18n';
import { Skeleton } from './Skeleton';

type ChatHistoryPanelProps = {
  open: boolean;
  signedIn: boolean;
  activeId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  /** Bump to refetch after a persist. */
  refreshKey: number;
};

function formatConversationDate(
  iso: string,
  locale: 'my' | 'en',
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale === 'my' ? 'my-MM' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function ChatHistoryPanel({
  open,
  signedIn,
  activeId,
  onClose,
  onSelect,
  onNew,
  refreshKey,
}: ChatHistoryPanelProps) {
  const { t, locale } = useI18n();
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchConversationSummaries(signedIn)
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch(() => {
        if (!cancelled) setError(t('chat.historyError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, signedIn, refreshKey, t]);

  function retry() {
    setLoading(true);
    setError(null);
    void fetchConversationSummaries(signedIn)
      .then(setItems)
      .catch(() => setError(t('chat.historyError')))
      .finally(() => setLoading(false));
  }

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-white">
      <div className="flex shrink-0 items-center gap-md border-b border-line-soft px-xl py-lg">
        <h3 className="min-w-0 flex-1 text-title text-ink-900">
          {t('chat.historyTitle')}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="tap-target text-body-sm font-medium text-jade-600 hover:text-jade-400 focus-visible:shadow-focus"
        >
          {t('chat.historyBack')}
        </button>
      </div>

      <p className="shrink-0 border-b border-line-soft bg-jade-50 px-xl py-md text-body-sm leading-burmese text-ink-700">
        {t('chat.retentionNotice')}
      </p>

      <div className="shrink-0 border-b border-line-soft px-xl py-md">
        <button
          type="button"
          onClick={onNew}
          className="tap-target inline-flex w-full items-center justify-center gap-sm rounded-md border border-jade-200 bg-white px-lg text-body-sm font-medium text-jade-600 transition-colors duration-fast ease-out hover:border-jade-400 hover:bg-jade-50 focus-visible:shadow-focus"
        >
          {t('chat.newConversation')}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div role="status" aria-busy="true">
            <span className="sr-only">{t('common.loading')}</span>
            <ul className="flex flex-col" aria-hidden>
              {Array.from({ length: 4 }, (_, i) => (
                <li
                  key={i}
                  className="border-b border-line-soft px-xl py-lg"
                >
                  <Skeleton className="h-4 w-3/4 max-w-[14rem]" />
                  <Skeleton className="mt-xs h-3 w-20" />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {error ? (
          <div className="px-xl py-lg" role="alert">
            <p className="text-body-sm leading-[1.8] text-ink-700 [overflow-wrap:anywhere]">
              {error}
            </p>
            <button
              type="button"
              onClick={retry}
              className="tap-target mt-sm inline-flex items-center text-body-sm font-medium text-jade-600 underline focus-visible:shadow-focus"
            >
              {t('common.retry')}
            </button>
          </div>
        ) : null}
        {!loading && !error && items.length === 0 ? (
          <p className="px-xl py-lg text-body-sm leading-[1.8] text-ink-400 [overflow-wrap:anywhere]">
            {t('chat.historyEmpty')}
          </p>
        ) : null}
        <ul className="flex flex-col">
          {items.map((item) => {
            const active = item.id === activeId;
            return (
              <li key={item.id} className="border-b border-line-soft">
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={`tap-target flex w-full flex-col items-start gap-xs px-xl py-lg text-left transition-colors duration-fast ease-out hover:bg-jade-50 focus-visible:shadow-focus ${
                    active ? 'bg-jade-50' : ''
                  }`}
                >
                  <span className="font-myanmar w-full text-body leading-burmese text-ink-900 [overflow-wrap:anywhere]">
                    {item.title}
                  </span>
                  <span className="text-caption text-ink-400">
                    {formatConversationDate(item.updatedAt, locale)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
