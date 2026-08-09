import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { BriefStatus } from '@inyalink/shared';
import { assignAdminBrief, fetchAdminBriefs } from '../../features/admin/api';
import { AdminBriefsSkeleton } from '../../features/admin/AdminSkeletons';
import { useI18n } from '../../lib/i18n';

const STATUSES: Array<BriefStatus | ''> = [
  '',
  'draft',
  'submitted',
  'matched',
  'closed',
  'cancelled',
];

export default function AdminBriefs() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [status, setStatus] = useState<BriefStatus | ''>('');
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [proId, setProId] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ['admin', 'briefs', status],
    queryFn: () => fetchAdminBriefs(status || undefined),
  });

  const assign = useMutation({
    mutationFn: () =>
      assignAdminBrief(assignFor!, { professionalId: proId.trim() }),
    onSuccess: async () => {
      setAssignFor(null);
      setProId('');
      setErr(null);
      await qc.invalidateQueries({ queryKey: ['admin', 'briefs'] });
      await qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      await qc.invalidateQueries({ queryKey: ['admin', 'engagements'] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  if (q.isLoading) {
    return <AdminBriefsSkeleton />;
  }
  if (q.isError || !q.data) {
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
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-base font-semibold">{t('admin.briefs.title')}</h1>
        <label className="text-xs text-ink-600">
          {t('admin.filterStatus')}{' '}
          <select
            className="ml-1 rounded border border-line bg-white px-1 py-0.5"
            value={status}
            onChange={(e) => setStatus(e.target.value as BriefStatus | '')}
          >
            {STATUSES.map((s) => (
              <option key={s || 'all'} value={s}>
                {s || t('admin.filterAll')}
              </option>
            ))}
          </select>
        </label>
      </div>

      {q.data.items.length === 0 ? (
        <p className="rounded border border-line bg-white px-3 py-4 text-sm leading-[1.8] text-ink-500 [overflow-wrap:anywhere]">
          {t('admin.briefs.empty')}
        </p>
      ) : (
      <div className="overflow-x-auto rounded border border-line bg-white">
        <table className="w-full min-w-[900px] border-collapse text-left text-xs">
          <thead className="bg-line-soft text-[11px] uppercase text-ink-500">
            <tr>
              <th className="px-2 py-1.5 font-medium">{t('admin.briefs.colTitle')}</th>
              <th className="px-2 py-1.5 font-medium">{t('admin.briefs.colStatus')}</th>
              <th className="px-2 py-1.5 font-medium">{t('admin.briefs.colClient')}</th>
              <th className="px-2 py-1.5 font-medium">{t('admin.briefs.colInterests')}</th>
              <th className="px-2 py-1.5 font-medium">{t('admin.briefs.colFallback')}</th>
              <th className="px-2 py-1.5 font-medium">{t('admin.briefs.colSurfaced')}</th>
              <th className="px-2 py-1.5 font-medium">{t('admin.briefs.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {q.data.items.map((b) => (
              <tr key={b.id} className="border-t border-line-soft align-top">
                <td className="px-2 py-1.5">
                  <div className="max-w-[220px] font-medium [overflow-wrap:anywhere]">
                    {b.title || b.id.slice(0, 8)}
                  </div>
                  <div className="text-[10px] text-ink-400">{b.categorySlug}</div>
                </td>
                <td className="px-2 py-1.5 tabular-nums">{b.status}</td>
                <td className="px-2 py-1.5">{b.clientDisplayName}</td>
                <td className="px-2 py-1.5 tabular-nums">{b.interestCount}</td>
                <td className="px-2 py-1.5">
                  {b.fallbackUsed ? t('admin.yes') : t('admin.no')}
                </td>
                <td className="px-2 py-1.5">
                  {b.surfaced.length === 0 ? (
                    <span className="text-ink-400">—</span>
                  ) : (
                    <ul className="space-y-0.5">
                      {b.surfaced.map((s) => (
                        <li key={s.professionalId}>
                          #{s.rank} {s.displayName}
                          {s.guaranteedResponse ? ' ★' : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    className="tap-target inline-flex items-center rounded-md border border-line px-3 text-sm hover:bg-line-soft"
                    onClick={() => {
                      setAssignFor(b.id);
                      setProId('');
                      setErr(null);
                    }}
                  >
                    {t('admin.briefs.assign')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {assignFor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded border border-line bg-white p-3">
            <h3 className="text-sm font-semibold">{t('admin.briefs.assign')}</h3>
            <label className="mt-2 block text-xs text-ink-600">
              {t('admin.briefs.proId')}
              <input
                className="tap-target mt-1 w-full rounded border border-line px-3 font-mono text-sm"
                value={proId}
                onChange={(e) => setProId(e.target.value)}
                placeholder="uuid"
                autoFocus
              />
            </label>
            {err ? <p className="mt-2 text-xs text-danger">{err}</p> : null}
            <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="tap-target inline-flex items-center justify-center rounded-md px-3 text-sm text-ink-600"
                onClick={() => setAssignFor(null)}
              >
                {t('common.back')}
              </button>
              <button
                type="button"
                disabled={assign.isPending || proId.trim().length < 36}
                className="tap-target inline-flex items-center justify-center rounded-md bg-jade-600 px-3 text-sm text-white disabled:opacity-50"
                onClick={() => assign.mutate()}
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
