import type { ProfessionalsSort } from '@inyalink/shared';
import { useRef, useState } from 'react';
import { Skeleton } from '../../components/Skeleton';
import { useI18n } from '../../lib/i18n';
import { SearchDialog } from './SearchDialog';
import { SearchIcon, SlidersIcon } from './icons';

const SORT_OPTIONS: { value: ProfessionalsSort; labelKey: string }[] = [
  { value: 'relevance', labelKey: 'browse.sortRelevance' },
  { value: 'jobs', labelKey: 'browse.sortJobs' },
  { value: 'reply', labelKey: 'browse.sortReply' },
];

/** "{count} professionals" with the number emphasised, in either locale. */
function ResultCount({ count }: { count: number | null }) {
  const { t } = useI18n();

  if (count === null) {
    return <Skeleton className="inline-block h-4 w-32" />;
  }

  const template = t(count === 1 ? 'browse.resultsOne' : 'browse.resultsMany');
  const [before = '', after = ''] = template.split('{count}');
  return (
    <>
      {before}
      <strong className="font-semibold text-ink-900">{count}</strong>
      {after}
    </>
  );
}

/** Result count, search trigger (opens square dialog), sort, mobile Filters. */
export function Toolbar({
  count,
  search,
  onSearch,
  sort,
  onSort,
  activeCount,
  onOpenFilters,
}: {
  count: number | null;
  search: string;
  onSearch: (value: string) => void;
  sort: ProfessionalsSort;
  onSort: (value: ProfessionalsSort) => void;
  activeCount: number;
  onOpenFilters: () => void;
}) {
  const { t } = useI18n();
  const [dialogOpen, setDialogOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="flex flex-col gap-md md:flex-row md:items-center md:justify-between">
      <p role="status" className="text-body-sm text-ink-500">
        <ResultCount count={count} />
      </p>

      <div className="flex flex-col gap-sm sm:flex-row sm:items-center">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setDialogOpen(true)}
          aria-label={t('browse.searchOpen')}
          className="tap-target relative flex h-12 w-full items-center gap-sm rounded-2md border border-line bg-white px-md text-left text-body-sm text-ink-400 transition-colors duration-fast ease-out hover:border-jade-400 focus-visible:shadow-focus sm:w-72"
        >
          <span className="text-ink-400">
            <SearchIcon />
          </span>
          <span className="min-w-0 flex-1 truncate">
            {search.trim() || t('browse.searchPlaceholder')}
          </span>
        </button>

        <div className="flex gap-sm">
          <select
            value={sort}
            onChange={(e) => onSort(e.target.value as ProfessionalsSort)}
            aria-label={t('browse.sortLabel')}
            className="tap-target h-12 flex-1 cursor-pointer rounded-2md border border-line bg-white px-md text-body-sm text-ink-700 outline-none transition-colors duration-fast ease-out hover:border-jade-400 focus:border-jade-400 focus-visible:shadow-focus sm:flex-none"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onOpenFilters}
            className="tap-target inline-flex items-center justify-center gap-sm rounded-2md border border-line bg-white px-lg text-body-sm font-medium text-ink-700 transition-colors duration-fast ease-out hover:border-jade-400 hover:text-jade-600 focus-visible:shadow-focus active:bg-jade-50 lg:hidden"
          >
            <SlidersIcon />
            {t('browse.filtersButton')}
            {activeCount > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-jade-600 px-xs text-caption font-semibold text-white">
                {activeCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      <SearchDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        search={search}
        onSearch={onSearch}
        returnFocusRef={triggerRef}
      />
    </div>
  );
}
