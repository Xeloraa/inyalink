import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import {
  AccountMenu,
  isApprovedProfessional,
  isActiveProfessional,
  useMyProfessional,
} from './AccountMenu';
import { LogoMark } from './Logo';
import { NotificationBell } from '../features/notifications/NotificationBell';

/** Header nav never mid-word wraps — body uses overflow-wrap:anywhere for Burmese. */
const NAV_LINK =
  'tap-target hidden min-[420px]:inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-2sm px-[13px] py-[9px] text-[13.5px] font-medium text-ink-700 no-underline [overflow-wrap:normal] transition-colors duration-fast ease-out hover:bg-hover hover:text-jade-600 focus-visible:shadow-focus active:text-jade-800';

const NAV_LINK_DARK =
  'tap-target hidden min-[420px]:inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-2sm px-[13px] py-[9px] text-[13.5px] font-medium text-white no-underline [overflow-wrap:normal] transition-colors duration-fast ease-out hover:bg-[rgba(255,255,255,0.10)] focus-visible:shadow-focus active:text-jade-100';

const QUIET_LINK =
  'tap-target hidden min-[520px]:inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-2sm px-[13px] py-[9px] text-[13.5px] font-medium text-ink-400 no-underline [overflow-wrap:normal] transition-colors duration-fast ease-out hover:text-jade-600 focus-visible:shadow-focus active:text-jade-800';

const QUIET_LINK_DARK =
  'tap-target hidden min-[520px]:inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-2sm px-[13px] py-[9px] text-[13.5px] font-medium text-jade-200 no-underline [overflow-wrap:normal] transition-colors duration-fast ease-out hover:text-white focus-visible:shadow-focus active:text-jade-100';

const MENU_ITEM =
  'tap-target flex w-full items-center whitespace-nowrap rounded-sm px-lg text-[13px] font-medium text-ink-700 no-underline [overflow-wrap:normal] transition-colors duration-fast ease-out hover:bg-jade-50 hover:text-jade-600 focus-visible:shadow-focus active:bg-jade-100';

function langButtonClass(active: boolean, dark: boolean): string {
  return `inline-flex min-h-[36px] min-w-[36px] shrink-0 items-center justify-center whitespace-nowrap rounded-full px-2.5 text-[12px] font-semibold [overflow-wrap:normal] transition-colors duration-fast ease-out focus-visible:shadow-focus ${
    active
      ? 'bg-jade-600 text-white hover:bg-jade-400 active:bg-jade-800'
      : dark
        ? 'text-jade-200 hover:text-white'
        : 'text-ink-500 hover:text-ink-900'
  }`;
}

function BurgerIcon({ open }: { open: boolean }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      aria-hidden
      focusable={false}
    >
      {open ? (
        <path d="M6 6l12 12M18 6 6 18" />
      ) : (
        <path d="M4 7h16M4 12h16M4 17h16" />
      )}
    </svg>
  );
}

function LanguageToggle({
  locale,
  setLocale,
  t,
  dark = false,
}: {
  locale: 'my' | 'en';
  setLocale: (locale: 'my' | 'en') => void;
  t: (key: string) => string;
  dark?: boolean;
}) {
  return (
    <div
      className={`flex shrink-0 flex-nowrap items-center gap-0.5 rounded-full p-0.5 sm:gap-xs ${dark ? 'bg-[rgba(255,255,255,0.10)]' : 'bg-line-track'}`}
      role="group"
      aria-label={t('header.language')}
    >
      <button
        type="button"
        className={langButtonClass(locale === 'my', dark)}
        onClick={() => setLocale('my')}
        aria-pressed={locale === 'my'}
      >
        {t('header.langMy')}
      </button>
      <button
        type="button"
        className={langButtonClass(locale === 'en', dark)}
        onClick={() => setLocale('en')}
        aria-pressed={locale === 'en'}
      >
        {t('header.langEn')}
      </button>
    </div>
  );
}

