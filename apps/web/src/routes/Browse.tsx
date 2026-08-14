import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  keepPreviousData,
  useMutation,
  useQuery,
} from '@tanstack/react-query';
import {
  formatMmk,
  type ProfessionalListItem,
  type ProfessionalsSort,
} from '@inyalink/shared';
import {
  getCategories,
  getProfessionalSkills,
  listProfessionals,
  startDirectConversation,
  type ListProfessionalsParams,
} from '../lib/api';
import { ApiError } from '../lib/apiClient';
import { useAuth } from '../lib/auth';
import { useChatUi } from '../features/chat/FloatingChat';
import { Skeleton } from '../components/Skeleton';
import { useI18n } from '../lib/i18n';
import {
  BUDGET_MAX,
  BUDGET_MIN,
  DEFAULT_FILTERS,
  countActiveFilters,
  type BrowseFilters,
} from '../features/professionals/filters';
import { CategoryPills } from '../features/professionals/CategoryPills';
import { FilterRail } from '../features/professionals/FilterRail';
import { FilterSheet } from '../features/professionals/FilterSheet';
import { Toolbar } from '../features/professionals/Toolbar';
import {
  ArrowRightIcon,
  CheckIcon,
  HeartIcon,
} from '../features/professionals/icons';
import { useSavedPros } from '../features/professionals/savedPros';
import { useDebouncedValue } from '../features/professionals/useDebouncedValue';

const SKELETON_ROWS = 4;

function replyValue(medianMins: number | null): string {
  if (medianMins === null) return '—';
  if (medianMins < 60) return `${Math.round(medianMins)}m`;
  return `${Math.round(medianMins / 60)}h`;
}

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex min-w-[52px] flex-col items-center text-center">
      <span className="text-body-sm font-semibold text-ink-900">{value}</span>
      <span className="text-caption text-ink-400">{label}</span>
    </div>
  );
}

/**
 * Find talent row — full-width flat row per design handoff:
 * avatar · identity/skills · Message (primary) + View profile.
 */
