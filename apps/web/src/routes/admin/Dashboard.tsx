import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchAdminDashboard } from '../../features/admin/api';
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
    return <p className="text-sm text-ink-500">{t('common.loading')}</p>;
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
      <h1 className="mb-3 text-base font-semibold">{t('admin.dash.title')}</h1>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {cells.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="rounded border border-line bg-white px-3 py-2 hover:border-jade-400"
          >
            <div className="text-[11px] uppercase tracking-wide text-ink-500">
              {c.label}
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums text-ink-900">
              {c.value}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
