import type { RefObject } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../lib/i18n';
import { useParallaxDrift } from '../../lib/scrollFx';
import { FullBleed } from './FullBleed';
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

/** 2x2 portfolio-photo grid — mirrors the mockup's hero visual exactly. */
const HERO_GRID_IMAGES = [
  '/images/portfolio/min-thet-1.jpg',
  '/images/portfolio/win-htut-1.jpg',
  '/images/portfolio/tun-lin-1.jpg',
  '/images/portfolio/min-thet-2.jpg',
];

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
    <FullBleed className="bg-jade-900" labelledBy="hero-heading">
      <div
        ref={rippleRef}
        aria-hidden
        className="pointer-events-none absolute -left-40 -top-32 opacity-50"
      >
        <Ripples
          size={640}
          rings={4}
          strokeClassName="stroke-jade-800"
          className="animate-ripple"
        />
      </div>

      <div className="relative flex min-h-[calc(100vh-4.5rem)] flex-col supports-[height:100svh]:min-h-[calc(100svh-4.5rem)]">
        <div className="grid flex-1 items-center gap-4xl py-xl md:py-4xl lg:grid-cols-2 lg:gap-5xl">
          <div className="min-w-0">
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

            <p className="animate-fade-up delay-2 mt-sm max-w-hero text-[18px] leading-burmese text-[rgba(255,255,255,0.70)]">
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

            <div className="animate-fade-up delay-4 mt-md flex flex-wrap items-center gap-sm">
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

            <p className="animate-fade-in delay-4 mt-md md:mt-xl">
              <Link
                to="/browse"
                className="tap-target inline-flex items-center text-body-sm text-[rgba(255,255,255,0.55)] underline-offset-4 transition-colors duration-fast ease-out hover:text-white hover:underline focus-visible:rounded-sm focus-visible:shadow-focus active:text-jade-100"
              >
                {t('landing.browseQuiet')}
              </Link>
            </p>
          </div>

          <div
            ref={stackRef}
            className="animate-fade-up delay-3 grid min-w-0 grid-cols-2 gap-[10px]"
          >
            {HERO_GRID_IMAGES.map((src) => (
              <img
                key={src}
                src={src}
                alt=""
                loading="lazy"
                className="aspect-square w-full rounded-lg bg-jade-800 object-cover"
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-xs pb-lg">
          <span aria-hidden className="block h-9 w-px bg-jade-400" />
          <span className="text-caption text-jade-200">
            {t('landing.scrollCue')}
          </span>
        </div>
      </div>
    </FullBleed>
  );
}
