import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { LogoMark } from './Logo';

/** Header nav never mid-word wraps — body uses overflow-wrap:anywhere for Burmese. */
const NAV_LINK =
  'tap-target hidden min-[420px]:inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md px-1.5 text-[12px] font-medium text-ink-700 no-underline [overflow-wrap:normal] transition-colors duration-fast ease-out hover:text-jade-600 focus-visible:shadow-focus active:text-jade-800 sm:px-sm sm:text-[13px]';

const QUIET_LINK =
  'tap-target hidden min-[520px]:inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md px-1.5 text-[12px] font-medium text-ink-400 no-underline [overflow-wrap:normal] transition-colors duration-fast ease-out hover:text-jade-600 focus-visible:shadow-focus active:text-jade-800 sm:px-sm sm:text-[13px]';

const MENU_ITEM =
  'tap-target flex w-full items-center whitespace-nowrap rounded-sm px-lg text-[13px] font-medium text-ink-700 no-underline [overflow-wrap:normal] transition-colors duration-fast ease-out hover:bg-jade-50 hover:text-jade-600 focus-visible:shadow-focus active:bg-jade-100';

function langButtonClass(active: boolean): string {
  return `inline-flex min-h-[40px] min-w-[36px] shrink-0 items-center justify-center whitespace-nowrap rounded-md px-1.5 text-[12px] font-medium [overflow-wrap:normal] transition-colors duration-fast ease-out focus-visible:shadow-focus sm:min-h-[48px] sm:min-w-[44px] sm:px-sm sm:text-[13px] ${
    active
      ? 'bg-jade-600 text-white hover:bg-jade-400 active:bg-jade-800'
      : 'text-ink-500 hover:bg-jade-50 hover:text-ink-900 active:bg-jade-100'
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

export function Header() {
  const { locale, setLocale, t } = useI18n();
  const { session, loading, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className="border-b border-line bg-paper/90 backdrop-blur-sm [overflow-wrap:normal]">
      <div className="mx-auto flex max-w-container flex-nowrap items-center justify-between gap-1 px-3 py-xs sm:gap-sm sm:px-4 sm:py-sm md:px-8 lg:px-6">
        <Link
          to="/"
          className="inline-flex shrink-0 items-center gap-xs whitespace-nowrap font-display text-[15px] font-semibold text-ink-900 no-underline [overflow-wrap:normal] transition-colors duration-fast ease-out hover:text-jade-600 focus-visible:rounded-sm active:text-jade-800 sm:gap-sm sm:text-title"
        >
          <span className="text-jade-600">
            <LogoMark size={20} />
          </span>
          {t('app.name')}
        </Link>

        <nav
          className="flex flex-nowrap items-center gap-0.5 sm:gap-xs"
          aria-label={t('header.nav')}
        >
          <Link to="/browse" className={NAV_LINK}>
            {t('header.browse')}
          </Link>
          <Link to="/app/briefs" className={NAV_LINK}>
            {t('header.proFeed')}
          </Link>
          <Link to="/profile/create" className={QUIET_LINK}>
            {t('header.proJoin')}
          </Link>

          {/* Below 420px the nav links collapse into this menu; the header row never wraps. */}
          <div ref={menuRef} className="relative min-[420px]:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="header-menu"
              aria-label={t('header.menu')}
              className="tap-target inline-flex items-center justify-center rounded-md text-ink-700 transition-colors duration-fast ease-out hover:text-jade-600 focus-visible:shadow-focus active:text-jade-800"
            >
              <BurgerIcon open={menuOpen} />
            </button>
            {menuOpen ? (
              <div
                id="header-menu"
                className="absolute right-0 top-full z-50 mt-xs w-52 rounded-md border border-line bg-white p-xs shadow-lg"
              >
                <Link
                  to="/browse"
                  className={MENU_ITEM}
                  onClick={() => setMenuOpen(false)}
                >
                  {t('header.browse')}
                </Link>
                <Link
                  to="/app/briefs"
                  className={MENU_ITEM}
                  onClick={() => setMenuOpen(false)}
                >
                  {t('header.proFeed')}
                </Link>
                <Link
                  to="/profile/create"
                  className={MENU_ITEM}
                  onClick={() => setMenuOpen(false)}
                >
                  {t('header.proJoin')}
                </Link>
                {!loading && !session ? (
                  <Link
                    to="/login"
                    className={MENU_ITEM}
                    onClick={() => setMenuOpen(false)}
                  >
                    {t('header.login')}
                  </Link>
                ) : null}
                {!loading && session ? (
                  <button
                    type="button"
                    className={MENU_ITEM}
                    onClick={() => {
                      setMenuOpen(false);
                      void signOut();
                    }}
                  >
                    {t('header.signOut')}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {!loading && !session ? (
            <Link to="/login" className={NAV_LINK}>
              {t('header.login')}
            </Link>
          ) : null}
          {!loading && session ? (
            <button
              type="button"
              onClick={() => void signOut()}
              className={NAV_LINK}
            >
              {t('header.signOut')}
            </button>
          ) : null}

          <div
            className="flex shrink-0 flex-nowrap items-center gap-0.5 sm:gap-xs"
            role="group"
            aria-label={t('header.language')}
          >
            <button
              type="button"
              className={langButtonClass(locale === 'my')}
              onClick={() => setLocale('my')}
              aria-pressed={locale === 'my'}
            >
              {t('header.langMy')}
            </button>
            <button
              type="button"
              className={langButtonClass(locale === 'en')}
              onClick={() => setLocale('en')}
              aria-pressed={locale === 'en'}
            >
              {t('header.langEn')}
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
