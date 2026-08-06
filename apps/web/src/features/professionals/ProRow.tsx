import { Link } from 'react-router-dom';
import type { ProfessionalListItem } from '@inyalink/shared';
import { useI18n } from '../../lib/i18n';
import { ArrowRightIcon, CheckIcon, HeartIcon, PinIcon } from './icons';

/** Chip budget per breakpoint: phones stay at three, desktop rows show five. */
const MOBILE_SKILL_CHIPS = 3;
const DESKTOP_SKILL_CHIPS = 5;

function replyValue(medianMins: number | null): string {
  if (medianMins === null) return '—';
  if (medianMins < 60) return `${Math.round(medianMins)}m`;
  return `${Math.round(medianMins / 60)}h`;
}

function SaveButton({
  saved,
  onToggle,
}: {
  saved: boolean;
  onToggle: () => void;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? t('profile.saved') : t('profile.save')}
      onClick={onToggle}
      className={`tap-target inline-flex items-center justify-center rounded-md border transition-colors duration-fast ease-out focus-visible:shadow-focus active:scale-95 motion-reduce:active:scale-100 ${
        saved
          ? 'border-jade-200 bg-jade-50 text-jade-600'
          : 'border-line bg-white text-ink-400 hover:border-jade-400 hover:text-jade-600'
      }`}
    >
      <HeartIcon filled={saved} />
    </button>
  );
}

function SkillChips({
  skills,
  max,
  className,
}: {
  skills: string[];
  max: number;
  className: string;
}) {
  const visible = skills.slice(0, max);
  const overflow = skills.length - visible.length;
  return (
    <ul className={className}>
      {visible.map((skill) => (
        <li
          key={skill}
          className="rounded-full border border-line bg-white px-md py-xs text-caption text-ink-700"
        >
          {skill}
        </li>
      ))}
      {overflow > 0 ? (
        <li className="rounded-full bg-line-soft px-md py-xs text-caption text-ink-500">
          +{overflow}
        </li>
      ) : null}
    </ul>
  );
}

