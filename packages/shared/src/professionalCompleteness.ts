/**
 * Profile completeness ordered by matching impact.
 * Weights mirror apps/api matching.score.ts priorities (skills > portfolio/budget)
 * plus discoverability fields. No video-intro or identity-document fields exist.
 */

export const PROFESSIONAL_COMPLETENESS_FIELDS = [
  'skills',
  'portfolio',
  'minBudget',
  'category',
  'workLinks',
  'headlineMy',
  'headlineEn',
  'bioMy',
  'bioEn',
  'acceptingWork',
  'turnaround',
  'displayName',
] as const;

export type ProfessionalCompletenessFieldKey =
  (typeof PROFESSIONAL_COMPLETENESS_FIELDS)[number];

/** Relative weights — higher = more matching / discovery impact. */
export const PROFESSIONAL_COMPLETENESS_WEIGHTS: Record<
  ProfessionalCompletenessFieldKey,
  number
> = {
  skills: 20,
  portfolio: 18,
  minBudget: 14,
  category: 12,
  workLinks: 10,
  headlineMy: 8,
  headlineEn: 6,
  bioMy: 6,
  bioEn: 5,
  acceptingWork: 4,
  turnaround: 3,
  displayName: 2,
};

/** DOM id / hash target on `/professionals/me/edit`. */
export const PROFESSIONAL_COMPLETENESS_ANCHORS: Record<
  ProfessionalCompletenessFieldKey,
  string
> = {
  skills: 'skills',
  portfolio: 'portfolio',
  minBudget: 'minBudget',
  category: 'category',
  workLinks: 'workLinks',
  headlineMy: 'headlineMy',
  headlineEn: 'headlineEn',
  bioMy: 'bioMy',
  bioEn: 'bioEn',
  acceptingWork: 'acceptingWork',
  turnaround: 'turnaround',
  displayName: 'displayName',
};

export type ProfessionalCompletenessInput = {
  displayName: string;
  categorySlug: string | null;
  categoryOtherText?: string | null;
  skills: readonly string[];
  portfolioCount: number;
  workLinksCount: number;
  headlineMy: string | null;
  headlineEn: string | null;
  bioMy: string | null;
  bioEn: string | null;
  acceptingWork: boolean;
  typicalTurnaroundDays: number | null;
  minBudgetMmk: number | null;
};

export type ProfessionalCompletenessMissingItem = {
  key: ProfessionalCompletenessFieldKey;
  anchor: string;
};

export type ProfessionalCompleteness = {
  percent: number;
  filledWeight: number;
  totalWeight: number;
  missing: ProfessionalCompletenessMissingItem[];
};

function hasText(value: string | null | undefined, min = 1): boolean {
  return (value?.trim().length ?? 0) >= min;
}

function isFieldFilled(
  key: ProfessionalCompletenessFieldKey,
  input: ProfessionalCompletenessInput,
): boolean {
  switch (key) {
    case 'skills':
      return input.skills.length >= 1;
    case 'portfolio':
      return input.portfolioCount >= 1;
    case 'minBudget':
      return input.minBudgetMmk !== null && input.minBudgetMmk >= 10_000;
    case 'category': {
      if (!input.categorySlug) return false;
      if (input.categorySlug === 'other') {
        return hasText(input.categoryOtherText, 2);
      }
      return true;
    }
    case 'workLinks':
      return input.workLinksCount >= 1;
    case 'headlineMy':
      return hasText(input.headlineMy, 4);
    case 'headlineEn':
      return hasText(input.headlineEn, 4);
    case 'bioMy':
      return hasText(input.bioMy, 20);
    case 'bioEn':
      return hasText(input.bioEn, 20);
    case 'acceptingWork':
      return input.acceptingWork === true;
    case 'turnaround':
      return (
        input.typicalTurnaroundDays !== null &&
        input.typicalTurnaroundDays >= 1
      );
    case 'displayName':
      return hasText(input.displayName, 2);
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

export function computeProfessionalCompleteness(
  input: ProfessionalCompletenessInput,
): ProfessionalCompleteness {
  let filledWeight = 0;
  let totalWeight = 0;
  const missing: ProfessionalCompletenessMissingItem[] = [];

  for (const key of PROFESSIONAL_COMPLETENESS_FIELDS) {
    const weight = PROFESSIONAL_COMPLETENESS_WEIGHTS[key];
    totalWeight += weight;
    if (isFieldFilled(key, input)) {
      filledWeight += weight;
    } else {
      missing.push({
        key,
        anchor: PROFESSIONAL_COMPLETENESS_ANCHORS[key],
      });
    }
  }

  const percent =
    totalWeight === 0 ? 100 : Math.round((filledWeight / totalWeight) * 100);

  return { percent, filledWeight, totalWeight, missing };
}

/** Map a public or own professional profile into completeness input. */
export function completenessInputFromProfile(profile: {
  displayName: string;
  category: { slug: string } | null;
  categoryOtherText: string | null;
  skills: readonly string[];
  portfolio: readonly unknown[];
  workLinks: readonly unknown[];
  headlineMy: string | null;
  headlineEn: string | null;
  bioMy: string | null;
  bioEn: string | null;
  acceptingWork: boolean;
  stats: {
    typicalTurnaroundDays: number | null;
    minBudgetMmk: number | null;
  };
}): ProfessionalCompletenessInput {
  return {
    displayName: profile.displayName,
    categorySlug: profile.category?.slug ?? null,
    categoryOtherText: profile.categoryOtherText,
    skills: profile.skills,
    portfolioCount: profile.portfolio.length,
    workLinksCount: profile.workLinks.length,
    headlineMy: profile.headlineMy,
    headlineEn: profile.headlineEn,
    bioMy: profile.bioMy,
    bioEn: profile.bioEn,
    acceptingWork: profile.acceptingWork,
    typicalTurnaroundDays: profile.stats.typicalTurnaroundDays,
    minBudgetMmk: profile.stats.minBudgetMmk,
  };
}
