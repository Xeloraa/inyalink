import { LogoMark } from '../../components/Logo';
import { useI18n } from '../../lib/i18n';
import { FullBleed } from './FullBleed';

const ICON_PROPS = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function ClockOffIcon() {
  return (
    <svg {...ICON_PROPS} aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2.5" />
      <path d="M4 4l16 16" />
    </svg>
  );
}

function IdOffIcon() {
  return (
    <svg {...ICON_PROPS} aria-hidden>
      <rect x="3.5" y="6" width="17" height="12" rx="2" />
      <path d="M7.5 10.5h4" />
      <path d="M7.5 13.5h2.5" />
      <path d="M4 4l16 16" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg {...ICON_PROPS} aria-hidden>
      <path d="M12 3.5l7 2.6v5.2c0 4.4-3 7.6-7 9.2-4-1.6-7-4.8-7-9.2V6.1l7-2.6z" />
      <path d="M9 12l2.2 2.2L15.5 10" />
    </svg>
  );
}

const COMMITS = [
  { key: 'landing.commit1', icon: <ClockOffIcon />, amber: false },
  // The NRC promise is the boldest one — it gets the page's single amber accent.
  { key: 'landing.commit2', icon: <IdOffIcon />, amber: true },
  { key: 'landing.commit3', icon: <ShieldCheckIcon />, amber: false },
];

/**
 * Dusk closing — the trust line promoted from a caption to set promises,
 * followed by the site footer. The negative bottom margin swallows
 * AppShell's main padding so the dark water runs to the page edge.
 *
 * Deliberately static: promises are the page's trust anchor, so they carry
 * no scroll-reveal — full opacity, always. Colors use var(--...) arbitrary
 * classes so they render even under a Tailwind process with a stale config.
 */
export function Commitments() {
  const { t } = useI18n();

  return (
    <FullBleed
      className="-mb-3xl bg-[var(--jade-900)] md:-mb-4xl"
      labelledBy="commit-heading"
      innerClassName="py-4xl md:py-5xl"
    >
      <div>
        <h2
          id="commit-heading"
          className="text-caption font-medium tracking-[0.08em] text-[color:var(--jade-300)]"
        >
          {t('landing.commitTitle')}
        </h2>

        <ul className="mt-xl flex max-w-brief flex-col gap-lg">
          {COMMITS.map((commit) => (
            <li
              key={commit.key}
              className="flex items-start gap-md text-body-lg leading-burmese text-[color:var(--jade-50)]"
            >
              <span
                aria-hidden
                className={`mt-1 shrink-0 ${
                  commit.amber
                    ? 'text-[color:var(--amber-500)]'
                    : 'text-[color:var(--jade-300)]'
                }`}
              >
                {commit.icon}
              </span>
              {t(commit.key)}
            </li>
          ))}
        </ul>

        <div className="mt-3xl border-t border-[rgba(255,255,255,0.10)] pt-xl">
          <span className="inline-flex items-center gap-sm">
            <span className="text-[color:var(--jade-300)]">
              <LogoMark />
            </span>
            <span className="font-display text-body font-semibold text-[color:var(--jade-50)]">
              {t('app.name')}
            </span>
          </span>
        </div>
      </div>
    </FullBleed>
  );
}
