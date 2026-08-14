import type { RefObject } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../lib/i18n';
import { HeroInput } from './HeroInput';

type HeroCompactProps = {
  goal: string;
  onGoalChange: (value: string) => void;
  onSubmit: () => void;
  onChip: (text: string) => void;
  heroRef: RefObject<HTMLDivElement>;
};

const CHIP_CLASS =
  'tap-target font-myanmar min-h-[48px] w-full rounded-2md bg-white px-lg py-md text-left text-[13px] leading-burmese text-ink-700 shadow-sm transition-colors duration-fast ease-out hover:bg-jade-50 focus-visible:shadow-focus active:bg-jade-100';

/** Ring colors step from --jade-200 (innermost) out to --jade-150 (outermost), mirroring the mockup exactly. */
const RING_COLORS = ['stroke-jade-200', 'stroke-jade-225', 'stroke-jade-175', 'stroke-jade-150'];

/** Compact mobile/narrow-viewport hero — swaps in for HeroDawn below `md`. Centered, light, no photo grid. */
export function HeroCompact({
  goal,
  onGoalChange,
  onSubmit,
  onChip,
  heroRef,
}: HeroCompactProps) {
  const { t } = useI18n();

  return (
    <section
      className="relative overflow-hidden bg-page px-lg"
      aria-labelledby="hero-heading-compact"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 opacity-70"
      >
        <svg viewBox="0 0 760 760" width={760} height={760} fill="none">
          {[120, 190, 266, 348].map((r, i) => (
            <circle
              key={r}
              cx={380}
              cy={380}
              r={r}
              strokeWidth={1}
              className={RING_COLORS[i]}
            />
          ))}
        </svg>
      </div>

      <div className="relative flex min-h-[calc(100svh-4.5rem)] flex-col items-center justify-center py-xl text-center">
        <span className="animate-fade-in inline-flex items-center gap-sm rounded-full bg-white py-xs pl-sm pr-md text-[11.5px] font-semibold leading-relaxed text-jade-800 shadow-sm">
          <span aria-hidden className="block h-1.5 w-1.5 shrink-0 rounded-full bg-jade-600" />
          {t('landing.eyebrow')}
        </span>

        <h1
          id="hero-heading-compact"
          className="animate-fade-up delay-1 mt-lg text-ink-900"
        >
          <span className="text-hero-question block">
            {t('landing.headlineBefore')}
          </span>
          {t('landing.headlineAccent') ? (
            <span className="text-hero-directive block text-jade-600">
              {t('landing.headlineAccent')}
            </span>
          ) : null}
          {t('landing.headlineAfter') ? (
            <span className="text-hero-question block">
              {t('landing.headlineAfter')}
            </span>
          ) : null}
        </h1>

        <p className="animate-fade-up delay-2 mt-sm max-w-[34ch] text-body leading-burmese text-ink-500">
          {t('landing.subhead')}
        </p>

        <div
          ref={heroRef}
          className="animate-fade-up delay-3 mt-2xl w-full text-left"
        >
          <HeroInput
            value={goal}
            onChange={onGoalChange}
            onSubmit={onSubmit}
            placeholder={t('landing.placeholder')}
            langHint={t('landing.langHint')}
            submitLabel={t('landing.submit')}
          />
        </div>

        <div className="animate-fade-up delay-4 mt-md flex w-full flex-col gap-sm">
          <button
            type="button"
            onClick={() => onChip(t('landing.chipQuickGoal'))}
            className={CHIP_CLASS}
          >
            {t('landing.chipQuick')}
          </button>
          <button
            type="button"
            onClick={() => onChip(t('landing.chipPlanGoal'))}
            className={CHIP_CLASS}
          >
            {t('landing.chipPlan')}
          </button>
        </div>

        <Link
          to="/browse"
          className="tap-target animate-fade-in delay-4 mt-md inline-flex items-center rounded-sm px-sm py-xs text-body-sm text-ink-500 underline-offset-4 transition-colors duration-fast ease-out hover:text-jade-600 hover:underline focus-visible:shadow-focus active:text-jade-800"
        >
          {t('landing.browseQuiet')} →
        </Link>
      </div>
    </section>
  );
}
