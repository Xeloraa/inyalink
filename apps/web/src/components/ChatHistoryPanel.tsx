import { useEffect, useState } from 'react';
import type { ConversationSummary } from '@inyalink/shared';
import { fetchConversationSummaries } from '../lib/conversationStore';
import { useI18n } from '../lib/i18n';

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
          <p className="px-xl py-lg text-body-sm text-ink-400">
            {t('common.loading')}
          </p>
        ) : null}
        {error ? (
          <p className="px-xl py-lg text-body-sm text-danger">{error}</p>
        ) : null}
        {!loading && !error && items.length === 0 ? (
          <p className="px-xl py-lg text-body-sm text-ink-400">
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
