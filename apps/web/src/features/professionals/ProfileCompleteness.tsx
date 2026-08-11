import { Link } from 'react-router-dom';
import type { ProfessionalCompletenessMissingItem } from '@inyalink/shared';
import { useI18n } from '../../lib/i18n';

type ProfileCompletenessProps = {
  percent: number;
  missing: ProfessionalCompletenessMissingItem[];
  /** Same-page anchors vs links to the edit route. */
  mode: 'edit' | 'profile';
};

function fieldLabel(
  t: (key: string) => string,
  key: ProfessionalCompletenessMissingItem['key'],
): string {
  return t(`completeness.field.${key}`);
}

export function focusCompletenessAnchor(anchor: string) {
  const el = document.getElementById(anchor);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const focusTarget =
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement ||
    el instanceof HTMLButtonElement
      ? el
      : el.querySelector<HTMLElement>(
          'input:not([type="hidden"]), textarea, select, button',
        );
  focusTarget?.focus({ preventScroll: true });
}

export function ProfileCompleteness({
  percent,
  missing,
  mode,
}: ProfileCompletenessProps) {
  const { t } = useI18n();

  if (missing.length === 0) {
    return (
      <aside
        className="rounded-2md bg-jade-50 px-lg py-lg"
        aria-label={t('completeness.title')}
      >
        <p className="text-body-sm font-medium text-jade-800 [overflow-wrap:anywhere] [line-height:1.8]">
          {t('completeness.complete')}
        </p>
      </aside>
    );
  }

  return (
    <aside
      className="rounded-2md bg-page px-lg py-lg"
      aria-label={t('completeness.title')}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-sm">
        <h2 className="text-[15px] font-bold tracking-[0.02em] text-ink-900 [overflow-wrap:anywhere] [line-height:1.8]">
          {t('completeness.title')}
        </h2>
        <p className="text-body font-medium text-jade-600">
          {t('completeness.percent').replace('{percent}', String(percent))}
        </p>
      </div>
      <div
        className="mt-md h-1.5 overflow-hidden rounded-full bg-jade-100"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('completeness.percent').replace(
          '{percent}',
          String(percent),
        )}
      >
        <div
          className="h-full rounded-full bg-jade-600 transition-[width] duration-fast ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-md text-body-sm text-ink-500 [overflow-wrap:anywhere] [line-height:1.8]">
        {t('completeness.missingTitle')}
      </p>
      <ul className="mt-sm space-y-xs">
        {missing.map((item) => {
          const label = fieldLabel(t, item.key);
          if (mode === 'edit') {
            return (
              <li key={item.key}>
                <a
                  href={`#${item.anchor}`}
                  className="tap-target text-body-sm text-jade-700 underline-offset-2 [overflow-wrap:anywhere] [line-height:1.8] hover:text-jade-600 hover:underline focus-visible:shadow-focus"
                  onClick={(e) => {
                    e.preventDefault();
                    const url = `${window.location.pathname}${window.location.search}#${item.anchor}`;
                    window.history.replaceState(null, '', url);
                    focusCompletenessAnchor(item.anchor);
                  }}
                >
                  {label}
                </a>
              </li>
            );
          }
          return (
            <li key={item.key}>
              <Link
                to={`/professionals/me/edit#${item.anchor}`}
                className="tap-target text-body-sm text-jade-700 underline-offset-2 [overflow-wrap:anywhere] [line-height:1.8] hover:text-jade-600 hover:underline focus-visible:shadow-focus"
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
