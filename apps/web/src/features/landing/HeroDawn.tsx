import type { RefObject } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../lib/i18n';
import { HeroGrid } from './HeroGrid';
import { HeroInput } from './HeroInput';
import { Ripples } from './Ripples';

type HeroDawnProps = {
  goal: string;
  onGoalChange: (value: string) => void;
  onSubmit: () => void;
  onChip: (text: string) => void;
  /** Wraps the hero input so the page can focus / scroll back to it. */
  heroRef: RefObject<HTMLDivElement>;
};

const CHIP_CLASS =
  'tap-target font-myanmar inline-flex items-center rounded-full bg-[rgba(255,255,255,0.09)] px-md py-sm text-left text-[12.5px] leading-burmese text-[rgba(255,255,255,0.9)] transition-colors duration-fast ease-out hover:bg-[rgba(255,255,255,0.15)] focus-visible:shadow-focus active:bg-[rgba(255,255,255,0.20)]';

/**
 * Full-bleed jade-900 dawn hero. Copy stays on the left, aligned with the
 * header; the mosaic runs to the viewport's right edge and the section's
 * full height. Below `lg` the mosaic collapses to a single row under the
 * input — never a squashed 2×2.
 */
export function HeroDawn({
  goal,
  onGoalChange,
  onSubmit,
  onChip,
  heroRef,
}: HeroDawnProps) {
  const { t } = useI18n();

  return (
    <section aria-labelledby="hero-heading" className="relative isolate">
      <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 bg-jade-900">
        <div className="flex min-h-[calc(100vh-4.5rem)] flex-col supports-[height:100svh]:min-h-[calc(100svh-4.5rem)] lg:flex-row lg:items-stretch">
          <div className="relative flex min-w-0 flex-1 flex-col justify-center px-[22px] py-3xl md:py-4xl lg:flex-none lg:w-[min(100%,calc(max(22px,(100vw-1180px)/2+22px)+560px+48px))] lg:pl-[max(22px,calc((100vw-1180px)/2+22px))] lg:pr-3xl">
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -left-40 -top-32 opacity-50">
                <Ripples
                  size={640}
                  rings={4}
                  strokeClassName="stroke-jade-800"
                  className="animate-ripple"
                />
              </div>
            </div>

            <div className="relative z-[1]">
              <p className="animate-fade-up inline-flex items-center gap-sm text-caption font-medium text-jade-300">
                <span aria-hidden className="inline-block h-px w-6 bg-jade-bright" />
                {t('landing.eyebrow')}
              </p>

              <h1
                id="hero-heading"
                className="animate-fade-up delay-1 mt-lg text-white md:mt-xl"
              >
                <span className="text-hero-question block">
                  {t('landing.headlineBefore')}
                </span>
                {t('landing.headlineAccent') ? (
                  <span className="text-hero-directive mt-xs block text-jade-bright">
                    {t('landing.headlineAccent')}
                  </span>
                ) : null}
                {t('landing.headlineAfter') ? (
                  <span className="text-hero-question block">
                    {t('landing.headlineAfter')}
                  </span>
                ) : null}
              </h1>

              <p className="animate-fade-up delay-2 mt-lg max-w-hero text-[18px] leading-burmese text-[rgba(255,255,255,0.70)]">
                {t('landing.subhead')}
              </p>

              <div
                ref={heroRef}
                className="animate-fade-up delay-3 relative mt-2xl w-full md:mt-3xl"
              >
                <HeroInput
                  value={goal}
                  onChange={onGoalChange}
                  onSubmit={onSubmit}
                  placeholder={t('landing.placeholder')}
                  label={t('landing.inputLabel')}
                  langHint={t('landing.langHint')}
                  submitLabel={t('landing.submit')}
                />
              </div>

              <div className="animate-fade-up delay-4 mt-lg flex flex-wrap items-center gap-sm">
                <span className="text-[11.5px] leading-burmese text-[rgba(255,255,255,0.66)]">
                  {t('landing.tryLabel')}
                </span>
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

              <p className="animate-fade-in delay-4 mt-lg">
                <Link
                  to="/browse"
                  className="tap-target inline-flex items-center text-body-sm text-[rgba(255,255,255,0.55)] underline-offset-4 transition-colors duration-fast ease-out hover:text-white hover:underline focus-visible:rounded-sm focus-visible:shadow-focus active:text-jade-100"
                >
                  {t('landing.browseQuiet')}
                </Link>
              </p>
            </div>
          </div>

          <HeroGrid />
        </div>
      </div>
    </section>
  );
}
