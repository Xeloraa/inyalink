import { useI18n } from '../../lib/i18n';
import { useInView } from '../../lib/scrollFx';
import { FEATURED_PROS, FeaturedProCard } from './FeaturedPros';
import { FullBleed } from './FullBleed';

/** Lateral offsets give the grid a staggered, hand-placed rhythm. */
const OFFSETS = ['mr-3 lg:mr-0 lg:mt-6', 'ml-3 lg:ml-0 lg:-mt-6', 'mr-3 lg:mr-0 lg:mt-6'];

export function MatchesSection() {
  const { t } = useI18n();
  const { ref, className } = useInView<HTMLDivElement>(0.1);

  return (
    <FullBleed
      id="featured"
      labelledBy="featured-heading"
      className="scroll-mt-3xl"
      innerClassName="py-4xl md:py-5xl"
    >
      <div ref={ref} className={className}>
        <p className="reveal inline-flex items-center gap-sm text-caption font-medium text-jade-800">
          <span aria-hidden className="inline-block h-px w-6 bg-jade-400" />
          {t('landing.featuredTitle')}
        </p>
        <h2
          id="featured-heading"
          className="text-sect reveal mt-md text-ink-900"
          style={{ transitionDelay: '70ms' }}
        >
          {t('landing.matchesHeading')}
        </h2>
        <p
          className="reveal mt-sm max-w-hero text-body leading-burmese text-ink-500 md:ml-8"
          style={{ transitionDelay: '140ms' }}
        >
          {t('landing.featuredSubhead')}
        </p>

        <ul className="mt-2xl grid gap-xl lg:mt-3xl lg:grid-cols-3">
          {FEATURED_PROS.map((pro, i) => (
            <li
              key={pro.id}
              className="reveal"
              style={{ transitionDelay: `${210 + i * 120}ms` }}
            >
              <div className={OFFSETS[i] ?? ''}>
                <FeaturedProCard pro={pro} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </FullBleed>
  );
}
