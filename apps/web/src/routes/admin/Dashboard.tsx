import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchAdminDashboard } from '../../features/admin/api';
import { AdminDashboardSkeleton } from '../../features/admin/AdminSkeletons';
import { useI18n } from '../../lib/i18n';

function pct(rate: number): string {
  return `${Math.round(rate * 1000) / 10}%`;
}

export default function AdminDashboard() {
  const { t } = useI18n();
  const q = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: fetchAdminDashboard,
    staleTime: 15_000,
  });

  if (q.isLoading) {
    return <AdminDashboardSkeleton />;
  }
  if (q.isError || !q.data) {
    return (
      <p className="text-body-sm text-danger">
        {t('admin.loadError')}{' '}
        <button type="button" className="underline" onClick={() => void q.refetch()}>
          {t('common.retry')}
        </button>
      </p>
    );
  }

  const d = q.data;
  const cells = [
    {
      label: t('admin.dash.pendingPros'),
      value: String(d.pendingProfessionals),
      to: '/admin/professionals',
    },
    {
      label: t('admin.dash.openBriefs'),
      value: String(d.openBriefs),
      to: '/admin/briefs',
    },
    {
      label: t('admin.dash.activeEngagements'),
      value: String(d.activeEngagements),
      to: '/admin/engagements',
    },
    {
      label: t('admin.dash.fallbackRate'),
      value: pct(d.fallbackRate),
      to: '/admin/metrics',
    },
    {
      label: t('admin.dash.aiCostWeek'),
      value: `$${d.aiCostUsdThisWeek.toFixed(4)}`,
      to: '/admin/metrics',
    },
  ];

  return (
    <div>
      <h1 className="mb-lg font-display text-title text-ink-900">
        {t('admin.dash.title')}
      </h1>
      <div className="grid grid-cols-2 gap-md md:grid-cols-5">
        {cells.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="tap-target flex min-h-[72px] flex-col justify-center rounded-2md border border-line bg-white px-lg py-lg shadow-sm transition-colors duration-fast ease-out hover:bg-hover hover:border-jade-200"
          >
            <div className="text-caption uppercase tracking-wide text-ink-500 [overflow-wrap:anywhere]">
              {c.label}
            </div>
            <div className="mt-sm text-stat tabular-nums text-ink-900">
              {c.value}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
