import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { ProfessionalProfile } from '@inyalink/shared';
import {
  completenessInputFromProfile,
  computeProfessionalCompleteness,
  formatMmk,
} from '@inyalink/shared';
import { getProfessional } from '../lib/api';
import { ApiError } from '../lib/apiClient';
import { useMyProfessional } from '../components/AccountMenu';
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

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19.5 12.572 12 20l-7.5-7.428A5 5 0 1 1 12 6.006a5 5 0 1 1 7.5 6.566" />
    </svg>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2md bg-jade-50 px-2.5 py-md text-center">
      <dd className="font-display text-[20px] font-semibold leading-none text-jade-600 [overflow-wrap:anywhere]">
        {value}
      </dd>
      <dt className="mt-xs text-[11px] leading-[1.6] text-ink-500 [overflow-wrap:anywhere]">
        {label}
      </dt>
    </div>
  );
}

function ProfileSheetChrome({
  children,
  onClose,
  backLabel,
}: {
  children: ReactNode;
  onClose: () => void;
  backLabel: string;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-scrim p-3 animate-fade-in md:p-[3vh_3vw]"
      role="presentation"
    >
      <div
        className="flex h-[92dvh] w-full max-w-[1040px] flex-col overflow-hidden rounded-xl bg-page p-lg shadow-lg animate-fade-up md:h-[82vh] md:p-[22px]"
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-sm flex shrink-0 items-center justify-between gap-md">
          <button
            type="button"
            onClick={onClose}
            className="tap-target inline-flex items-center gap-sm py-xs text-[13px] text-ink-500 transition-colors duration-fast ease-out hover:text-jade-600 focus-visible:shadow-focus"
          >
            ← {backLabel}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={backLabel}
            className="tap-target flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-ink-700 shadow-sm transition-colors duration-fast ease-out hover:bg-hover focus-visible:shadow-focus"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function ProfessionalProfileSkeleton({
  onClose,
  backLabel,
}: {
  onClose: () => void;
  backLabel: string;
}) {
  return (
    <ProfileSheetChrome onClose={onClose} backLabel={backLabel}>
      <article role="status" aria-busy="true">
        <span className="sr-only">…</span>
        <div className="mt-md rounded-2xl bg-white p-xl shadow-md">
          <div className="flex flex-col gap-xl sm:flex-row sm:items-start">
            <Skeleton className="h-[88px] w-[88px] shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-7 w-48 max-w-full" />
              <Skeleton className="mt-sm h-5 w-72 max-w-full" />
              <Skeleton className="mt-sm h-3.5 w-32" />
            </div>
            <Skeleton className="h-12 w-36 rounded-full" />
          </div>
          <div className="mt-2xl grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="min-w-0 rounded-2md bg-jade-50 px-2.5 py-md"
              >
                <Skeleton className="mx-auto h-5 w-10" />
                <Skeleton className="mx-auto mt-xs h-3 w-12" />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-lg grid gap-lg md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-xl2 bg-white p-[22px] shadow-md">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-md h-4 w-full" />
              <Skeleton className="mt-xs h-4 w-[85%]" />
            </div>
          ))}
        </div>
      </article>
    </ProfileSheetChrome>
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
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const { setOpen } = useChatUi();
  const myPro = useMyProfessional();

  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(() => readSaved().includes(id));

  const onClose = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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

  const backLabel = t('common.back');

  if (loading) {
    return (
      <ProfessionalProfileSkeleton onClose={onClose} backLabel={backLabel} />
    );
  }

  if (error || !profile) {
    return (
      <ProfileSheetChrome onClose={onClose} backLabel={backLabel}>
        <div className="py-3xl">
          <LoadErrorNotice
            message={error ?? t('profile.loadError')}
            onRetry={() => {
              void load();
            }}
          />
        </div>
      </ProfileSheetChrome>
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

  const initial = profile.displayName.slice(0, 1);

  return (
    <ProfileSheetChrome onClose={onClose} backLabel={backLabel}>
      <article>
        <header className="mt-md rounded-2xl bg-white p-xl shadow-md">
          <div className="flex flex-wrap items-start gap-[18px]">
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
                className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-full bg-jade-100 font-display text-display-sm font-semibold text-jade-600"
                aria-hidden
              >
                {initial}
              </div>
            )}

            <div className="min-w-0 flex-1 basis-[200px]">
              <div className="flex flex-wrap items-center gap-sm">
                <h1 className="font-display text-[26px] font-semibold leading-[1.6] text-ink-900 [overflow-wrap:anywhere]">
                  {profile.displayName}
                </h1>
                {profile.verified ? (
                  <span className="inline-flex items-center gap-xs whitespace-nowrap rounded-full bg-jade-100 px-[11px] py-1 text-[11.5px] font-semibold leading-[1.6] text-jade-800">
                    <span className="text-jade-600">
                      <CheckIcon />
                    </span>
                    {t('landing.verified')}
                  </span>
                ) : null}
              </div>
              {headline ? (
                <p className="mt-xs text-[15px] leading-[1.7] text-jade-600 [overflow-wrap:anywhere]">
                  {headline}
                </p>
              ) : null}
              {profile.location ? (
                <p className="mt-xs text-[12.5px] leading-[1.7] text-ink-400">
                  {profile.location}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 gap-sm">
              {isOwner ? (
                <Link
                  to="/professionals/me/edit"
                  className="tap-target inline-flex h-12 items-center justify-center rounded-full bg-jade-600 px-xl text-[14.5px] font-semibold text-white shadow-cta transition-colors duration-fast ease-out hover:bg-jade-400 focus-visible:shadow-focus active:bg-jade-800"
                >
                  {t('profile.editProfile')}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={onMessage}
                  className="tap-target inline-flex h-12 items-center justify-center rounded-full bg-jade-600 px-xl text-[14.5px] font-semibold text-white shadow-cta transition-colors duration-fast ease-out hover:bg-jade-400 focus-visible:shadow-focus active:bg-jade-800"
                >
                  {t('profile.message')}
                </button>
              )}
              <button
                type="button"
                onClick={toggleSave}
                aria-pressed={saved}
                aria-label={saved ? t('profile.saved') : t('profile.save')}
                className={`tap-target flex h-12 w-12 items-center justify-center rounded-full transition-colors duration-fast ease-out focus-visible:shadow-focus ${
                  saved
                    ? 'bg-jade-50 text-jade-600'
                    : 'bg-page text-ink-300 hover:text-jade-600'
                }`}
              >
                <HeartIcon filled={saved} />
              </button>
            </div>
          </div>

          {completeness && completeness.missing.length > 0 ? (
            <div className="mt-xl">
              <ProfileCompleteness
                percent={completeness.percent}
                missing={completeness.missing}
                mode="profile"
              />
            </div>
          ) : null}

          <dl className="mt-2xl grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
            {stats.map((s) => (
              <StatCell key={s.label} label={s.label} value={s.value} />
            ))}
          </dl>
        </header>

        {profile.stats.completedCount === 0 ? (
          <section
            className="mt-lg rounded-xl2 bg-white p-[22px] shadow-md"
            aria-labelledby="jobs-heading"
          >
            <h2
              id="jobs-heading"
              className="text-[15px] font-bold tracking-[0.02em] text-ink-900"
            >
              {t('profile.jobs')}
            </h2>
            <p className="mt-md text-[14px] leading-[1.8] text-ink-700 [overflow-wrap:anywhere]">
              {t('profile.jobsEmpty')}
            </p>
          </section>
        ) : null}

        <div className="mt-lg grid gap-lg md:grid-cols-2">
          <section
            className="rounded-xl2 bg-white p-[22px] shadow-md"
            aria-labelledby="bio-heading"
          >
            <h2
              id="bio-heading"
              className="text-[15px] font-bold tracking-[0.02em] text-ink-900"
            >
              {t('profile.bio')}
            </h2>
            {profile.bioMy || profile.bioEn ? (
              <div className="mt-md space-y-lg">
                {profile.bioMy ? (
                  <p className="font-myanmar text-[14px] leading-[1.8] text-ink-700 [overflow-wrap:anywhere]">
                    {profile.bioMy}
                  </p>
                ) : null}
                {profile.bioEn ? (
                  <p className="text-[14px] leading-[1.8] text-ink-700 [overflow-wrap:anywhere]">
                    {profile.bioEn}
                  </p>
                ) : null}
              </div>
            ) : null}

            <h2
              id="skills-heading"
              className="mt-[22px] text-[15px] font-bold tracking-[0.02em] text-ink-900"
            >
              {t('profile.skills')}
            </h2>
            {profile.skills.length === 0 ? (
              <p className="mt-md text-body-sm leading-[1.8] text-ink-500 [overflow-wrap:anywhere]">
                {t('profile.skillsEmpty')}
              </p>
            ) : (
              <ul className="mt-md flex flex-wrap gap-1.5">
                {profile.skills.map((skill) => (
                  <li
                    key={skill}
                    className="rounded-full bg-line-soft px-[13px] py-[5px] text-[12.5px] leading-[1.7] text-ink-700 [overflow-wrap:anywhere]"
                  >
                    {skill}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-[22px]" aria-labelledby="work-links-heading">
              <h2
                id="work-links-heading"
                className="text-[15px] font-bold tracking-[0.02em] text-ink-900"
              >
                {t('workLinks.title')}
              </h2>
              {profile.workLinks.length > 0 ? (
                <WorkLinksDisplay links={profile.workLinks} />
              ) : (
                <p className="mt-md text-body-sm leading-[1.8] text-ink-500 [overflow-wrap:anywhere]">
                  {t('profile.workLinksEmpty')}
                </p>
              )}
            </div>
          </section>

          <section
            className="rounded-xl2 bg-white p-[22px] shadow-md"
            aria-labelledby="portfolio-heading"
          >
            <h2
              id="portfolio-heading"
              className="text-[15px] font-bold tracking-[0.02em] text-ink-900"
            >
              {t('profile.portfolio')}
            </h2>
            {profile.portfolio.length === 0 ? (
              <p className="mt-md text-body-sm leading-[1.8] text-ink-500 [overflow-wrap:anywhere]">
                {t('profile.portfolioEmpty')}
              </p>
            ) : (
              <ul className="mt-md grid grid-cols-2 gap-sm sm:grid-cols-3">
                {profile.portfolio.map((item) => (
                  <li
                    key={item.id}
                    className="overflow-hidden rounded-md bg-jade-50"
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
        </div>
      </article>
    </ProfileSheetChrome>
  );
}
