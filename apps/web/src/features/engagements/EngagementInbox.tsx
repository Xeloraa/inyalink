import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EngagementInboxItem } from '@inyalink/shared';
import { formatMmk } from '@inyalink/shared';
import {
  acceptEngagement,
  declineEngagement,
  getEngagementInbox,
} from '../../lib/api';
import { ApiError } from '../../lib/apiClient';
import { useI18n } from '../../lib/i18n';
import { LoadErrorNotice } from '../../components/Notices';

function secondsUntil(respondBy: string | null): number | null {
  if (!respondBy) return null;
  const ms = new Date(respondBy).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.floor(ms / 1000));
}

function formatCountdown(seconds: number | null): string {
  if (seconds === null) return '—';
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

type EngagementInboxProps = {
  onChanged?: () => void;
  /** When true, show an invitation empty state instead of hiding the section. */
  showEmpty?: boolean;
};

export function EngagementInbox({
  onChanged,
  showEmpty = false,
}: EngagementInboxProps) {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [items, setItems] = useState<EngagementInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [tick, setTick] = useState(0);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const res = await getEngagementInbox();
      setItems(res.items);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t('inbox.loadError'),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [items.length]);

  async function onAccept(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await acceptEngagement(id);
      onChanged?.();
      navigate(`/app/engagements/${id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('inbox.actionError'));
    } finally {
      setBusyId(null);
    }
  }

  async function onDecline(e: FormEvent) {
    e.preventDefault();
    if (!declineId || declineReason.trim().length < 4) return;
    setBusyId(declineId);
    setError(null);
    try {
      await declineEngagement(declineId, { reason: declineReason.trim() });
      setDeclineId(null);
      setDeclineReason('');
      await reload();
      onChanged?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('inbox.actionError'));
    } finally {
      setBusyId(null);
    }
  }

  if (loading && items.length === 0 && !error) {
    return (
      <p className="text-body-sm leading-[1.8] text-ink-500" role="status">
        {t('common.loading')}
      </p>
    );
  }

  if (!loading && items.length === 0 && !error && !showEmpty) {
    return null;
  }

  if (error && items.length === 0) {
    return (
      <LoadErrorNotice message={error} onRetry={() => void reload()} />
    );
  }

  if (!loading && items.length === 0 && showEmpty) {
    return (
      <section className="rounded-lg border border-line bg-paper px-lg py-lg leading-[1.8]">
        <h2 className="text-title text-ink-900">{t('inbox.emptyTitle')}</h2>
        <p className="mt-sm text-body-sm text-ink-500 [overflow-wrap:anywhere]">
          {t('inbox.emptyBody')}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-lg border border-jade-200 bg-jade-50 p-5">
      <div>
        <h2 className="text-title text-jade-900">{t('inbox.title')}</h2>
        <p className="mt-1 text-body-sm leading-[1.8] text-jade-800">
          {t('inbox.subhead')}
        </p>
      </div>

      {error ? (
        <LoadErrorNotice message={error} onRetry={() => void reload()} />
      ) : null}

      <ul className="space-y-4">
        {items.map((item) => {
          const remaining = secondsUntil(item.respondBy);
          // Re-render each second via tick.
          void tick;
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
              key={item.id}
              className="rounded-md border border-jade-200 bg-white p-4"
            >
              <h3 className="text-title text-ink-900 [overflow-wrap:anywhere]">
                {item.briefTitle ?? t('proFeed.untitled')}
              </h3>
              {item.briefDescription ? (
                <p className="mt-2 text-body-sm leading-[1.8] text-ink-700 [overflow-wrap:anywhere]">
                  {item.briefDescription}
                </p>
              ) : null}
              <p className="mt-2 text-caption text-ink-400">
                {[item.categorySlug, budget, item.deadline]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <p className="mt-3 text-body-sm font-medium tabular-nums text-jade-800">
                {t('inbox.countdown').replace(
                  '{time}',
                  formatCountdown(remaining),
                )}
              </p>

              {declineId === item.id ? (
                <form className="mt-4 space-y-3" onSubmit={(ev) => void onDecline(ev)}>
                  <label
                    htmlFor={`decline-${item.id}`}
                    className="block text-caption text-ink-500"
                  >
                    {t('inbox.declineReason')}
                  </label>
                  <textarea
                    id={`decline-${item.id}`}
                    rows={3}
                    value={declineReason}
                    onChange={(ev) => setDeclineReason(ev.target.value)}
                    className="w-full rounded-md border border-line bg-white px-md py-md text-body outline-none focus:border-jade-400 focus:shadow-focus"
                    required
                    minLength={4}
                  />
                  <div className="flex flex-wrap gap-sm">
                    <button
                      type="submit"
                      disabled={busyId === item.id || declineReason.trim().length < 4}
                      className="tap-target rounded-md bg-danger px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
                    >
                      {t('inbox.confirmDecline')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeclineId(null);
                        setDeclineReason('');
                      }}
                      className="tap-target rounded-md border border-line px-4 py-2.5 text-sm text-ink-700"
                    >
                      {t('common.back')}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-4 flex flex-wrap gap-sm">
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => void onAccept(item.id)}
                    className="tap-target rounded-md bg-jade-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
                  >
                    {t('inbox.accept')}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => {
                      setDeclineId(item.id);
                      setDeclineReason('');
                    }}
                    className="tap-target rounded-md border border-line px-4 py-2.5 text-sm text-ink-700 disabled:opacity-40"
                  >
                    {t('inbox.decline')}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
