import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { MatchingFeedItem } from '@inyalink/shared';
import { formatMmk } from '@inyalink/shared';
import {
  expressInterest,
  getMatchingFeed,
  withdrawInterest,
} from '../lib/api';
import { ApiError } from '../lib/apiClient';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { ProgressNotice, RateLimitNotice } from '../components/Notices';
import { EngagementInbox } from '../features/engagements/EngagementInbox';

export default function ProBriefs() {
  const { t, locale } = useI18n();
  const { session, loading: authLoading } = useAuth();
  const [items, setItems] = useState<MatchingFeedItem[]>([]);
  const [remaining, setRemaining] = useState(10);
  const [cap, setCap] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!session) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const feed = await getMatchingFeed();
      setItems(feed.items);
      setRemaining(feed.remaining);
      setCap(feed.cap);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t('proFeed.loadError'),
      );
    } finally {
      setLoading(false);
    }
  }, [session, t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onInterest(briefId: string, already: boolean) {
    setBusyId(briefId);
    setError(null);
    try {
      const result = already
        ? await withdrawInterest(briefId)
        : await expressInterest(briefId);
      setRemaining(result.remaining);
      setItems((prev) =>
        prev.map((item) =>
          item.briefId === briefId
            ? { ...item, alreadyInterested: result.interested }
            : item,
        ),
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t('proFeed.interestError'),
      );
    } finally {
      setBusyId(null);
    }
  }

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
        <h1 className="text-display-sm text-ink-900">{t('proFeed.title')}</h1>
        <p className="mt-sm text-body text-ink-500">{t('proFeed.signInBody')}</p>
        <Link
          to="/login"
          className="tap-target mt-2xl inline-flex items-center justify-center rounded-md bg-jade-600 px-xl text-body font-medium text-white no-underline transition-colors duration-fast ease-out hover:bg-jade-400 focus-visible:shadow-focus"
        >
          {t('header.login')}
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold leading-[1.8]">
            {t('proFeed.title')}
          </h1>
          <p className="mt-1 text-sm leading-[1.8] text-ink-500">
            {t('proFeed.subhead')}
          </p>
        </div>
        <p className="text-sm text-ink-500">
          {t('proFeed.remaining')
            .replace('{remaining}', String(remaining))
            .replace('{cap}', String(cap))}
        </p>
      </div>

      {loading ? <ProgressNotice messageKey="progress.matching" /> : null}
      {error ? (
        <RateLimitNotice notice={error} onRetry={() => void reload()} />
      ) : null}

      <EngagementInbox />

      {!loading && items.length === 0 ? (
        <div className="rounded-lg border border-line bg-paper p-5 leading-[1.8]">
          <p className="text-ink-900">{t('proFeed.emptyTitle')}</p>
          <p className="mt-2 text-sm text-ink-500">{t('proFeed.emptyBody')}</p>
          <Link
            to="/browse"
            className="mt-4 inline-flex text-sm text-jade-600 hover:underline"
          >
            {t('header.browse')}
          </Link>
        </div>
      ) : null}

      <ul className="space-y-4">
        {items.map((item) => {
          const budget =
            item.budgetMinMmk !== null || item.budgetMaxMmk !== null
              ? [
                  item.budgetMinMmk !== null
                    ? formatMmk(item.budgetMinMmk, locale)
                    : null,
                  item.budgetMaxMmk !== null
                    ? formatMmk(item.budgetMaxMmk, locale)
                    : null,
                ]
                  .filter(Boolean)
                  .join(' – ')
              : null;
          return (
            <li
              key={item.briefId}
              className="rounded-lg border border-line bg-white p-5"
            >
              <h2 className="text-title text-ink-900 [overflow-wrap:anywhere]">
                {item.title ?? t('proFeed.untitled')}
              </h2>
              {item.description ? (
                <p className="mt-2 text-body leading-[1.8] text-ink-700 [overflow-wrap:anywhere]">
                  {item.description}
                </p>
              ) : null}
              <p className="mt-3 text-caption text-ink-400">
                {[item.categorySlug, budget, item.deadline]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <button
                type="button"
                disabled={busyId === item.briefId || (!item.alreadyInterested && remaining <= 0)}
                onClick={() =>
                  void onInterest(item.briefId, item.alreadyInterested)
                }
                className={`tap-target mt-4 inline-flex rounded-md px-4 py-2.5 text-sm font-medium disabled:opacity-40 ${
                  item.alreadyInterested
                    ? 'border border-line bg-white text-ink-700'
                    : 'bg-jade-600 text-white'
                }`}
              >
                {item.alreadyInterested
                  ? t('proFeed.withdraw')
                  : t('proFeed.interest')}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
