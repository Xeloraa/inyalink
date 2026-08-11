import { useEffect, useId, useRef, type RefObject } from 'react';
import { useI18n } from '../../lib/i18n';
import { SearchIcon } from './icons';

/**
 * Centered square search dialog — same size on mobile and desktop.
 * Esc + backdrop close; focus moves to the input on open and returns to
 * the trigger on close.
 */
export function SearchDialog({
  open,
  onClose,
  search,
  onSearch,
  returnFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  search: string;
  onSearch: (value: string) => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('keydown', onKeyDown);
      const restore = returnFocusRef.current ?? prev;
      restore?.focus?.();
    };
  }, [open, onClose, returnFocusRef]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-scrim p-4 animate-fade-in"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex h-[min(560px,calc(100vw-32px))] w-[min(560px,calc(100vw-32px))] max-h-[min(560px,calc(100dvh-32px))] flex-col rounded-sheet bg-white p-xl shadow-lg animate-fade-up"
      >
        <div className="flex items-center justify-between gap-md">
          <h2 id={titleId} className="font-display text-title text-ink-900">
            {t('browse.searchDialogTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="tap-target inline-flex items-center justify-center rounded-2sm px-md text-body-sm font-medium text-ink-500 transition-colors duration-fast ease-out hover:text-ink-900 focus-visible:shadow-focus"
          >
            {t('browse.searchDialogClose')}
          </button>
        </div>

        <div className="relative mt-lg">
          <span className="pointer-events-none absolute left-md top-1/2 -translate-y-1/2 text-ink-400">
            <SearchIcon />
          </span>
          <input
            ref={inputRef}
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            aria-label={t('browse.searchLabel')}
            placeholder={t('browse.searchPlaceholder')}
            className="h-12 w-full rounded-2md border-0 bg-page pl-[40px] pr-md text-body text-ink-900 outline-none transition-shadow duration-fast ease-out placeholder:text-ink-300 focus:shadow-focus"
          />
        </div>

        <p className="mt-md text-body-sm text-ink-500">
          {t('browse.subhead')}
        </p>
      </div>
    </div>
  );
}
