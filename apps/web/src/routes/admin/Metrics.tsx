import { useQuery } from '@tanstack/react-query';
import { fetchAdminMetrics } from '../../features/admin/api';
import { AdminMetricsSkeleton } from '../../features/admin/AdminSkeletons';
import { useI18n } from '../../lib/i18n';

function pct(rate: number): string {
  return `${Math.round(rate * 1000) / 10}%`;
}

export default function AdminMetrics() {
  const { t } = useI18n();
  const q = useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: fetchAdminMetrics,
    staleTime: 30_000,
  });

  if (q.isLoading) {
    return <AdminMetricsSkeleton />;
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

  const m = q.data;

  return (
    <div>
      <h1 className="mb-3 text-base font-semibold">{t('admin.metrics.title')}</h1>

      <div className="mb-3 rounded border-2 border-jade-600 bg-jade-50 px-4 py-3">
        <div className="text-[11px] uppercase tracking-wide text-jade-800">
          {t('admin.metrics.repeatRate')}
        </div>
        <div className="mt-1 text-3xl font-semibold tabular-nums text-jade-900">
          {pct(m.clientRepeatRate)}
        </div>
        <p className="mt-1 text-xs text-jade-800">{t('admin.metrics.repeatHint')}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {[
          { label: t('admin.metrics.briefsCreated'), value: String(m.briefsCreated) },
          { label: t('admin.metrics.matchRate'), value: pct(m.matchRate) },
          {
            label: t('admin.metrics.completionRate'),
            value: pct(m.completionRate),
          },
          {
            label: t('admin.metrics.fallbackRate'),
            value: pct(m.fallbackRate),
          },
          {
            label: t('admin.metrics.aiCostWeek'),
            value: `$${m.aiCostUsdThisWeek.toFixed(4)}`,
          },
          {
            label: t('admin.metrics.rankedFallback'),
            value: `${m.briefsWithFallback} / ${m.briefsRanked}`,
          },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded border border-line bg-white px-3 py-2"
          >
            <div className="text-[11px] uppercase tracking-wide text-ink-500">
              {c.label}
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
