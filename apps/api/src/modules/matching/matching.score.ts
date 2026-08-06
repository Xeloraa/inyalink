/**
 * Deterministic fit scoring. Never uses interest timestamp / speed.
 */

export type ScoreBreakdown = {
  skillOverlap: number;
  portfolioRelevance: number;
  budgetFit: number;
  completionRate: number;
};

export type ScoredPro = {
  professionalId: string;
  displayName: string;
  score: number;
  breakdown: ScoreBreakdown;
  rankReason: string;
  completedCount: number;
  partnerTier: boolean;
  fromInterest: boolean;
};

const WEIGHTS = {
  skillOverlap: 0.35,
  portfolioRelevance: 0.2,
  budgetFit: 0.25,
  completionRate: 0.2,
} as const;

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

/** Jaccard-ish overlap of brief requirements vs professional skills. */
export function skillOverlapScore(
  requirements: string[],
  skills: string[],
): number {
  const req = new Set(requirements.map(normalizeTag).filter(Boolean));
  const sk = new Set(skills.map(normalizeTag).filter(Boolean));
  if (req.size === 0) {
    return sk.size > 0 ? 0.4 : 0.2;
  }
  let hits = 0;
  for (const r of req) {
    if (sk.has(r)) hits += 1;
  }
  return hits / req.size;
}

/**
 * How well the professional's floor fits the brief budget band.
 * Pros priced above the brief max score 0.
 */
export function budgetFitScore(
  budgetMin: number | null,
  budgetMax: number | null,
  proMin: number | null,
): number {
  if (budgetMin === null && budgetMax === null) return 0.5;
  if (proMin === null) return 0.5;
  if (budgetMax !== null && proMin > budgetMax) return 0;
  if (
    budgetMin !== null &&
    budgetMax !== null &&
    proMin >= budgetMin &&
    proMin <= budgetMax
  ) {
    return 1;
  }
  if (budgetMax !== null && proMin <= budgetMax) return 0.85;
  if (budgetMin !== null && proMin < budgetMin) return 0.7;
  return 0.5;
}

export function completionRateScore(pct: number | null): number {
  if (pct === null) return 0.35;
  return Math.min(1, Math.max(0, pct / 100));
}

/**
 * Caption/skill text overlap vs brief title+description+requirements.
 * Deterministic — no LLM.
 */
export function portfolioRelevanceScore(
  briefText: string,
  requirements: string[],
  skills: string[],
  portfolioCaptions: string[],
): number {
  const tokens = new Set(
    [
      ...briefText.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean),
      ...requirements.map(normalizeTag),
    ].filter((t) => t.length > 1),
  );
  if (tokens.size === 0) return 0.3;

  const corpus = [
    ...skills.map(normalizeTag),
    ...portfolioCaptions.map((c) => c.toLowerCase()),
  ].join(' ');

  if (!corpus.trim()) {
    return skills.length > 0 ? 0.25 : 0.15;
  }

  let hits = 0;
  for (const t of tokens) {
    if (corpus.includes(t)) hits += 1;
  }
  return Math.min(1, hits / Math.min(tokens.size, 8));
}

export function buildRankReason(breakdown: ScoreBreakdown): string {
  const parts: Array<{ key: keyof ScoreBreakdown; label: string; value: number }> =
    [
      { key: 'skillOverlap', label: 'skill overlap', value: breakdown.skillOverlap },
      {
        key: 'portfolioRelevance',
        label: 'portfolio relevance',
        value: breakdown.portfolioRelevance,
      },
      { key: 'budgetFit', label: 'budget fit', value: breakdown.budgetFit },
      {
        key: 'completionRate',
        label: 'completion rate',
        value: breakdown.completionRate,
      },
    ];
  parts.sort((a, b) => b.value - a.value);
  const top = parts.filter((p) => p.value >= 0.5).slice(0, 2);
  if (top.length === 0) {
    return 'Best available fit among interested professionals.';
  }
  if (top.length === 1) {
    return `Strong ${top[0]!.label}.`;
  }
  return `Strong ${top[0]!.label} and ${top[1]!.label}.`;
}

export function scoreProfessional(args: {
  professionalId: string;
  displayName: string;
  skills: string[];
  portfolioCaptions: string[];
  minBudgetMmk: number | null;
  completionRatePct: number | null;
  completedCount: number;
  partnerTier: boolean;
  fromInterest: boolean;
  requirements: string[];
  budgetMin: number | null;
  budgetMax: number | null;
  briefText: string;
}): ScoredPro {
  const breakdown: ScoreBreakdown = {
    skillOverlap: skillOverlapScore(args.requirements, args.skills),
    portfolioRelevance: portfolioRelevanceScore(
      args.briefText,
      args.requirements,
      args.skills,
      args.portfolioCaptions,
    ),
    budgetFit: budgetFitScore(
      args.budgetMin,
      args.budgetMax,
      args.minBudgetMmk,
    ),
    completionRate: completionRateScore(args.completionRatePct),
  };
  const score =
    breakdown.skillOverlap * WEIGHTS.skillOverlap +
    breakdown.portfolioRelevance * WEIGHTS.portfolioRelevance +
    breakdown.budgetFit * WEIGHTS.budgetFit +
    breakdown.completionRate * WEIGHTS.completionRate;

  return {
    professionalId: args.professionalId,
    displayName: args.displayName,
    score,
    breakdown,
    rankReason: buildRankReason(breakdown),
    completedCount: args.completedCount,
    partnerTier: args.partnerTier,
    fromInterest: args.fromInterest,
  };
}

/** Rank by fit only. Tie-break: completed count, then display name. Never speed. */
export function rankTopCandidates(scored: ScoredPro[], limit = 3): ScoredPro[] {
  return [...scored]
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.completedCount - a.completedCount ||
        a.displayName.localeCompare(b.displayName),
    )
    .slice(0, limit);
}
