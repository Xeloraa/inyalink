import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { AdminPendingProfessional } from '@inyalink/shared';
import {
  fetchAdminPendingProfessionals,
  reviewAdminProfessional,
} from '../../features/admin/api';
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
    <div className="mt-2">
      <div className="text-[11px] font-medium uppercase text-ink-500">{label}</div>
      <ul className="mt-1 space-y-1">
        {links.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-jade-700 underline [overflow-wrap:anywhere]"
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
    <div className="space-y-2 text-sm leading-[1.8]">
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
        <div className="rounded bg-amber-100 px-2 py-1 text-amber-800">
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
    return <p className="text-sm text-ink-500">{t('common.loading')}</p>;
  }
  if (q.isError) {
    return (
      <p className="text-sm text-danger">
        {t('admin.loadError')}{' '}
        <button type="button" className="underline" onClick={() => void q.refetch()}>
          {t('common.retry')}
        </button>
      </p>
    );
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-base font-semibold">
          {t('admin.pro.title')}{' '}
          <span className="font-normal text-ink-500">({items.length})</span>
        </h1>
        <p className="text-[11px] text-ink-400">{t('admin.pro.shortcuts')}</p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-ink-500">{t('admin.pro.empty')}</p>
      ) : (
        <div className="grid gap-2 md:grid-cols-[280px_1fr]">
          <ul className="max-h-[70vh] overflow-auto rounded border border-line bg-white">
            {items.map((item, i) => (
              <li key={item.userId}>
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  className={[
                    'w-full border-b border-line-soft px-2 py-2 text-left text-sm',
                    i === index ? 'bg-jade-50' : 'hover:bg-line-soft',
                  ].join(' ')}
                >
                  <div className="font-medium">{item.displayName}</div>
                  <div className="text-[11px] text-ink-500">
                    {item.categoryNameEn}
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {selected ? (
            <div className="rounded border border-line bg-white p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">{selected.displayName}</h2>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    disabled={mutation.isPending}
                    className="rounded bg-jade-600 px-2 py-1 text-xs text-white disabled:opacity-50"
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
                    className="rounded bg-danger px-2 py-1 text-xs text-white disabled:opacity-50"
                    onClick={() => setReasonOpen('reject')}
                  >
                    {t('admin.pro.reject')}
                  </button>
                  <button
                    type="button"
                    disabled={mutation.isPending}
                    className="rounded border border-line px-2 py-1 text-xs disabled:opacity-50"
                    onClick={() => setReasonOpen('request_info')}
                  >
                    {t('admin.pro.requestInfo')}
                  </button>
                </div>
              </div>
              {actionError ? (
                <p className="mb-2 text-xs text-danger">{actionError}</p>
              ) : null}
              <Detail item={selected} />
            </div>
          ) : null}
        </div>
      )}

      {reasonOpen && selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded border border-line bg-white p-3 shadow">
            <h3 className="text-sm font-semibold">
              {reasonOpen === 'reject'
                ? t('admin.pro.reject')
                : t('admin.pro.requestInfo')}
            </h3>
            <textarea
              className="mt-2 w-full rounded border border-line p-2 text-sm leading-[1.8]"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('admin.pro.reasonPlaceholder')}
              autoFocus
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                className="rounded px-2 py-1 text-xs text-ink-600"
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
                className="rounded bg-ink-900 px-2 py-1 text-xs text-white disabled:opacity-50"
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
