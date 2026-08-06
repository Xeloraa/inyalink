import type { CategorySlug } from '@inyalink/shared';

/** Slider bounds sized to seeded pro budgets (80k–800k MMK). Max = "no cap". */
export const BUDGET_MIN = 0;
export const BUDGET_MAX = 1_000_000;
export const BUDGET_STEP = 25_000;

export type BrowseFilters = {
  categories: CategorySlug[];
  skills: string[];
  /** [low, high] slider positions in MMK; high === BUDGET_MAX means uncapped. */
  budget: [number, number];
  availableOnly: boolean;
};

export const DEFAULT_FILTERS: BrowseFilters = {
  categories: [],
  skills: [],
  budget: [BUDGET_MIN, BUDGET_MAX],
  availableOnly: false,
};

/** How many filters differ from the defaults — shown next to "clear filters". */
export function countActiveFilters(filters: BrowseFilters): number {
  const budgetActive =
    filters.budget[0] !== BUDGET_MIN || filters.budget[1] !== BUDGET_MAX;
  return (
    filters.categories.length +
    filters.skills.length +
    (budgetActive ? 1 : 0) +
    (filters.availableOnly ? 1 : 0)
  );
}
