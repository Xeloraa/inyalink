import { useI18n } from '../../lib/i18n';
import { useInView } from '../../lib/scrollFx';
import { FullBleed } from './FullBleed';

const STEPS = [
  {
    numKey: 'landing.step1.num',
    titleKey: 'landing.step1.title',
    bodyKey: 'landing.step1.body',
  },
  {
    numKey: 'landing.step2.num',
    titleKey: 'landing.step2.title',
    bodyKey: 'landing.step2.body',
  },
  {
    numKey: 'landing.step3.num',
    titleKey: 'landing.step3.title',
    bodyKey: 'landing.step3.body',
  },
];

/** Three steps anchored to one connecting waterline — a path, not a list. */
export function HowItWorks() {
  const { t } = useI18n();
  const { ref, className } = useInView<HTMLDivElement>(0.15);

  return (
    <FullBleed
      className="bg-jade-50"
      labelledBy="how-heading"
      innerClassName="py-4xl md:py-5xl"
    >
      <div ref={ref} className={className}>
        <h2 id="how-heading" className="text-sect reveal text-ink-900">
          {t('landing.howTitle')}
        </h2>
        <p
          className="reveal mt-sm max-w-hero text-body leading-burmese text-ink-500"
          style={{ transitionDelay: '70ms' }}
        >
          {t('landing.howSubhead')}
        </p>

        <ol className="relative mt-2xl flex flex-col gap-2xl md:grid md:grid-cols-3 md:gap-xl">
          <span
            aria-hidden
            className="absolute bottom-6 left-6 top-6 w-px bg-jade-200 md:hidden"
          />
          <span
            aria-hidden
            className="absolute left-6 right-6 top-6 hidden h-px bg-jade-200 md:block"
          />
          {STEPS.map((step, i) => (
            <li
              key={step.numKey}
              className="reveal relative flex gap-lg md:block"
              style={{ transitionDelay: `${140 + i * 120}ms` }}
            >
              <span
                aria-hidden
                className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-jade-200 bg-white font-display text-[22px] font-semibold text-jade-bright"
              >
                {t(step.numKey)}
              </span>
              <div className="md:mt-lg">
                <h3 className="text-title text-ink-900">{t(step.titleKey)}</h3>
                <p className="mt-sm text-body-sm leading-burmese text-ink-500">
                  {t(step.bodyKey)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </FullBleed>
  );
}
