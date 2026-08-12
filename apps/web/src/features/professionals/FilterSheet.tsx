import { useEffect, useRef, type ReactNode } from 'react';
import { useI18n } from '../../lib/i18n';
import { ClearFiltersButton } from './FilterRail';
import { CloseIcon } from './icons';

/**
 * Bottom sheet for the advanced filter rail (skills + budget — quick
 * category/availability filters live inline in the toolbar). Filters
 * inside apply live; the primary button just confirms and closes. Esc,
 * backdrop tap, and the X all close it, and focus returns to whatever
 * opened it.
 */
export function FilterSheet({
  open,
  onClose,
  onClear,
  activeCount,
  resultsLabel,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onClear: () => void;
  activeCount: number;
  resultsLabel: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    openerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      openerRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        aria-hidden
        onClick={onClose}
        className="animate-fade-in absolute inset-0 bg-ink-900/40 motion-reduce:animate-none"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-sheet-title"
        className="animate-sheet-up absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-xl bg-white shadow-lg outline-none motion-reduce:animate-none"
      >
        <div className="flex items-center justify-between gap-md border-b border-line-soft px-lg py-sm">
          <h2
            id="filter-sheet-title"
            className="text-title font-semibold text-ink-900"
          >
            {t('browse.filters')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('browse.sheetClose')}
            className="tap-target inline-flex items-center justify-center rounded-md text-ink-500 transition-colors duration-fast ease-out hover:bg-jade-50 hover:text-ink-900 focus-visible:shadow-focus active:bg-jade-100"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-lg py-lg">
          {children}
        </div>

        <div className="flex items-center justify-between gap-md border-t border-line px-lg py-md pb-[max(12px,env(safe-area-inset-bottom))]">
          <ClearFiltersButton activeCount={activeCount} onClear={onClear} />
          <button
            type="button"
            onClick={onClose}
            className="tap-target inline-flex flex-1 items-center justify-center rounded-md bg-jade-600 px-lg text-body-sm font-medium text-white transition-colors duration-fast ease-out hover:bg-jade-400 focus-visible:shadow-focus active:bg-jade-800"
          >
            {resultsLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