function TalentRow({
  pro,
  saved,
  onToggleSave,
  onMessage,
  messagePending,
}: {
  pro: ProfessionalListItem;
  saved: boolean;
  onToggleSave: () => void;
  onMessage: () => void;
  messagePending: boolean;
}) {
  const { t, locale } = useI18n();
  const profilePath = `/professionals/${pro.id}`;
  const headline =
    locale === 'en'
      ? (pro.headlineEn ?? pro.headlineMy)
      : (pro.headlineMy ?? pro.headlineEn);
  const budget =
    pro.stats.minBudgetMmk === null
      ? null
      : formatMmk(pro.stats.minBudgetMmk, locale);

  return (
    <article className="flex flex-wrap items-center gap-4 border-b border-line px-[18px] py-4 transition-colors duration-fast ease-out hover:bg-hover">
      {pro.avatarUrl ? (
        <img
          src={pro.avatarUrl}
          alt=""
          width={64}
          height={64}
          loading="lazy"
          className="h-16 w-16 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-jade-100 font-display text-[15.5px] font-semibold text-jade-600"
        >
          {pro.displayName.slice(0, 1)}
        </div>
      )}

      <div className="min-w-0 flex-[1_1_220px]">
        <div className="flex items-center gap-1.5">
          <span className="text-[15.5px] font-semibold leading-burmese text-ink-900 [overflow-wrap:anywhere]">
            {pro.displayName}
          </span>
          {pro.verified ? (
            <span className="inline-flex shrink-0 text-jade-600">
              <CheckIcon size={15} />
              <span className="sr-only">{t('landing.verified')}</span>
            </span>
          ) : null}
        </div>
        {headline ? (
          <p className="font-myanmar text-[13px] leading-burmese text-jade-600 [overflow-wrap:anywhere]">
            {headline}
          </p>
        ) : null}
        {pro.location || budget ? (
          <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] leading-burmese text-ink-400 [overflow-wrap:anywhere]">
            {pro.location ? <span>{pro.location}</span> : null}
            {pro.location && budget ? <span aria-hidden>·</span> : null}
            {budget ? (
              <span>
                {t('profile.statBudget')} {budget}
              </span>
            ) : null}
          </p>
        ) : null}
        {pro.skills.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {pro.skills.map((skill) => (
              <li
                key={skill}
                className="rounded-full bg-line-soft px-2.5 py-[3px] text-[11px] leading-burmese text-ink-700 [overflow-wrap:anywhere]"
              >
                {skill}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="hidden shrink-0 items-center gap-lg sm:flex">
        <StatCell value={String(pro.stats.completedCount)} label={t('browse.metricJobs')} />
        <StatCell value={String(pro.stats.uniqueClients)} label={t('browse.metricClients')} />
        <StatCell
          value={
            pro.stats.completionRatePct === null
              ? '—'
              : `${Math.round(pro.stats.completionRatePct)}%`
          }
          label={t('browse.metricRate')}
        />
        <StatCell
          value={replyValue(pro.stats.medianResponseMins)}
          label={t('browse.metricReply')}
        />
      </div>

      <div className="ml-auto flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
        <button
          type="button"
          aria-pressed={saved}
          aria-label={saved ? t('profile.saved') : t('profile.save')}
          onClick={onToggleSave}
          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md transition-colors duration-fast ease-out focus-visible:shadow-focus ${
            saved
              ? 'bg-jade-50 text-jade-600'
              : 'bg-page text-ink-300 hover:text-jade-600'
          }`}
        >
          <HeartIcon filled={saved} size={19} />
        </button>
        <button
          type="button"
          onClick={onMessage}
          disabled={messagePending}
          className="inline-flex h-11 min-h-[44px] flex-1 items-center justify-center whitespace-nowrap rounded-full bg-jade-600 px-[18px] text-[13px] font-semibold text-white shadow-cta transition-colors duration-fast ease-out hover:bg-jade-400 focus-visible:shadow-focus active:bg-jade-800 disabled:cursor-not-allowed disabled:opacity-70 sm:min-h-0 sm:flex-none"
        >
          {messagePending ? t('common.loading') : t('profile.message')}
        </button>
        <Link
          to={profilePath}
          className="inline-flex h-11 min-h-[44px] flex-1 items-center justify-center whitespace-nowrap rounded-full bg-page px-5 text-[13px] font-semibold text-ink-900 no-underline transition-colors duration-fast ease-out hover:bg-line-soft focus-visible:shadow-focus sm:min-h-0 sm:flex-none"
        >
          {t('browse.viewProfile')}
        </Link>
      </div>
    </article>
  );
}

function TalentRowSkeleton() {
  return (
    <div
      aria-hidden
      className="flex flex-wrap items-center gap-4 border-b border-line px-[18px] py-4"
    >
      <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
      <div className="min-w-0 flex-[1_1_220px]">
        <Skeleton className="h-4 w-40 max-w-full" />
        <Skeleton className="mt-1 h-3.5 w-56 max-w-full" />
        <Skeleton className="mt-1 h-3 w-36" />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-6 w-16 rounded-full" />
          ))}
        </div>
      </div>
      <div className="hidden shrink-0 gap-lg sm:flex">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex w-[52px] flex-col items-center gap-1">
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
      <div className="ml-auto flex w-full items-center gap-2 sm:w-auto">
        <Skeleton className="h-11 w-11 rounded-md" />
        <Skeleton className="h-11 flex-1 rounded-full sm:w-[88px] sm:flex-none" />
        <Skeleton className="h-11 flex-1 rounded-full sm:w-[110px] sm:flex-none" />
      </div>
    </div>
  );
}

/**
 * The professional directory. Database reads only — no AI calls, so it works
 * even when Groq is down or rate limited. The only path back to AI is the
 * quiet "describe your goal" bar above the list.
 */
export default function Browse() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { setOpen } = useChatUi();
  const { saved, toggleSaved } = useSavedPros();

  const [messageError, setMessageError] = useState<string | null>(null);
  const directMessageMutation = useMutation({
    mutationFn: (professionalId: string) =>
      startDirectConversation(professionalId),
    onSuccess: (engagement) => {
      setMessageError(null);
      navigate(`/app/engagements/${engagement.id}`);
    },
    onError: (err) => {
      setMessageError(
        err instanceof ApiError ? err.message : t('messages.sendError'),
      );
    },
  });

  function handleMessage(professionalId: string) {
    if (!session) {
      navigate('/login');
      return;
    }
    setMessageError(null);
    directMessageMutation.mutate(professionalId);
  }

  const [filters, setFilters] = useState<BrowseFilters>(DEFAULT_FILTERS);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<ProfessionalsSort>('relevance');
  const [sheetOpen, setSheetOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(search);
  const debouncedBudget = useDebouncedValue(filters.budget);

  const params: ListProfessionalsParams = useMemo(
    () => ({
      category: filters.categories.length ? filters.categories : undefined,
      skill: filters.skills.length ? filters.skills : undefined,
      q: debouncedSearch.trim() || undefined,
      sort,
      minBudget:
        debouncedBudget[0] > BUDGET_MIN ? debouncedBudget[0] : undefined,
      maxBudget:
        debouncedBudget[1] < BUDGET_MAX ? debouncedBudget[1] : undefined,
      acceptingOnly: filters.availableOnly || undefined,
    }),
    [filters, debouncedSearch, sort, debouncedBudget],
  );

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: Infinity,
  });
  const skillsQuery = useQuery({
    queryKey: ['professionalSkills'],
    queryFn: getProfessionalSkills,
    staleTime: Infinity,
  });
  const prosQuery = useQuery({
    queryKey: ['professionals', params],
    queryFn: () => listProfessionals(params),
    placeholderData: keepPreviousData,
  });

  const pros = prosQuery.data?.professionals ?? null;
  const activeCount = countActiveFilters(filters);
  const clearFilters = () => setFilters(DEFAULT_FILTERS);
  // The empty state may be caused by the search box, not just the rail, so
  // its action resets both — it must always bring results back.
  const clearEverything = () => {
    setFilters(DEFAULT_FILTERS);
    setSearch('');
  };

  const rail = (
    <FilterRail
      categories={categoriesQuery.data?.categories ?? []}
      skills={skillsQuery.data?.skills ?? []}
      filters={filters}
      onChange={setFilters}
    />
  );

  return (
    <div className="py-xl md:py-2xl">
      <h1 className="font-display text-display-sm text-ink-900">
        {t('browse.title')}
      </h1>
      <p className="mt-sm max-w-hero text-body text-ink-500">
        {t('browse.subhead')}
      </p>

      <div className="mt-xl lg:mt-2xl">
        <Toolbar
          count={pros?.length ?? null}
          search={search}
          onSearch={setSearch}
          sort={sort}
          onSort={setSort}
          availableOnly={filters.availableOnly}
          onToggleAvailable={() =>
            setFilters({ ...filters, availableOnly: !filters.availableOnly })
          }
          activeCount={activeCount}
          onOpenFilters={() => setSheetOpen(true)}
        />

        <div className="mt-lg">
          <CategoryPills
            categories={categoriesQuery.data?.categories ?? []}
            selected={filters.categories[0] ?? null}
            onSelect={(slug) =>
              setFilters({ ...filters, categories: slug ? [slug] : [] })
            }
          />
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group mt-lg flex min-h-[48px] w-full items-center justify-between gap-md rounded-md border border-jade-100 bg-jade-50 px-lg py-sm text-left no-underline transition-colors duration-fast ease-out hover:border-jade-200 hover:bg-jade-100 focus-visible:shadow-focus active:bg-jade-100"
        >
          <span className="text-body-sm text-ink-700">
            {t('browse.aiBarText')}{' '}
            <span className="font-medium text-jade-600 group-hover:underline group-hover:underline-offset-4">
              {t('browse.aiBarCta')}
            </span>
          </span>
          <span
            aria-hidden
            className="shrink-0 text-jade-600 transition-transform duration-fast ease-out group-hover:translate-x-xs motion-reduce:transition-none"
          >
            <ArrowRightIcon />
          </span>
        </button>

        {messageError ? (
          <p
            role="alert"
            className="mt-lg rounded-md border border-line bg-white px-lg py-md text-body-sm text-danger [overflow-wrap:anywhere]"
          >
            {messageError}
          </p>
        ) : null}

        <div className="mt-lg">
          {prosQuery.isPending ? (
              <div className="flex flex-col" role="status">
                <span className="sr-only">{t('common.loading')}</span>
                {Array.from({ length: SKELETON_ROWS }, (_, i) => (
                  <TalentRowSkeleton key={i} />
                ))}
              </div>
            ) : prosQuery.isError ? (
              <div
                role="alert"
                className="rounded-lg border border-line bg-white px-lg py-xl"
              >
                <p className="text-body-sm leading-[1.8] text-ink-700 [overflow-wrap:anywhere]">
                  {prosQuery.error instanceof ApiError
                    ? prosQuery.error.message
                    : t('browse.loadError')}
                </p>
                <button
                  type="button"
                  onClick={() => void prosQuery.refetch()}
                  className="tap-target mt-md inline-flex items-center justify-center rounded-md bg-jade-600 px-lg text-body-sm font-medium text-white transition-colors duration-fast ease-out hover:bg-jade-400 focus-visible:shadow-focus active:bg-jade-800"
                >
                  {t('common.retry')}
                </button>
              </div>
            ) : pros && pros.length === 0 ? (
              <div className="rounded-lg border border-line bg-white px-lg py-3xl text-center">
                <p className="font-display text-title text-ink-900 [overflow-wrap:anywhere]">
                  {t('browse.emptyTitle')}
                </p>
                <p className="mx-auto mt-sm max-w-[46ch] text-body-sm leading-[1.8] text-ink-500 [overflow-wrap:anywhere]">
                  {t('browse.emptyBody')}
                </p>
                <button
                  type="button"
                  onClick={clearEverything}
                  className="tap-target mt-lg inline-flex items-center justify-center rounded-md border border-jade-600 px-lg text-body-sm font-medium text-jade-600 transition-colors duration-fast ease-out hover:bg-jade-50 focus-visible:shadow-focus active:bg-jade-100"
                >
                  {t('browse.clearFilters')}
                </button>
              </div>
            ) : (
              <ul
                className={`flex flex-col border-t border-line transition-opacity duration-base ease-out ${
                  prosQuery.isPlaceholderData ? 'opacity-60' : ''
                }`}
              >
                {(pros ?? []).map((pro) => (
                  <li key={pro.id}>
                    <TalentRow
                      pro={pro}
                      saved={saved.has(pro.id)}
                      onToggleSave={() => toggleSaved(pro.id)}
                      onMessage={() => handleMessage(pro.id)}
                      messagePending={
                        directMessageMutation.isPending &&
                        directMessageMutation.variables === pro.id
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
        </div>
      </div>

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onClear={clearFilters}
        activeCount={activeCount}
        resultsLabel={t('browse.sheetShow').replace(
          '{count}',
          String(pros?.length ?? '…'),
        )}
      >
        {rail}
      </FilterSheet>
    </div>
  );
}
