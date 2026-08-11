import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { AdminPendingProfessional } from '@inyalink/shared';
import {
  fetchAdminPendingProfessionals,
  reviewAdminProfessional,
} from '../../features/admin/api';
import { AdminProfessionalsSkeleton } from '../../features/admin/AdminSkeletons';
import { useI18n } from '../../lib/i18n';

function LinkList({
  label,
  links,
}: {
  label: string;
  links: { href: string; text: string }[];
}) {
  if (links.length === 0) return null;
  return (
    <div className="mt-md">
      <div className="text-caption font-medium uppercase text-ink-500">{label}</div>
      <ul className="mt-sm space-y-xs">
        {links.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="text-body-sm text-jade-600 underline [overflow-wrap:anywhere]"
            >
              {l.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Detail({ item }: { item: AdminPendingProfessional }) {
  const { t } = useI18n();
  const bio = item.bioEn || item.bioMy || '—';
  const portfolio = item.portfolio
    .map((p) => p.externalUrl)
    .filter((u): u is string => Boolean(u))
    .map((href) => ({ href, text: href }));
  const work = item.workLinks.map((w) => ({
    href: w.url,
    text: w.label || `${w.platform}: ${w.url}`,
  }));
  const cv = item.cvUrl
    ? [{ href: item.cvUrl, text: item.cvUrl }]
    : [];

  return (
    <div className="space-y-sm text-body-sm leading-burmese">
      <div>
        <span className="text-ink-500">{t('admin.pro.category')}: </span>
        {item.categoryNameEn}
        {item.categoryOtherText ? ` (${item.categoryOtherText})` : ''}
      </div>
      <div>
        <span className="text-ink-500">{t('admin.pro.skills')}: </span>
        {item.skills.length ? item.skills.join(', ') : '—'}
      </div>
      <div>
        <span className="text-ink-500">{t('admin.pro.bio')}: </span>
        <span className="whitespace-pre-wrap [overflow-wrap:anywhere]">{bio}</span>
      </div>
      {item.reviewNote ? (
        <div className="rounded-2md bg-amber-100 px-md py-sm text-amber-800">
          {t('admin.pro.note')}: {item.reviewNote}
        </div>
      ) : null}
      <LinkList label={t('admin.pro.cv')} links={cv} />
      <LinkList label={t('admin.pro.portfolio')} links={portfolio} />
      <LinkList label={t('admin.pro.workLinks')} links={work} />
    </div>
  );
}

export default function AdminProfessionals() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [index, setIndex] = useState(0);
  const [reasonOpen, setReasonOpen] = useState<'reject' | 'request_info' | null>(
    null,
  );
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ['admin', 'professionals', 'pending'],
    queryFn: fetchAdminPendingProfessionals,
  });

  const items = q.data?.items ?? [];
  const selected = items[index] ?? null;

  useEffect(() => {
    if (index >= items.length) setIndex(Math.max(0, items.length - 1));
  }, [index, items.length]);

  const mutation = useMutation({
    mutationFn: (args: {
      id: string;
      action: 'approve' | 'reject' | 'request_info';
      reason?: string;
    }) =>
      reviewAdminProfessional(args.id, {
        action: args.action,
        reason: args.reason,
      }),
    onSuccess: async () => {
      setReasonOpen(null);
      setReason('');
      setActionError(null);
      await qc.invalidateQueries({ queryKey: ['admin', 'professionals'] });
      await qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: (err: Error) => {
      setActionError(err.message);
    },
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (reasonOpen) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIndex((i) => Math.min(i + 1, Math.max(0, items.length - 1)));
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'a' && selected) {
        e.preventDefault();
        mutation.mutate({ id: selected.userId, action: 'approve' });
      } else if (e.key === 'r' && selected) {
        e.preventDefault();
        setReasonOpen('reject');
      } else if (e.key === 'i' && selected) {
        e.preventDefault();
        setReasonOpen('request_info');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items.length, mutation, reasonOpen, selected]);

  if (q.isLoading) {
    return <AdminProfessionalsSkeleton />;
  }
  if (q.isError) {
    return (
      <p className="text-body-sm text-danger">
        {t('admin.loadError')}{' '}
        <button type="button" className="underline" onClick={() => void q.refetch()}>
          {t('common.retry')}
        </button>
      </p>
    );
  }

  return (
    <div>
      <div className="mb-lg flex flex-wrap items-baseline justify-between gap-md">
        <h1 className="font-display text-title text-ink-900">
          {t('admin.pro.title')}{' '}
          <span className="font-sans font-normal text-ink-500">
            ({items.length})
          </span>
        </h1>
        <p className="text-caption text-ink-400">{t('admin.pro.shortcuts')}</p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-bubble border border-line bg-white px-lg py-xl text-body-sm text-ink-500 shadow-sm [overflow-wrap:anywhere]">
          {t('admin.pro.empty')}
        </p>
      ) : (
        <div className="grid gap-md md:grid-cols-[280px_1fr]">
          <ul className="max-h-[70vh] overflow-auto rounded-bubble border border-line bg-white shadow-sm">
            {items.map((item, i) => (
              <li key={item.userId}>
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  className={[
                    'tap-target w-full border-b border-line-soft px-lg text-left text-body-sm transition-colors duration-fast ease-out',
                    i === index ? 'bg-jade-50' : 'hover:bg-hover',
                  ].join(' ')}
                >
                  <div className="font-medium [overflow-wrap:anywhere]">
                    {item.displayName}
                  </div>
                  <div className="text-caption text-ink-500 [overflow-wrap:anywhere]">
                    {item.categoryNameEn}
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {selected ? (
            <div className="rounded-bubble border border-line bg-white p-xl shadow-sm">
              <div className="mb-lg flex flex-wrap items-center justify-between gap-md">
                <h2 className="font-display text-title text-ink-900">
                  {selected.displayName}
                </h2>
                <div className="flex w-full flex-wrap items-center gap-md sm:w-auto">
                  <button
                    type="button"
                    disabled={mutation.isPending}
                    className="tap-target inline-flex flex-1 items-center justify-center px-md text-body-sm font-medium text-jade-600 hover:text-jade-800 disabled:opacity-50 sm:flex-none"
                    onClick={() =>
                      mutation.mutate({
                        id: selected.userId,
                        action: 'approve',
                      })
                    }
                  >
                    {t('admin.pro.approve')}
                  </button>
                  <button
                    type="button"
                    disabled={mutation.isPending}
                    className="tap-target inline-flex flex-1 items-center justify-center px-md text-body-sm font-medium text-danger hover:opacity-80 disabled:opacity-50 sm:flex-none"
                    onClick={() => setReasonOpen('reject')}
                  >
                    {t('admin.pro.reject')}
                  </button>
                  <button
                    type="button"
                    disabled={mutation.isPending}
                    className="tap-target inline-flex w-full items-center justify-center rounded-2md border border-line px-md text-body-sm text-ink-700 hover:bg-hover disabled:opacity-50 sm:w-auto"
                    onClick={() => setReasonOpen('request_info')}
                  >
                    {t('admin.pro.requestInfo')}
                  </button>
                </div>
              </div>
              {actionError ? (
                <p className="mb-md text-caption text-danger">{actionError}</p>
              ) : null}
              <Detail item={selected} />
            </div>
          ) : null}
        </div>
      )}

      {reasonOpen && selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-lg">
          <div className="w-full max-w-md rounded-bubble border border-line bg-white p-xl shadow-lg">
            <h3 className="font-display text-title text-ink-900">
              {reasonOpen === 'reject'
                ? t('admin.pro.reject')
                : t('admin.pro.requestInfo')}
            </h3>
            <textarea
              className="mt-md w-full rounded-2md border border-line bg-paper p-md text-body-sm leading-burmese outline-none focus:border-jade-400 focus:shadow-focus"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('admin.pro.reasonPlaceholder')}
              autoFocus
            />
            <div className="mt-lg flex flex-col-reverse gap-sm sm:flex-row sm:justify-end">
              <button
                type="button"
                className="tap-target inline-flex items-center justify-center rounded-2md px-md text-body-sm text-ink-500"
                onClick={() => {
                  setReasonOpen(null);
                  setReason('');
                }}
              >
                {t('common.back')}
              </button>
              <button
                type="button"
                disabled={mutation.isPending || reason.trim().length < 2}
                className="tap-target inline-flex items-center justify-center rounded-2md bg-ink-900 px-lg text-body-sm text-white disabled:opacity-50"
                onClick={() =>
                  mutation.mutate({
                    id: selected.userId,
                    action: reasonOpen,
                    reason: reason.trim(),
                  })
                }
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
