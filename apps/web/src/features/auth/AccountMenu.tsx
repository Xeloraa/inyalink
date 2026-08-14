import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import type { ProfessionalMe } from '@inyalink/shared';
import { getMyProfessional } from '../../lib/api';
import { ApiError } from '../../lib/apiClient';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';

const MENU_ITEM =
  'tap-target flex w-full items-center whitespace-nowrap rounded-sm px-lg text-[13px] font-medium text-ink-700 no-underline [overflow-wrap:normal] transition-colors duration-fast ease-out hover:bg-jade-50 hover:text-jade-600 focus-visible:shadow-focus active:bg-jade-100';

/** Tabler-style user-circle — inline SVG, no new dependency. */
function UserCircleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable={false}
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="10" r="3" />
      <path d="M6.168 18.849A4 4 0 0 1 10 16h4a4 4 0 0 1 3.834 2.855" />
    </svg>
  );
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
        // Unknown due to a failed request (network/CORS/5xx) — not the same
        // as a confirmed "not a professional". Leave pro as-is (undefined
        // while still loading) rather than asserting a fact we don't have;
        // confidently showing "not a pro" here hid the join CTA bug's real
        // cause behind what looked like a professional-status bug.
        console.error('Failed to load professional status', err);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  return pro;
}

/** Pending or approved — hides the “become a pro” CTA. */
export function isActiveProfessional(
  pro: ProfessionalMe | null | undefined,
): pro is ProfessionalMe {
  return (
    pro !== undefined &&
    pro !== null &&
    (pro.status === 'pending' || pro.status === 'approved')
  );
}

/** Approved only — full professional nav (My work, no owner briefs label). */
export function isApprovedProfessional(
  pro: ProfessionalMe | null | undefined,
): pro is ProfessionalMe {
  return pro !== undefined && pro !== null && pro.status === 'approved';
}

/**
 * Signed-in avatar control — far right of the header after EN.
 * Green initial avatar when no photo (mockup); photo when uploaded.
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

  const activePro = isActiveProfessional(pro) ? pro : null;
  const approvedPro = isApprovedProfessional(pro) ? pro : null;
  const avatarUrl = activePro?.avatarUrl ?? null;
  const initial = (activePro?.displayName ?? session?.displayName ?? '?')
    .trim()
    .slice(0, 1)
    .toUpperCase();

  if (!session) return null;

  const menu =
    open && menuPos
      ? createPortal(
          <div
            ref={menuRef}
            id="account-menu"
            role="menu"
            style={{ top: menuPos.top, right: menuPos.right }}
            className="fixed z-[100] w-52 rounded-md border border-line bg-white p-xs shadow-md"
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
                  {approvedPro ? t('header.myWork') : t('header.myBriefs')}
                </Link>
                <Link
                  to="/app/engagements"
                  role="menuitem"
                  className={MENU_ITEM}
                  onClick={() => setOpen(false)}
                >
                  {t('header.messages')}
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
                  to="/app/engagements"
                  role="menuitem"
                  className={MENU_ITEM}
                  onClick={() => setOpen(false)}
                >
                  {t('header.messages')}
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
            {session.isAdmin ? (
              <Link
                to="/admin"
                role="menuitem"
                className={MENU_ITEM}
                onClick={() => setOpen(false)}
              >
                {t('header.admin')}
              </Link>
            ) : null}
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
        className="tap-target inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-jade-100 text-[13px] font-semibold text-jade-600 transition-colors duration-fast ease-out hover:bg-jade-50 focus-visible:shadow-focus"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden>{initial || <UserCircleIcon size={18} />}</span>
        )}
      </button>
      {menu}
    </>
  );
}
