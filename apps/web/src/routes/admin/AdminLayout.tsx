import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { RequireAuth } from '../../components/RequireAuth';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';

const NAV = [
  { to: '/admin', end: true, key: 'admin.nav.dashboard' },
  { to: '/admin/professionals', end: false, key: 'admin.nav.professionals' },
  { to: '/admin/briefs', end: false, key: 'admin.nav.briefs' },
  { to: '/admin/engagements', end: false, key: 'admin.nav.engagements' },
  { to: '/admin/metrics', end: false, key: 'admin.nav.metrics' },
] as const;

function AdminGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const { t } = useI18n();
  const location = useLocation();

  if (loading) {
    return (
      <p className="py-12 text-center text-sm text-ink-500" role="status">
        {t('common.loading')}
      </p>
    );
  }

  if (!session?.isAdmin) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export default function AdminLayout() {
  const { t } = useI18n();

  return (
    <RequireAuth>
      <AdminGate>
        <div className="min-h-screen overflow-x-clip bg-[#f4f5f4] text-ink-900">
          <header className="border-b border-line bg-white">
            <div className="mx-auto flex max-w-[1400px] flex-col gap-sm px-4 py-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:px-3 sm:py-2">
              <a
                href="/"
                className="tap-target inline-flex items-center text-xs font-semibold tracking-wide text-jade-800"
              >
                {t('admin.brand')}
              </a>
              <nav
                className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 text-xs"
                aria-label={t('admin.navLabel')}
              >
                {NAV.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      [
                        'tap-target inline-flex shrink-0 items-center whitespace-nowrap rounded-md px-3',
                        isActive
                          ? 'bg-jade-100 font-medium text-jade-900'
                          : 'text-ink-600 hover:bg-line-soft',
                      ].join(' ')
                    }
                  >
                    {t(item.key)}
                  </NavLink>
                ))}
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-[1400px] px-4 py-4 sm:px-3 sm:py-3">
            <Outlet />
          </main>
        </div>
      </AdminGate>
    </RequireAuth>
  );
}
