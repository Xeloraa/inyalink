import type { RefObject } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../lib/i18n';
import { useParallaxDrift } from '../../lib/scrollFx';
import { FullBleed } from './FullBleed';
import { HeroInput } from './HeroInput';
import { HeroMatchStack } from './HeroMatchStack';
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
  'tap-target font-myanmar inline-flex items-center rounded-sm border border-line bg-white px-lg text-left text-body-sm text-ink-700 transition-colors duration-fast ease-out hover:border-jade-400 hover:bg-jade-50 focus-visible:shadow-focus active:border-jade-600 active:bg-jade-100';

/** Full-viewport dawn hero — the input is the stone dropped in the lake. */
export function HeroDawn({
  goal,
  onGoalChange,
  onSubmit,
  onChip,
  heroRef,
}: HeroDawnProps) {
  const { t } = useI18n();
  const rippleRef = useParallaxDrift<HTMLDivElement>(0.04);
  const stackRef = useParallaxDrift<HTMLDivElement>(-0.05);

  return (
    <FullBleed
      className="overflow-x-clip bg-[linear-gradient(180deg,var(--paper)_0%,var(--jade-50)_58%,rgba(223,242,232,0.55)_100%)]"
      labelledBy="hero-heading"
    >
      <div
        ref={rippleRef}
        aria-hidden
        className="pointer-events-none absolute -left-44 top-[46%] md:left-[10%]"
      >
        <Ripples
          size={560}
          rings={6}
          strokeClassName="stroke-[color:var(--jade-300)]"
          className="animate-ripple"
        />
      </div>

      <div className="relative flex min-h-[calc(100vh-4.5rem)] flex-col supports-[height:100svh]:min-h-[calc(100svh-4.5rem)]">
        <div className="grid flex-1 items-center gap-4xl py-xl md:py-4xl lg:grid-cols-2 lg:gap-5xl">
          <div className="min-w-0">
            <p className="animate-fade-up inline-flex items-center gap-sm text-caption font-medium text-jade-800">
              <span aria-hidden className="inline-block h-px w-6 bg-jade-400" />
              {t('landing.eyebrow')}
            </p>

            <h1
              id="hero-heading"
              className="text-hero animate-fade-up delay-1 mt-lg text-ink-900 md:mt-xl"
            >
              <span className="block">{t('landing.headlineBefore')}</span>
              {t('landing.headlineAccent') ? (
                <span className="block text-jade-800">
                  {t('landing.headlineAccent')}
                </span>
              ) : null}
              {t('landing.headlineAfter') ? (
                <span className="block">{t('landing.headlineAfter')}</span>
              ) : null}
            </h1>

            <p className="animate-fade-up delay-2 mt-md max-w-hero text-body text-ink-500 md:mt-lg md:text-body-lg">
              {t('landing.subhead')}
            </p>

            <div
              ref={heroRef}
              className="animate-fade-up delay-3 relative mt-xl w-full md:mt-2xl"
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

            <div className="animate-fade-up delay-4 mt-md flex flex-col gap-sm sm:flex-row sm:flex-wrap md:mt-lg">
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

            <p className="animate-fade-in delay-4 mt-md md:mt-xl">
              <Link
                to="/browse"
                className="tap-target inline-flex items-center text-body-sm text-ink-500 underline-offset-4 transition-colors duration-fast ease-out hover:text-jade-600 hover:underline focus-visible:rounded-sm focus-visible:shadow-focus active:text-jade-800"
              >
                {t('landing.browseQuiet')}
              </Link>
            </p>
          </div>

          <div ref={stackRef} className="hidden min-h-[360px] lg:block">
            <div className="animate-fade-up delay-3">
              <HeroMatchStack />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-xs pb-lg">
          <span aria-hidden className="block h-9 w-px bg-jade-400" />
          <span className="text-caption text-ink-400">
            {t('landing.scrollCue')}
          </span>
        </div>
      </div>
    </FullBleed>
  );
}
