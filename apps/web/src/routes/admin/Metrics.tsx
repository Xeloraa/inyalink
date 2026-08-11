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
      <h1 className="mb-lg font-display text-title text-ink-900">
        {t('admin.metrics.title')}
      </h1>

      <div className="mb-lg rounded-bubble border border-jade-200 bg-jade-50 px-xl py-lg shadow-sm">
        <div className="text-caption uppercase tracking-wide text-jade-800">
          {t('admin.metrics.repeatRate')}
        </div>
        <div className="mt-sm text-stat tabular-nums text-jade-900">
          {pct(m.clientRepeatRate)}
        </div>
        <p className="mt-sm text-caption text-jade-800">
          {t('admin.metrics.repeatHint')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-md md:grid-cols-3">
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
            className="rounded-2md border border-line bg-white px-lg py-md shadow-sm"
          >
            <div className="text-caption uppercase tracking-wide text-ink-500">
              {c.label}
            </div>
            <div className="mt-sm text-stat tabular-nums text-ink-900">
              {c.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
