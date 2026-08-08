import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import type { ProfessionalMe } from '@inyalink/shared';
import { getMyProfessional } from '../lib/api';
import { ApiError } from '../lib/apiClient';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';

const MENU_ITEM =
  'tap-target flex w-full items-center whitespace-nowrap rounded-sm px-lg text-[13px] font-medium text-ink-700 no-underline [overflow-wrap:normal] transition-colors duration-fast ease-out hover:bg-jade-50 hover:text-jade-600 focus-visible:shadow-focus active:bg-jade-100';

function initialsFromName(name: string): string {
  const parts = name
    .replace(/·/g, ' ')
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const latin = parts.filter((p) => /[A-Za-z]/.test(p));
  const source = latin.length > 0 ? latin : parts;
  const letters = source
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
  return letters || '?';
}

/** Loads `/professionals/me` for the signed-in user; `null` = not a pro. */
export function useMyProfessional(): ProfessionalMe | null | undefined {
  const { session } = useAuth();
  const [pro, setPro] = useState<ProfessionalMe | null | undefined>(undefined);

  useEffect(() => {
    if (!session) {
      setPro(null);
      return;
    }
    let cancelled = false;
    void getMyProfessional()
      .then((me) => {
        if (!cancelled) setPro(me);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setPro(null);
          return;
        }
        setPro(null);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  return pro;
}

export function isActiveProfessional(
  pro: ProfessionalMe | null | undefined,
): pro is ProfessionalMe {
  return (
    pro !== undefined &&
    pro !== null &&
    (pro.status === 'pending' || pro.status === 'approved')
  );
}

/**
 * Signed-in avatar control between language toggle and the far right.
 * Photo when available; otherwise initials from display name.
 */
export function AccountMenu({
  pro,
}: {
  pro: ProfessionalMe | null | undefined;
}) {
  const { t } = useI18n();
  const { session, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;

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
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('resize', placeMenu);
      window.removeEventListener('scroll', placeMenu, true);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!session) return null;

  const activePro = isActiveProfessional(pro) ? pro : null;
  const avatarUrl = activePro?.avatarUrl ?? null;
  const initials = initialsFromName(session.displayName);

  const menu =
    open && menuPos
      ? createPortal(
          <div
            ref={menuRef}
            id="account-menu"
            role="menu"
            style={{ top: menuPos.top, right: menuPos.right }}
            className="fixed z-[100] w-52 rounded-md border border-line bg-white p-xs shadow-lg"
          >
            {activePro ? (
              <>
                <Link
                  to={`/professionals/${activePro.id}`}
                  role="menuitem"
                  className={MENU_ITEM}
                  onClick={() => setOpen(false)}
                >
                  {t('header.myProfile')}
                </Link>
                <Link
                  to="/professionals/me/edit"
                  role="menuitem"
                  className={MENU_ITEM}
                  onClick={() => setOpen(false)}
                >
                  {t('header.editProfile')}
                </Link>
                <Link
                  to="/app/briefs"
                  role="menuitem"
                  className={MENU_ITEM}
                  onClick={() => setOpen(false)}
                >
                  {t('header.myBriefs')}
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/app/briefs"
                  role="menuitem"
                  className={MENU_ITEM}
                  onClick={() => setOpen(false)}
                >
                  {t('header.myBriefs')}
                </Link>
                <Link
                  to="/professionals/join"
                  role="menuitem"
                  className={MENU_ITEM}
                  onClick={() => setOpen(false)}
                >
                  {t('header.becomePro')}
                </Link>
              </>
            )}
            <div className="my-xs border-t border-line-soft" />
            <button
              type="button"
              role="menuitem"
              className={MENU_ITEM}
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
            >
              {t('header.signOut')}
            </button>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="account-menu"
        aria-haspopup="menu"
        aria-label={t('header.accountMenu')}
        className="tap-target inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-jade-50 text-[11px] font-semibold text-jade-800 transition-colors duration-fast ease-out hover:border-jade-400 focus-visible:shadow-focus sm:h-10 sm:w-10 sm:text-[12px]"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden>{initials}</span>
        )}
      </button>
      {menu}
    </>
  );
}
