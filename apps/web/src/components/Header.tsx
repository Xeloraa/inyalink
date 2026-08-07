import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

function LanguageToggle({
  locale,
  setLocale,
  t,
}: {
  locale: 'my' | 'en';
  setLocale: (locale: 'my' | 'en') => void;
  t: (key: string) => string;
}) {
  return (
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
  );
}

export function Header() {
  const { locale, setLocale, t } = useI18n();
  const { session, loading, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(
    null,
  );

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
            className="fixed z-[100] w-52 rounded-md border border-line bg-white p-xs shadow-lg"
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
              {t('header.proFeed')}
            </Link>
            <Link
              to="/professionals/join"
              role="menuitem"
              className={MENU_ITEM}
              onClick={() => setMenuOpen(false)}
            >
              {t('header.proJoin')}
            </Link>
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
            {!loading && session ? (
              <button
                type="button"
                role="menuitem"
                className={MENU_ITEM}
                onClick={() => {
                  setMenuOpen(false);
                  void signOut();
                }}
              >
                {t('header.signOut')}
              </button>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <header className="relative z-50 border-b border-line bg-paper/90 backdrop-blur-sm [overflow-wrap:normal]">
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
          <Link to="/professionals/join" className={QUIET_LINK}>
            {t('header.proJoin')}
          </Link>

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
              className="tap-target inline-flex items-center justify-center rounded-md text-ink-700 transition-colors duration-fast ease-out hover:text-jade-600 focus-visible:shadow-focus active:text-jade-800"
            >
              <BurgerIcon open={menuOpen} />
            </button>
            {menu}
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

          <div className="hidden min-[420px]:block">
            <LanguageToggle locale={locale} setLocale={setLocale} t={t} />
          </div>
        </nav>
      </div>
    </header>
  );
}
