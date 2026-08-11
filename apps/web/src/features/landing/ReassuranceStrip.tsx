import { useI18n } from '../../lib/i18n';
import { useInView } from '../../lib/scrollFx';
import { FullBleed } from './FullBleed';

/** Quiet jade band of proof numbers between the hero and The Deep. */
export function ReassuranceStrip() {
  const { t } = useI18n();
  const { ref, className } = useInView<HTMLDivElement>();

  const stats = [1, 2, 3, 4].map((n) => ({
    value: t(`landing.stat${n}.value`),
    label: t(`landing.stat${n}.label`),
  }));

  return (
    <FullBleed className="bg-jade-100" innerClassName="py-xl md:py-2xl">
      <div ref={ref} className={className}>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-sm bg-jade-200 md:grid-cols-4">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="reveal flex flex-col-reverse bg-jade-100 px-lg py-md"
              style={{ transitionDelay: `${i * 70}ms` }}
            >
              <dt className="text-caption leading-burmese text-jade-800">
                {stat.label}
              </dt>
              <dd className="text-stat leading-burmese text-jade-800">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </FullBleed>
  );
}
