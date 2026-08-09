import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { ProfessionalProfile } from '@inyalink/shared';
import {
  completenessInputFromProfile,
  computeProfessionalCompleteness,
  formatMmk,
} from '@inyalink/shared';
import { getProfessional } from '../lib/api';
import { ApiError } from '../lib/apiClient';
import {
  useMyProfessional,
} from '../components/AccountMenu';
import { useChatUi } from '../components/FloatingChat';
import { Skeleton } from '../components/Skeleton';
import { useI18n } from '../lib/i18n';
import { LoadErrorNotice } from '../components/Notices';
import { ProfileCompleteness } from '../features/professionals/ProfileCompleteness';
import { WorkLinksDisplay } from '../features/professionals/WorkLinksFields';

function CheckIcon() {
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
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 21s-6-5.33-6-10a6 6 0 1 1 12 0c0 4.67-6 10-6 10z" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-sm bg-jade-50 px-md py-md">
      <dt className="text-caption text-ink-500 [overflow-wrap:anywhere]">{label}</dt>
      <dd className="mt-xs text-stat text-jade-600 [overflow-wrap:anywhere]">{value}</dd>
    </div>
  );
}

function ProfessionalProfileSkeleton() {
  return (
    <article className="py-2xl md:py-3xl" role="status" aria-busy="true">
      <span className="sr-only">…</span>
      <Skeleton className="h-4 w-16" />

      <header className="mt-xl flex flex-col gap-xl sm:flex-row sm:items-start">
        <Skeleton className="h-[88px] w-[88px] shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-7 w-48 max-w-full" />
          <Skeleton className="mt-sm h-5 w-72 max-w-full" />
          <Skeleton className="mt-sm h-3.5 w-32" />
          <div className="mt-xl flex flex-col gap-sm sm:flex-row">
            <Skeleton className="h-12 w-full rounded-md sm:w-36" />
            <Skeleton className="h-12 w-full rounded-md sm:w-28" />
          </div>
        </div>
      </header>

      <div className="mt-2xl grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="min-w-0 rounded-sm bg-jade-50 px-md py-md">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="mt-xs h-6 w-10" />
          </div>
        ))}
      </div>

      <section className="mt-3xl">
        <Skeleton className="h-5 w-24" />
        <div className="mt-lg grid gap-xl md:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-line bg-white p-lg"
            >
              <Skeleton className="h-3 w-14" />
              <Skeleton className="mt-sm h-4 w-full" />
              <Skeleton className="mt-xs h-4 w-[85%]" />
              <Skeleton className="mt-xs h-4 w-[70%]" />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-3xl">
        <Skeleton className="h-5 w-28" />
        <ul className="mt-lg grid grid-cols-2 gap-md sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <li
              key={i}
              className="overflow-hidden rounded-sm border border-line"
            >
              <Skeleton className="aspect-square w-full rounded-none" />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-3xl pb-3xl">
        <Skeleton className="h-5 w-20" />
        <div className="mt-lg flex flex-wrap gap-sm">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-6 w-16 rounded-sm" />
          ))}
        </div>
      </section>
    </article>
  );
}

const SAVED_KEY = 'inyalink.savedPros';

function readSaved(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === 'string')
      : [];
  } catch {
    return [];
  }
}

