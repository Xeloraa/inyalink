import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Notification } from '@inyalink/shared';
import {
  listNotifications,
  markNotificationRead,
} from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';

const PANEL_ITEM =
  'flex w-full flex-col gap-0.5 rounded-sm px-md py-sm text-left no-underline transition-colors duration-fast ease-out hover:bg-jade-50 focus-visible:shadow-focus';

function BellIcon({ size = 20 }: { size?: number }) {
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
      <path d="M10 5a2 2 0 0 1 4 0 7 7 0 0 1 4 6v3a4 4 0 0 0 2 3H4a4 4 0 0 0 2-3v-3a7 7 0 0 1 4-6" />
      <path d="M9 18v1a3 3 0 0 0 6 0v-1" />
    </svg>
  );
}

function titleFor(
  n: Notification,
  t: (key: string) => string,
): string {
  const brief = n.meta.briefTitle?.trim() || t('notifications.fallbackBrief');
  const name =
    n.meta.professionalName?.trim() || t('notifications.fallbackName');
  return t(`notifications.type.${n.type}`)
    .replace('{brief}', brief)
    .replace('{name}', name);
}

function relativeTime(iso: string, t: (key: string) => string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return '';
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return t('notifications.justNow');
  if (mins < 60) return t('notifications.minsAgo').replace('{n}', String(mins));
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return t('notifications.hoursAgo').replace('{n}', String(hours));
  }
  const days = Math.floor(hours / 24);
  return t('notifications.daysAgo').replace('{n}', String(days));
}

export function NotificationBell() {
  const { session } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  const listQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: listNotifications,
    enabled: Boolean(session),
    refetchInterval: 60_000,
  });

  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  useEffect(() => {
    if (!open) return;

    function place() {
      const button = buttonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      setPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        panelRef.current?.contains(target) ||
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
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!session) return null;

  const unread = listQuery.data?.unreadCount ?? 0;
  const items = listQuery.data?.notifications ?? [];
  const unreadLabel =
    unread > 99 ? '99+' : unread > 0 ? String(unread) : null;

  async function onClickItem(n: Notification) {
    if (!n.readAt) {
      try {
        await markRead.mutateAsync(n.id);
      } catch {
        /* navigation still proceeds */
      }
    }
    setOpen(false);
  }

  const panel =
    open && pos
      ? createPortal(
          <div
            ref={panelRef}
            id="notification-panel"
            role="dialog"
            aria-label={t('notifications.title')}
            style={{ top: pos.top, right: pos.right }}
            className="fixed z-[100] w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-md border border-line bg-white shadow-lg"
          >
            <div className="border-b border-line-soft px-md py-sm">
              <p className="text-[13px] font-semibold text-ink-900">
                {t('notifications.title')}
              </p>
            </div>
            {listQuery.isLoading ? (
              <p className="px-md py-lg text-[13px] text-ink-500">
                {t('common.loading')}
              </p>
            ) : listQuery.isError ? (
              <p className="px-md py-lg text-[13px] text-danger" role="alert">
                {t('notifications.loadError')}
              </p>
            ) : items.length === 0 ? (
              <p className="px-md py-lg text-[13px] text-ink-500">
                {t('notifications.empty')}
              </p>
            ) : (
              <ul className="max-h-[min(24rem,60vh)] overflow-y-auto p-xs">
                {items.map((n) => {
                  const unreadItem = !n.readAt;
                  return (
                    <li key={n.id}>
                      <Link
                        to={n.href}
                        className={`${PANEL_ITEM} ${
                          unreadItem ? 'bg-jade-50/60' : ''
                        }`}
                        onClick={() => {
                          void onClickItem(n);
                        }}
                      >
                        <span
                          className={`text-[13px] leading-[1.8] [overflow-wrap:anywhere] ${
                            unreadItem
                              ? 'font-semibold text-ink-900'
                              : 'font-medium text-ink-700'
                          }`}
                        >
                          {titleFor(n, t)}
                        </span>
                        <span className="text-[11px] text-ink-400">
                          {relativeTime(n.createdAt, t)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="notification-panel"
        aria-haspopup="dialog"
        aria-label={
          unreadLabel
            ? t('notifications.bellUnread').replace('{n}', unreadLabel)
            : t('notifications.bell')
        }
        className="tap-target relative inline-flex items-center justify-center rounded-md text-ink-700 transition-colors duration-fast ease-out hover:text-jade-600 focus-visible:shadow-focus active:text-jade-800"
      >
        <BellIcon />
        {unreadLabel ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-jade-600 px-1 text-[10px] font-semibold leading-none text-white">
            {unreadLabel}
          </span>
        ) : null}
      </button>
      {panel}
    </div>
  );
}