/** One horizontal directory row: identity, inline metrics, skills, bio. */
export function ProRow({
  pro,
  saved,
  onToggleSave,
}: {
  pro: ProfessionalListItem;
  saved: boolean;
  onToggleSave: () => void;
}) {
  const { t, locale } = useI18n();
  const profilePath = `/professionals/${pro.id}`;
  const headline =
    locale === 'en'
      ? (pro.headlineEn ?? pro.headlineMy)
      : (pro.headlineMy ?? pro.headlineEn);
  const bio =
    locale === 'en' ? (pro.bioEn ?? pro.bioMy) : (pro.bioMy ?? pro.bioEn);

  const metrics = [
    { value: String(pro.stats.completedCount), label: t('browse.metricJobs') },
    {
      value: String(pro.stats.uniqueClients),
      label: t('browse.metricClients'),
    },
    {
      value:
        pro.stats.completionRatePct === null
          ? '—'
          : `${Math.round(pro.stats.completionRatePct)}%`,
      label: t('browse.metricRate'),
    },
    {
      value: replyValue(pro.stats.medianResponseMins),
      label: t('browse.metricReply'),
    },
  ];

  return (
    <article className="group relative rounded-lg border border-line bg-white p-lg transition-[transform,box-shadow] duration-base ease-out hover:-translate-y-[2px] hover:shadow-md focus-within:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 md:p-xl">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-[3px] rounded-l-lg bg-jade-600 opacity-0 transition-opacity duration-base ease-out group-hover:opacity-100 group-focus-within:opacity-100"
      />

      {/*
       * Whole-card tap target. Hidden from AT and the tab order — the
       * headline link and View-profile button are the accessible paths to
       * the same destination.
       */}
      <Link
        to={profilePath}
        aria-hidden
        tabIndex={-1}
        className="absolute inset-0 z-[1] rounded-lg"
      />

      <div className="flex gap-md sm:gap-lg">
        {pro.avatarUrl ? (
          <img
            src={pro.avatarUrl}
            alt=""
            width={64}
            height={64}
            loading="lazy"
            className="h-11 w-11 shrink-0 rounded-full object-cover sm:h-16 sm:w-16"
          />
        ) : (
          <div
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-jade-100 font-display text-body text-jade-800 sm:h-16 sm:w-16 sm:text-title"
          >
            {pro.displayName.slice(0, 1)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-sm">
            <span className="line-clamp-1 min-w-0 text-body font-semibold text-ink-900 [overflow-wrap:anywhere]">
              {pro.displayName}
            </span>
            {pro.verified ? (
              <span className="inline-flex shrink-0 items-center gap-xs rounded-full bg-jade-50 px-sm py-0.5 text-caption font-medium text-jade-800">
                <span className="text-jade-600">
                  <CheckIcon />
                </span>
                <span className="sr-only sm:not-sr-only">
                  {t('landing.verified')}
                </span>
              </span>
            ) : null}
          </div>

          {headline ? (
            <h2 className="mt-xs text-body sm:text-title">
              <Link
                to={profilePath}
                className="relative z-[2] line-clamp-1 text-jade-600 no-underline transition-colors duration-fast ease-out [overflow-wrap:anywhere] hover:text-jade-400 hover:underline hover:underline-offset-4 focus-visible:rounded-sm focus-visible:shadow-focus sm:line-clamp-none"
              >
                {headline}
              </Link>
            </h2>
          ) : null}

          {pro.location ? (
            <p className="mt-xs flex items-center gap-xs text-caption text-ink-400">
              <PinIcon />
              {pro.location}
            </p>
          ) : null}

          {/* Desktop details live in the indented column beside the avatar. */}
          <div className="hidden sm:block">
            <p className="mt-md flex flex-wrap items-baseline gap-x-sm gap-y-xs">
              {metrics.map((metric, i) => (
                <span key={metric.label} className="flex items-baseline gap-xs">
                  {i > 0 ? (
                    <span aria-hidden className="pr-sm text-ink-300">
                      ·
                    </span>
                  ) : null}
                  <span className="text-body-sm font-semibold text-jade-600">
                    {metric.value}
                  </span>
                  <span className="text-caption text-ink-500">
                    {metric.label}
                  </span>
                </span>
              ))}
            </p>

            <SkillChips
              skills={pro.skills}
              max={DESKTOP_SKILL_CHIPS}
              className="mt-md flex flex-wrap gap-sm"
            />

            {bio ? (
              <p className="mt-md line-clamp-2 max-w-[68ch] text-body-sm text-ink-500 [overflow-wrap:anywhere]">
                {bio}
              </p>
            ) : null}
          </div>
        </div>

        <div className="relative z-10 self-start sm:hidden">
          <SaveButton saved={saved} onToggle={onToggleSave} />
        </div>

        <div className="relative z-10 hidden shrink-0 flex-col items-end justify-between gap-md sm:flex">
          <SaveButton saved={saved} onToggle={onToggleSave} />
          <Link
            to={profilePath}
            className="tap-target inline-flex items-center justify-center whitespace-nowrap rounded-md bg-jade-600 px-lg text-body-sm font-medium text-white no-underline transition-colors duration-fast ease-out hover:bg-jade-400 focus-visible:shadow-focus active:bg-jade-800"
          >
            {t('browse.viewProfile')}
          </Link>
        </div>
      </div>

      {/* Phone details use the full card width so the metrics keep one line. */}
      <div className="sm:hidden">
        <p className="no-scrollbar mt-sm overflow-x-auto whitespace-nowrap text-caption">
          {metrics.map((metric, i) => (
            <span key={metric.label}>
              {i > 0 ? (
                <span aria-hidden className="px-xs text-ink-300">
                  ·
                </span>
              ) : null}
              <span className="font-semibold text-jade-600">
                {metric.value}
              </span>{' '}
              <span className="text-ink-500">{metric.label}</span>
            </span>
          ))}
        </p>

        <SkillChips
          skills={pro.skills}
          max={MOBILE_SKILL_CHIPS}
          className="mt-sm flex flex-wrap gap-xs"
        />

        {bio ? (
          <p className="mt-sm line-clamp-1 text-body-sm text-ink-500 [overflow-wrap:anywhere]">
            {bio}
          </p>
        ) : null}

        <div className="mt-xs flex justify-end">
          <Link
            to={profilePath}
            className="tap-target relative z-10 inline-flex items-center gap-xs rounded-md px-sm text-[13px] font-medium text-jade-600 no-underline transition-colors duration-fast ease-out hover:text-jade-400 focus-visible:shadow-focus active:text-jade-800"
          >
            {t('browse.viewProfile')}
            <ArrowRightIcon size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}

/** Loading placeholder mirroring the row layout — the page never spins. */
export function ProRowSkeleton() {
  return (
    <div
      aria-hidden
      className="rounded-lg border border-line bg-white p-lg md:p-xl"
    >
      <div className="motion-safe:animate-pulse">
        <div className="flex gap-md sm:gap-lg">
          <div className="h-11 w-11 shrink-0 rounded-full bg-line-soft sm:h-16 sm:w-16" />
          <div className="min-w-0 flex-1">
            <div className="h-4 w-40 max-w-full rounded-sm bg-line-soft" />
            <div className="mt-sm h-4 w-64 max-w-full rounded-sm bg-line-soft sm:h-5 sm:w-72" />
            <div className="mt-sm h-3 w-24 rounded-sm bg-line-soft" />
            <div className="hidden sm:block">
              <div className="mt-md h-4 w-80 max-w-full rounded-sm bg-line-soft" />
              <div className="mt-md flex flex-wrap gap-sm">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-6 w-16 rounded-full bg-line-soft" />
                ))}
              </div>
              <div className="mt-md h-4 w-full max-w-[520px] rounded-sm bg-line-soft" />
              <div className="mt-xs h-4 w-3/5 max-w-[380px] rounded-sm bg-line-soft" />
            </div>
          </div>
          <div className="h-12 w-12 shrink-0 rounded-md bg-line-soft sm:hidden" />
          <div className="hidden shrink-0 flex-col items-end justify-between gap-md sm:flex">
            <div className="h-12 w-12 rounded-md bg-line-soft" />
            <div className="h-12 w-28 rounded-md bg-line-soft" />
          </div>
        </div>
        <div className="sm:hidden">
          <div className="mt-sm h-3.5 w-full rounded-sm bg-line-soft" />
          <div className="mt-sm flex gap-xs">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-7 w-16 rounded-full bg-line-soft" />
            ))}
          </div>
          <div className="mt-sm h-4 w-4/5 rounded-sm bg-line-soft" />
          <div className="mt-xs flex justify-end">
            <div className="h-9 w-28 rounded-md bg-line-soft" />
          </div>
        </div>
      </div>
    </div>
  );
}
