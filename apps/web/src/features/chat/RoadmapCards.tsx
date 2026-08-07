import { formatMmk, type RoadmapStep } from '@inyalink/shared';
import { useI18n } from '../../lib/i18n';

type RoadmapCardsProps = {
  steps: RoadmapStep[];
  disclaimer: string | null;
};

/** Compact roadmap steps inside the chat panel — one line of description each. */
export function RoadmapCards({ steps, disclaimer }: RoadmapCardsProps) {
  const { t, locale } = useI18n();
  const moneyLocale = locale === 'en' ? 'en' : 'my';
  const ordered = steps.slice().sort((a, b) => a.order - b.order);
  if (ordered.length === 0) return null;

  return (
    <div className="w-full max-w-[86%] space-y-sm">
      <p className="text-caption font-medium text-ink-500">{t('roadmap.title')}</p>
      <ol className="space-y-sm">
        {ordered.map((step) => (
          <li
            key={step.order}
            className="rounded-md border border-line bg-white px-md py-sm"
          >
            <p className="text-caption font-medium text-jade-600">
              {step.order} · {step.category_slug}
            </p>
            <p className="mt-xs text-body-sm font-medium leading-burmese text-ink-900 [overflow-wrap:anywhere]">
              {step.title}
            </p>
            <p className="mt-xs line-clamp-1 text-caption leading-burmese text-ink-500 [overflow-wrap:anywhere]">
              {step.why}
            </p>
            <p className="mt-xs text-caption text-ink-400">
              {formatMmk(step.est_min_mmk, moneyLocale)} –{' '}
              {formatMmk(step.est_max_mmk, moneyLocale)}
            </p>
          </li>
        ))}
      </ol>
      {disclaimer ? (
        <p className="text-caption leading-burmese text-ink-400 [overflow-wrap:anywhere]">
          <span className="font-medium text-ink-500">
            {t('roadmap.disclaimer')}:{' '}
          </span>
          {disclaimer}
        </p>
      ) : null}
    </div>
  );
}
