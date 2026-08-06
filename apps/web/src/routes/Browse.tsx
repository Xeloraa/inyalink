import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ProfessionalsSort } from '@inyalink/shared';
import {
  getCategories,
  getProfessionalSkills,
  listProfessionals,
  type ListProfessionalsParams,
} from '../lib/api';
import { ApiError } from '../lib/apiClient';
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
import { ProRow, ProRowSkeleton } from '../features/professionals/ProRow';
import { Toolbar } from '../features/professionals/Toolbar';
import { ArrowRightIcon } from '../features/professionals/icons';
import { useSavedPros } from '../features/professionals/savedPros';
import { useDebouncedValue } from '../features/professionals/useDebouncedValue';

const SKELETON_ROWS = 4;

/**
 * The professional directory. Database reads only — no AI calls, so it works
 * even when Groq is down or rate limited. The only path back to AI is the
 * quiet "describe your goal" bar above the list.
 */
export default function Browse() {
  const { t } = useI18n();
  const { saved, toggleSaved } = useSavedPros();

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

          <Link
            to="/converse"
            className="group mt-lg flex min-h-[48px] items-center justify-between gap-md rounded-md border border-jade-100 bg-jade-50 px-lg py-sm no-underline transition-colors duration-fast ease-out hover:border-jade-200 hover:bg-jade-100 focus-visible:shadow-focus active:bg-jade-100"
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
          </Link>

          <div className="mt-lg">
            {prosQuery.isPending ? (
              <div className="flex flex-col gap-md" role="status">
                <span className="sr-only">{t('common.loading')}</span>
                {Array.from({ length: SKELETON_ROWS }, (_, i) => (
                  <ProRowSkeleton key={i} />
                ))}
              </div>
            ) : prosQuery.isError ? (
              <div
                role="alert"
                className="rounded-lg border border-line bg-white px-lg py-xl"
              >
                <p className="text-body-sm text-ink-700">
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
                <p className="font-display text-title text-ink-900">
                  {t('browse.emptyTitle')}
                </p>
                <p className="mx-auto mt-sm max-w-[46ch] text-body-sm text-ink-500">
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
                className={`flex flex-col gap-md transition-opacity duration-base ease-out ${
                  prosQuery.isPlaceholderData ? 'opacity-60' : ''
                }`}
              >
                {(pros ?? []).map((pro) => (
                  <li key={pro.id}>
                    <ProRow
                      pro={pro}
                      saved={saved.has(pro.id)}
                      onToggleSave={() => toggleSaved(pro.id)}
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
