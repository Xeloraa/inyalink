import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { EngagementStatus } from '@inyalink/shared';
import {
  fetchAdminEngagements,
  patchAdminEngagementStatus,
} from '../../features/admin/api';
import { AdminEngagementsSkeleton } from '../../features/admin/AdminSkeletons';
import { useI18n } from '../../lib/i18n';

const STATUSES: Array<EngagementStatus | ''> = [
  '',
  'proposed',
  'accepted',
  'declined',
  'in_progress',
  'delivered',
  'confirmed',
  'disputed',
  'cancelled',
];

export default function AdminEngagements() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [status, setStatus] = useState<EngagementStatus | ''>('');
  const [editId, setEditId] = useState<string | null>(null);
  const [nextStatus, setNextStatus] = useState<EngagementStatus>('in_progress');
  const [err, setErr] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ['admin', 'engagements', status],
    queryFn: () => fetchAdminEngagements(status || undefined),
  });

  const patch = useMutation({
    mutationFn: () =>
      patchAdminEngagementStatus(editId!, { status: nextStatus }),
    onSuccess: async () => {
      setEditId(null);
      setErr(null);
      await qc.invalidateQueries({ queryKey: ['admin', 'engagements'] });
      await qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  if (q.isLoading) {
    return <AdminEngagementsSkeleton />;
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
      <div className="mb-lg flex flex-wrap items-center justify-between gap-md">
        <h1 className="font-display text-title text-ink-900">
          {t('admin.eng.title')}
        </h1>
        <label className="text-caption text-ink-500">
          {t('admin.filterStatus')}{' '}
          <select
            className="ml-1 rounded-2md border border-line bg-white px-sm py-xs"
            value={status}
            onChange={(e) => setStatus(e.target.value as EngagementStatus | '')}
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
        <p className="rounded-bubble border border-line bg-white px-lg py-xl text-body-sm text-ink-500 shadow-sm [overflow-wrap:anywhere]">
          {t('admin.eng.empty')}
        </p>
      ) : (
      <div className="overflow-x-auto rounded-bubble border border-line bg-white shadow-sm">
        <table className="w-full min-w-[960px] border-collapse text-left text-caption">
          <thead className="bg-page text-caption uppercase text-ink-500">
            <tr>
              <th className="px-2 py-1.5 font-medium">{t('admin.eng.colBrief')}</th>
              <th className="px-2 py-1.5 font-medium">{t('admin.eng.colPro')}</th>
              <th className="px-2 py-1.5 font-medium">{t('admin.eng.colClient')}</th>
              <th className="px-2 py-1.5 font-medium">{t('admin.eng.colStatus')}</th>
              <th className="px-2 py-1.5 font-medium">{t('admin.eng.colHours')}</th>
              <th className="px-2 py-1.5 font-medium">{t('admin.eng.colStall')}</th>
              <th className="px-2 py-1.5 font-medium">{t('admin.eng.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {q.data.items.map((e) => (
              <tr
                key={e.id}
                className={[
                  'border-t border-line-soft align-top',
                  e.stalled ? 'bg-amber-50' : '',
                ].join(' ')}
              >
                <td className="px-2 py-1.5">
                  <div className="max-w-[200px] [overflow-wrap:anywhere]">
                    {e.briefTitle || e.briefId.slice(0, 8)}
                  </div>
                </td>
                <td className="px-2 py-1.5">{e.professionalDisplayName}</td>
                <td className="px-2 py-1.5">{e.clientDisplayName}</td>
                <td className="px-2 py-1.5">{e.status}</td>
                <td className="px-2 py-1.5 tabular-nums">{e.hoursInState}h</td>
                <td className="px-2 py-1.5">
                  {e.stalled ? (
                    <span className="rounded-full bg-amber-100 px-sm text-amber-800">
                      {e.stallReason === 'past_respond_by'
                        ? t('admin.eng.stallRespondBy')
                        : t('admin.eng.stall30d')}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    className="tap-target inline-flex items-center rounded-md border border-line px-3 text-sm hover:bg-line-soft"
                    onClick={() => {
                      setEditId(e.id);
                      setNextStatus(e.status);
                      setErr(null);
                    }}
                  >
                    {t('admin.eng.changeStatus')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {editId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-lg">
          <div className="w-full max-w-sm rounded-bubble border border-line bg-white p-xl shadow-lg">
            <h3 className="font-display text-title text-ink-900">
              {t('admin.eng.changeStatus')}
            </h3>
            <select
              className="tap-target mt-md w-full rounded-2md border border-line bg-paper px-md text-body-sm outline-none focus:border-jade-400 focus:shadow-focus"
              value={nextStatus}
              onChange={(e) =>
                setNextStatus(e.target.value as EngagementStatus)
              }
            >
              {STATUSES.filter(Boolean).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {err ? <p className="mt-md text-caption text-danger">{err}</p> : null}
            <div className="mt-lg flex flex-col-reverse gap-sm sm:flex-row sm:justify-end">
              <button
                type="button"
                className="tap-target inline-flex items-center justify-center rounded-2md px-md text-body-sm text-ink-500"
                onClick={() => setEditId(null)}
              >
                {t('common.back')}
              </button>
              <button
                type="button"
                disabled={patch.isPending}
                className="tap-target inline-flex items-center justify-center rounded-2md bg-jade-600 px-lg text-body-sm text-white shadow-cta disabled:opacity-50"
                onClick={() => patch.mutate()}
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
