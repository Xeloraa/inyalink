import { formatMmk } from '@inyalink/shared';
import { useI18n } from '../../lib/i18n';
import { BUDGET_MAX, BUDGET_MIN, BUDGET_STEP } from './filters';

function pct(value: number): number {
  return ((value - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * 100;
}

/**
 * Two-thumb MMK range slider built from two overlaid native range inputs, so
 * keyboard and screen-reader behaviour come for free. Thumb styling lives in
 * index.css under `.budget-range`.
 */
export function BudgetSlider({
  value,
  onChange,
}: {
  value: [number, number];
  onChange: (next: [number, number]) => void;
}) {
  const { t, locale } = useI18n();
  const [low, high] = value;

  const lowText = formatMmk(low, locale);
  const highText =
    high >= BUDGET_MAX ? `${formatMmk(high, locale)}+` : formatMmk(high, locale);

  return (
    <div>
      <div className="relative h-12">
        <div
          aria-hidden
          className="absolute inset-x-0 top-1/2 h-[4px] -translate-y-1/2 rounded-full bg-line"
        />
        <div
          aria-hidden
          className="absolute top-1/2 h-[4px] -translate-y-1/2 rounded-full bg-jade-600"
          style={{ left: `${pct(low)}%`, right: `${100 - pct(high)}%` }}
        />
        <input
          type="range"
          className="budget-range"
          min={BUDGET_MIN}
          max={BUDGET_MAX}
          step={BUDGET_STEP}
          value={low}
          onChange={(e) =>
            onChange([Math.min(Number(e.target.value), high), high])
          }
          aria-label={t('browse.budgetMin')}
          aria-valuetext={lowText}
          /* keep the low thumb reachable when both thumbs rest at the far end */
          style={{ zIndex: low >= BUDGET_MAX - BUDGET_STEP ? 30 : 20 }}
        />
        <input
          type="range"
          className="budget-range"
          min={BUDGET_MIN}
          max={BUDGET_MAX}
          step={BUDGET_STEP}
          value={high}
          onChange={(e) =>
            onChange([low, Math.max(Number(e.target.value), low)])
          }
          aria-label={t('browse.budgetMax')}
          aria-valuetext={highText}
          style={{ zIndex: 25 }}
        />
      </div>
      <p className="mt-xs text-body-sm font-medium text-ink-700">
        {lowText} – {highText}
      </p>
    </div>
  );
}
