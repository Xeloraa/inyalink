import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ProfessionalListItem, ProfessionalsSort } from '@inyalink/shared';
import {
  getCategories,
  getProfessionalSkills,
  listProfessionals,
  type ListProfessionalsParams,
} from '../lib/api';
import { ApiError } from '../lib/apiClient';
import { useChatUi } from '../components/FloatingChat';
import { Skeleton } from '../components/Skeleton';
import { useI18n } from '../lib/i18n';
import {
  BUDGET_MAX,
  BUDGET_MIN,
  DEFAULT_FILTERS,
  countActiveFilters,
  type BrowseFilters,
} from '../features/professionals/filters';
import { ClearFiltersButton, FilterRail } from '../features/professionals/FilterRail';
import { FilterSheet } from '../features/professionals/FilterSheet';
import { Toolbar } from '../features/professionals/Toolbar';
import { ArrowRightIcon } from '../features/professionals/icons';
import { useDebouncedValue } from '../features/professionals/useDebouncedValue';

const SKELETON_ROWS = 4;
const SKILL_CHIPS = 5;

/** Find talent row — full-width list, not a card grid. */
function TalentRow({
  pro,
  onMessage,
}: {
  pro: ProfessionalListItem;
  onMessage: () => void;
}) {
  const { t, locale } = useI18n();
  const profilePath = `/professionals/${pro.id}`;
  const headline =
    locale === 'en'
      ? (pro.headlineEn ?? pro.headlineMy)
      : (pro.headlineMy ?? pro.headlineEn);
  const skills = pro.skills.slice(0, SKILL_CHIPS);
  const overflow = pro.skills.length - skills.length;

  return (
    <article className="flex flex-col gap-md px-md py-lg transition-colors duration-fast ease-out hover:bg-[#F7F9F7] sm:flex-row sm:items-center sm:gap-lg sm:px-lg">
      {pro.avatarUrl ? (
        <img
          src={pro.avatarUrl}
          alt=""
          width={48}
          height={48}
          loading="lazy"
          className="h-12 w-12 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-jade-100 font-display text-body text-jade-800"
        >
          {pro.displayName.slice(0, 1)}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold leading-burmese text-ink-900 [overflow-wrap:anywhere]">
          {pro.displayName}
        </p>
        {headline ? (
          <p className="mt-0.5 text-body-sm leading-burmese text-jade-600 [overflow-wrap:anywhere]">
            {headline}
          </p>
        ) : null}
        {pro.location ? (
          <p className="mt-0.5 text-caption leading-burmese text-ink-400 [overflow-wrap:anywhere]">
            {pro.location}
          </p>
        ) : null}
        {skills.length > 0 ? (
          <ul className="mt-sm flex flex-wrap gap-sm">
            {skills.map((skill) => (
              <li
                key={skill}
                className="rounded-full bg-line-soft px-sm py-0.5 text-caption leading-burmese text-ink-700 [overflow-wrap:anywhere]"
              >
                {skill}
              </li>
            ))}
            {overflow > 0 ? (
              <li className="rounded-full bg-line-soft px-sm py-0.5 text-caption text-ink-500">
                +{overflow}
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>

      <div className="flex w-full shrink-0 flex-col gap-sm sm:w-auto sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onMessage}
          className="tap-target inline-flex min-h-[44px] w-full items-center justify-center rounded-md bg-jade-600 px-lg text-body-sm font-medium text-white transition-colors duration-fast ease-out hover:bg-jade-400 focus-visible:shadow-focus active:bg-jade-800 sm:w-auto"
        >
          {t('profile.message')}
        </button>
        <Link
          to={profilePath}
          className="tap-target inline-flex min-h-[44px] w-full items-center justify-center rounded-md border border-line bg-white px-lg text-body-sm font-medium text-ink-900 no-underline transition-colors duration-fast ease-out hover:border-jade-400 hover:bg-jade-50 focus-visible:shadow-focus active:bg-jade-100 sm:w-auto"
        >
          {t('browse.viewProfile')}
        </Link>
      </div>
    </article>
  );
}

function TalentRowSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-md px-md py-lg sm:flex-row sm:items-center sm:gap-lg sm:px-lg">
      <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-4 w-40 max-w-full" />
        <Skeleton className="mt-xs h-3.5 w-56 max-w-full" />
        <Skeleton className="mt-xs h-3 w-24" />
        <div className="mt-sm flex flex-wrap gap-sm">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-6 w-16 rounded-full" />
          ))}
        </div>
      </div>
      <div className="flex w-full flex-col gap-sm sm:w-auto sm:flex-row">
        <Skeleton className="h-11 w-full rounded-md sm:w-28" />
        <Skeleton className="h-11 w-full rounded-md sm:w-28" />
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
  const { setOpen } = useChatUi();

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

      <div className="mt-xl flex items-start gap-2xl lg:mt-2xl">
        <aside className="hidden w-[260px] shrink-0 lg:block">
          <div className="sticky top-xl max-h-[calc(100dvh-48px)] overflow-y-auto rounded-lg border border-line bg-white p-lg">
            <div className="flex flex-wrap items-center justify-between gap-x-sm">
              <h2 className="text-body font-semibold text-ink-900">
                {t('browse.filters')}
              </h2>
              <ClearFiltersButton
                activeCount={activeCount}
                onClear={clearFilters}
              />
            </div>
            <div className="mt-lg">{rail}</div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <Toolbar
            count={pros?.length ?? null}
            search={search}
            onSearch={setSearch}
            sort={sort}
            onSort={setSort}
            activeCount={activeCount}
            onOpenFilters={() => setSheetOpen(true)}
          />

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

          <div className="mt-lg">
            {prosQuery.isPending ? (
              <div
                className="divide-y divide-line border-y border-line"
                role="status"
              >
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
                className={`divide-y divide-line border-y border-line transition-opacity duration-base ease-out ${
                  prosQuery.isPlaceholderData ? 'opacity-60' : ''
                }`}
              >
                {(pros ?? []).map((pro) => (
                  <li key={pro.id}>
                    <TalentRow
                      pro={pro}
                      onMessage={() => setOpen(true)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
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