export default function ProfessionalProfilePage() {
  const { id = '' } = useParams();
  const { t, locale } = useI18n();
  const { setOpen } = useChatUi();
  const myPro = useMyProfessional();

  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(() => readSaved().includes(id));

  const load = useCallback(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getProfessional(id)
      .then((data) => {
        if (!cancelled) {
          setProfile(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : t('profile.loadError'),
          );
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  useEffect(() => {
    return load();
  }, [load]);

  function toggleSave() {
    const next = readSaved();
    const exists = next.includes(id);
    const updated = exists ? next.filter((x) => x !== id) : [...next, id];
    localStorage.setItem(SAVED_KEY, JSON.stringify(updated));
    setSaved(!exists);
  }

  function onMessage() {
    setOpen(true);
  }

  if (loading) {
    return <ProfessionalProfileSkeleton />;
  }

  if (error || !profile) {
    return (
      <div className="py-3xl">
        <LoadErrorNotice
          message={error ?? t('profile.loadError')}
          onRetry={() => {
            void load();
          }}
        />
      </div>
    );
  }

  const headline =
    locale === 'en'
      ? (profile.headlineEn ?? profile.headlineMy)
      : (profile.headlineMy ?? profile.headlineEn);

  const isOwner = myPro != null && myPro.id === profile.id;
  const completeness = isOwner
    ? computeProfessionalCompleteness(completenessInputFromProfile(profile))
    : null;

  const stats = [
    {
      label: t('landing.cardStat.jobs'),
      value: String(profile.stats.completedCount),
    },
    {
      label: t('landing.cardStat.clients'),
      value: String(profile.stats.uniqueClients),
    },
    {
      label: t('landing.cardStat.rate'),
      value:
        profile.stats.completionRatePct === null
          ? '—'
          : `${Math.round(profile.stats.completionRatePct)}%`,
    },
    {
      label: t('landing.cardStat.reply'),
      value:
        profile.stats.medianResponseMins === null
          ? '—'
          : `${Math.round(profile.stats.medianResponseMins)}m`,
    },
    {
      label: t('profile.statTurnaround'),
      value:
        profile.stats.typicalTurnaroundDays === null
          ? '—'
          : `${profile.stats.typicalTurnaroundDays}d`,
    },
    {
      label: t('profile.statBudget'),
      value:
        profile.stats.minBudgetMmk === null
          ? '—'
          : formatMmk(profile.stats.minBudgetMmk, locale),
    },
  ];

  return (
    <article className="py-2xl md:py-3xl">
      <Link
        to="/"
        className="tap-target inline-flex items-center text-body-sm text-ink-500 transition-colors duration-fast ease-out hover:text-jade-600 focus-visible:shadow-focus"
      >
        {t('common.back')}
      </Link>

      <header className="mt-xl flex flex-col gap-xl sm:flex-row sm:items-start">
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt=""
            width={88}
            height={88}
            className="h-[88px] w-[88px] shrink-0 rounded-full object-cover"
          />
        ) : (
          <div
            className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-full bg-jade-100 font-display text-display-sm text-jade-800"
            aria-hidden
          >
            {profile.displayName.slice(0, 1)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-sm">
            <h1 className="text-display-sm text-ink-900 [overflow-wrap:anywhere]">
              {profile.displayName}
            </h1>
            {profile.verified ? (
              <span className="inline-flex items-center gap-xs rounded-sm bg-jade-100 px-2.5 py-1 text-caption font-medium text-jade-800">
                <span className="text-jade-600">
                  <CheckIcon />
                </span>
                {t('landing.verified')}
              </span>
            ) : null}
          </div>
          {headline ? (
            <p className="mt-sm text-body-lg leading-[1.8] text-ink-500 [overflow-wrap:anywhere]">
              {headline}
            </p>
          ) : null}
          {profile.location ? (
            <p className="mt-sm flex items-center gap-xs text-caption text-ink-400">
              <PinIcon />
              {profile.location}
            </p>
          ) : null}

          <div className="mt-xl flex flex-col gap-sm sm:flex-row">
            {isOwner ? (
              <Link
                to="/professionals/me/edit"
                className="tap-target inline-flex items-center justify-center rounded-md bg-jade-600 px-xl text-body font-medium text-white transition-colors duration-fast ease-out hover:bg-jade-400 focus-visible:shadow-focus active:bg-jade-800"
              >
                {t('profile.editProfile')}
              </Link>
            ) : (
              <button
                type="button"
                onClick={onMessage}
                className="tap-target inline-flex items-center justify-center rounded-md bg-jade-600 px-xl text-body font-medium text-white transition-colors duration-fast ease-out hover:bg-jade-400 focus-visible:shadow-focus active:bg-jade-800"
              >
                {t('profile.message')}
              </button>
            )}
            <button
              type="button"
              onClick={toggleSave}
              aria-pressed={saved}
              className="tap-target inline-flex items-center justify-center rounded-md border border-line bg-white px-xl text-body font-medium text-ink-900 transition-colors duration-fast ease-out hover:border-jade-400 hover:bg-jade-50 focus-visible:shadow-focus active:bg-jade-100"
            >
              {saved ? t('profile.saved') : t('profile.save')}
            </button>
          </div>
        </div>
      </header>

      {completeness && completeness.missing.length > 0 ? (
        <div className="mt-2xl">
          <ProfileCompleteness
            percent={completeness.percent}
            missing={completeness.missing}
            mode="profile"
          />
        </div>
      ) : null}

      <dl className="mt-2xl grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <StatCell key={s.label} label={s.label} value={s.value} />
        ))}
      </dl>

      {profile.stats.completedCount === 0 ? (
        <section className="mt-3xl" aria-labelledby="jobs-heading">
          <h2 id="jobs-heading" className="text-title text-ink-900">
            {t('profile.jobs')}
          </h2>
          <p className="mt-lg text-body-sm leading-[1.8] text-ink-500 [overflow-wrap:anywhere]">
            {t('profile.jobsEmpty')}
          </p>
        </section>
      ) : null}

      <section className="mt-3xl" aria-labelledby="bio-heading">
        <h2 id="bio-heading" className="text-title text-ink-900">
          {t('profile.bio')}
        </h2>
        <div className="mt-lg grid gap-xl md:grid-cols-2">
          {profile.bioMy ? (
            <div className="rounded-lg border border-line bg-white p-lg">
              <p className="text-caption font-medium text-ink-400">မြန်မာ</p>
              <p className="font-myanmar mt-sm text-body leading-[1.8] text-ink-700 [overflow-wrap:anywhere]">
                {profile.bioMy}
              </p>
            </div>
          ) : null}
          {profile.bioEn ? (
            <div className="rounded-lg border border-line bg-white p-lg">
              <p className="text-caption font-medium text-ink-400">English</p>
              <p className="mt-sm text-body leading-[1.8] text-ink-700 [overflow-wrap:anywhere]">
                {profile.bioEn}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-3xl" aria-labelledby="work-links-heading">
        <h2 id="work-links-heading" className="text-title text-ink-900">
          {t('workLinks.title')}
        </h2>
        {profile.workLinks.length > 0 ? (
          <WorkLinksDisplay links={profile.workLinks} />
        ) : (
          <p className="mt-lg text-body-sm leading-[1.8] text-ink-500 [overflow-wrap:anywhere]">
            {t('profile.workLinksEmpty')}
          </p>
        )}
      </section>

      <section className="mt-3xl" aria-labelledby="portfolio-heading">
        <h2 id="portfolio-heading" className="text-title text-ink-900">
          {t('profile.portfolio')}
        </h2>
        {profile.portfolio.length === 0 ? (
          <p className="mt-lg text-body-sm leading-[1.8] text-ink-500 [overflow-wrap:anywhere]">
            {t('profile.portfolioEmpty')}
          </p>
        ) : (
          <ul className="mt-lg grid grid-cols-2 gap-md sm:grid-cols-3">
            {profile.portfolio.map((item) => (
              <li
                key={item.id}
                className="overflow-hidden rounded-sm border border-line bg-jade-50"
              >
                {item.externalUrl ? (
                  <img
                    src={item.externalUrl}
                    alt={item.caption ?? ''}
                    className="aspect-square w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="aspect-square bg-jade-100" />
                )}
                {item.caption ? (
                  <p className="px-sm py-sm text-caption leading-[1.8] text-ink-500 [overflow-wrap:anywhere]">
                    {item.caption}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-3xl pb-3xl" aria-labelledby="skills-heading">
        <h2 id="skills-heading" className="text-title text-ink-900">
          {t('profile.skills')}
        </h2>
        {profile.skills.length === 0 ? (
          <p className="mt-lg text-body-sm leading-[1.8] text-ink-500 [overflow-wrap:anywhere]">
            {t('profile.skillsEmpty')}
          </p>
        ) : (
          <ul className="mt-lg flex flex-wrap gap-sm">
            {profile.skills.map((skill) => (
              <li
                key={skill}
                className="rounded-sm border border-line bg-white px-2.5 py-1 text-caption text-ink-700 [overflow-wrap:anywhere]"
              >
                {skill}
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
