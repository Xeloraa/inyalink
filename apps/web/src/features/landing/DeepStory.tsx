import { useI18n } from '../../lib/i18n';
import { useInView } from '../../lib/scrollFx';
import { FullBleed } from './FullBleed';
import { Ripples } from './Ripples';

const MESSAGES: Array<{ role: 'user' | 'ai'; key: string }> = [
  { role: 'user', key: 'landing.previewUser' },
  { role: 'ai', key: 'landing.previewAi' },
  { role: 'user', key: 'landing.previewUser2' },
  { role: 'ai', key: 'landing.previewAi2' },
];

function UpArrow() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </svg>
  );
}

function BriefCard() {
  const { t } = useI18n();
  const rows = [
    {
      label: t('landing.sampleBriefCategoryLabel'),
      value: t('landing.sampleBriefCategory'),
    },
    {
      label: t('landing.sampleBriefBudgetLabel'),
      value: t('landing.sampleBriefBudget'),
      pill: true,
    },
    {
      label: t('landing.sampleBriefDeadlineLabel'),
      value: t('landing.sampleBriefDeadline'),
    },
  ];

  return (
    <div className="max-w-[340px] rounded-md bg-paper p-lg text-ink-900 shadow-lg">
      <p className="text-caption leading-burmese text-ink-400">{t('landing.deepBriefLabel')}</p>
      <p className="mt-xs text-title leading-burmese text-ink-900">
        {t('landing.sampleBriefTitle')}
      </p>
      <dl className="mt-md">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={`flex items-center justify-between gap-md py-sm ${
              i === 0 ? '' : 'border-t border-line-soft'
            }`}
          >
            <dt className="shrink-0 text-caption text-ink-500">{row.label}</dt>
            <dd
              className={
                row.pill
                  ? 'rounded-full bg-jade-100 px-md py-xs text-caption text-jade-800'
                  : 'text-body-sm text-ink-900'
              }
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function StatExplainCard({
  value,
  label,
  description,
}: {
  value: string;
  label: string;
  description: string;
}) {
  return (
    <div className="rounded-lg bg-jade-900 p-lg">
      <p className="text-stat text-jade-bright">{value}</p>
      <p className="mt-xs text-caption font-semibold tracking-[0.08em] text-jade-300">
        {label}
      </p>
      <p className="mt-sm text-body-sm leading-burmese text-jade-100">
        {description}
      </p>
    </div>
  );
}

/**
 * The Deep — dark-water centerpiece. "How it feels" restaged as a
 * storyboard. Deliberately not interactive: the page's single AI entry
 * point is the hero input, and this section ends with a signpost back up
 * to it. The heading and AI bubbles carry no reveal animation — full
 * opacity always, since light ink on dark must not pass through opacity:0.
 */
export function DeepStory({ onStart }: { onStart: () => void }) {
  const { t } = useI18n();
  const story = useInView<HTMLDivElement>(0.1);

  return (
    <FullBleed
      className="bg-jade-950"
      labelledBy="deep-heading"
      innerClassName="py-4xl md:py-5xl"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-44"
      >
        <Ripples
          size={520}
          rings={4}
          strokeClassName="stroke-jade-600"
          className="animate-ripple"
        />
      </div>
      <div className="relative">
        <div>
          <p className="text-caption font-medium tracking-[0.08em] text-jade-300">
            {t('landing.previewLabel')}
          </p>
          <h2
            id="deep-heading"
            className="text-sect mt-md max-w-brief text-jade-50"
          >
            {t('landing.previewTitle')}
          </h2>
        </div>

        <div className="mt-2xl grid gap-xl lg:grid-cols-2 lg:items-start">
        <div
          ref={story.ref}
          className={`relative max-w-conversation ${story.className}`}
        >
          <span
            aria-hidden
            className="absolute bottom-0 left-2 top-0 w-px bg-[rgba(255,255,255,0.08)]"
          />
          <div className="flex flex-col gap-md">
            {MESSAGES.map((message, i) => (
              <div
                key={message.key}
                className={`flex ${
                  message.role === 'user'
                    ? 'reveal justify-end pl-3xl'
                    : 'justify-start pl-lg pr-2xl'
                }`}
                style={
                  message.role === 'user'
                    ? { transitionDelay: `${i * 150}ms` }
                    : undefined
                }
              >
                <p
                  className={`px-lg py-md text-body-lg leading-burmese ${
                    message.role === 'user'
                      ? 'max-w-[78%] rounded-[16px] rounded-br-[4px] bg-jade-600 text-white'
                      : 'max-w-[86%] rounded-[16px] rounded-bl-[4px] border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.07)] text-jade-50'
                  }`}
                >
                  {t(message.key)}
                </p>
              </div>
            ))}

            <div
              className="reveal flex pl-lg"
              style={{ transitionDelay: '600ms' }}
            >
              <span
                className="inline-flex gap-[5px] rounded-[16px] rounded-bl-[4px] bg-[rgba(255,255,255,0.07)] px-lg py-lg"
                aria-hidden
              >
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className="animate-dot h-1.5 w-1.5 rounded-full bg-jade-300"
                    style={{ animationDelay: `${dot * 300}ms` }}
                  />
                ))}
              </span>
            </div>

            <div
              className="reveal mt-lg pl-lg"
              style={{ transitionDelay: '750ms' }}
            >
              <BriefCard />
            </div>
          </div>

          <button
            type="button"
            onClick={onStart}
            className="reveal tap-target mt-2xl inline-flex items-center gap-sm text-body-sm leading-burmese text-jade-300 underline underline-offset-4 transition-colors duration-fast ease-out hover:text-jade-100 focus-visible:rounded-sm focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--jade-300)_35%,transparent)]"
            style={{ transitionDelay: '850ms' }}
          >
            {t('landing.deepStart')}
            <UpArrow />
          </button>
        </div>

        <div className="flex flex-col gap-lg">
          <StatExplainCard
            value={t('landing.stat3.value')}
            label={t('landing.stat3.label')}
            description={t('landing.deepExplainQuestions')}
          />
          <StatExplainCard
            value={t('landing.stat2.value')}
            label={t('landing.stat2.label')}
            description={t('landing.deepExplainMatches')}
          />
        </div>
        </div>
      </div>
    </FullBleed>
  );
}