export function Header() {
  const { locale, setLocale, t } = useI18n();
  const { session, loading } = useAuth();
  const isLanding = useLocation().pathname === '/';
  const pro = useMyProfessional();
  const approvedPro = isApprovedProfessional(pro);
  const showProJoin = !isActiveProfessional(pro);
  const isAdmin = Boolean(session?.isAdmin);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(
    null,
  );

  const mountAccountMenu = !loading && Boolean(session);
  const workLabel = approvedPro ? t('header.myWork') : t('header.myBriefs');

  useEffect(() => {
    if (!menuOpen) return;

    function placeMenu() {
      const button = buttonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }

    placeMenu();
    window.addEventListener('resize', placeMenu);
    window.addEventListener('scroll', placeMenu, true);

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        menuRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      setMenuOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('resize', placeMenu);
      window.removeEventListener('scroll', placeMenu, true);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const menu =
    menuOpen && menuPos
      ? createPortal(
          <div
            ref={menuRef}
            id="header-menu"
            role="menu"
            style={{ top: menuPos.top, right: menuPos.right }}
            className="fixed z-[100] w-52 rounded-md border border-line bg-white p-xs shadow-md"
          >
            <Link
              to="/browse"
              role="menuitem"
              className={MENU_ITEM}
              onClick={() => setMenuOpen(false)}
            >
              {t('header.browse')}
            </Link>
            <Link
              to="/app/briefs"
              role="menuitem"
              className={MENU_ITEM}
              onClick={() => setMenuOpen(false)}
            >
              {workLabel}
            </Link>
            <Link
              to="/app/engagements"
              role="menuitem"
              className={MENU_ITEM}
              onClick={() => setMenuOpen(false)}
            >
              {t('header.messages')}
            </Link>
            {isAdmin ? (
              <Link
                to="/admin"
                role="menuitem"
                className={MENU_ITEM}
                onClick={() => setMenuOpen(false)}
              >
                {t('header.admin')}
              </Link>
            ) : null}
            {showProJoin ? (
              <Link
                to="/professionals/join"
                role="menuitem"
                className={MENU_ITEM}
                onClick={() => setMenuOpen(false)}
              >
                {t('header.proJoin')}
              </Link>
            ) : null}
            <div className="my-xs border-t border-line-soft px-sm py-xs">
              <LanguageToggle locale={locale} setLocale={setLocale} t={t} />
            </div>
            {!loading && !session ? (
              <Link
                to="/login"
                role="menuitem"
                className={MENU_ITEM}
                onClick={() => setMenuOpen(false)}
              >
                {t('header.login')}
              </Link>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <header
      className={`sticky top-0 z-50 [overflow-wrap:normal] ${
        isLanding
          ? 'border-b border-[rgba(255,255,255,0.10)] bg-jade-900'
          : 'border-b border-line bg-page/90 backdrop-blur-[14px]'
      }`}
    >
      <div className="mx-auto flex max-w-container flex-nowrap items-center justify-between gap-1 px-[22px] py-[14px] sm:gap-sm">
        <Link
          to="/"
          className={`inline-flex shrink-0 items-center gap-xs whitespace-nowrap font-display text-[17px] font-semibold no-underline [overflow-wrap:normal] transition-colors duration-fast ease-out focus-visible:rounded-2sm sm:gap-sm ${
            isLanding
              ? 'text-white hover:text-jade-100 active:text-jade-200'
              : 'text-ink-900 hover:text-jade-600 active:text-jade-800'
          }`}
        >
          <span className={isLanding ? 'text-jade-bright' : 'text-jade-600'}>
            <LogoMark size={20} />
          </span>
          {t('app.name')}
        </Link>

        <nav
          className="flex flex-nowrap items-center gap-0.5 sm:gap-xs"
          aria-label={t('header.nav')}
        >
          <Link to="/browse" className={isLanding ? NAV_LINK_DARK : NAV_LINK}>
            {t('header.browse')}
          </Link>
          <Link to="/app/briefs" className={isLanding ? NAV_LINK_DARK : NAV_LINK}>
            {workLabel}
          </Link>
          <Link to="/app/engagements" className={isLanding ? NAV_LINK_DARK : NAV_LINK}>
            {t('header.messages')}
          </Link>
          {isAdmin ? (
            <Link to="/admin" className={isLanding ? NAV_LINK_DARK : NAV_LINK}>
              {t('header.admin')}
            </Link>
          ) : null}
          {showProJoin ? (
            <Link
              to="/professionals/join"
              className={isLanding ? QUIET_LINK_DARK : QUIET_LINK}
            >
              {t('header.proJoin')}
            </Link>
          ) : null}

          {/* Below 420px the nav links collapse into this menu; the header row never wraps. */}
          <div className="relative min-[420px]:hidden">
            <button
              ref={buttonRef}
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="header-menu"
              aria-haspopup="menu"
              aria-label={t('header.menu')}
              className={`tap-target inline-flex items-center justify-center rounded-2sm transition-colors duration-fast ease-out focus-visible:shadow-focus ${
                isLanding
                  ? 'text-white hover:text-jade-100 active:text-jade-200'
                  : 'text-ink-700 hover:text-jade-600 active:text-jade-800'
              }`}
            >
              <BurgerIcon open={menuOpen} />
            </button>
            {menu}
          </div>

          {!loading && !session ? (
            <Link to="/login" className={isLanding ? NAV_LINK_DARK : NAV_LINK}>
              {t('header.login')}
            </Link>
          ) : null}

          <div className="hidden min-[420px]:block">
            <LanguageToggle
              locale={locale}
              setLocale={setLocale}
              t={t}
              dark={isLanding}
            />
          </div>

          {mountAccountMenu ? <NotificationBell /> : null}

          {loading ? (
            <div
              aria-hidden
              data-avatar-slot="loading"
              className={`h-9 w-9 shrink-0 rounded-full ring-1 ${
                isLanding
                  ? 'bg-[rgba(255,255,255,0.10)] ring-[rgba(255,255,255,0.20)]'
                  : 'bg-jade-100 ring-jade-600/20'
              }`}
            />
          ) : mountAccountMenu ? (
            <AccountMenu pro={pro} />
          ) : null}
        </nav>
      </div>
    </header>
  );
}
