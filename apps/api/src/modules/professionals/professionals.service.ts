import { normalizeToUnicode } from '@inyalink/burmese';
import type {
  CategoriesResponse,
  CategorySlug,
  PortfolioItem,
  PortfolioUploadItem,
  ProfessionalApplyInput,
  ProfessionalApplyResponse,
  ProfessionalMe,
  ProfessionalProfile,
  ProfessionalSkillsResponse,
  ProfessionalUpdateInput,
  ProfessionalsListResponse,
  ProfessionalsSort,
} from '@inyalink/shared';
import { AppError } from '../../middleware/errors.js';
import { config } from '../../lib/config.js';
import * as repo from './professionals.repo.js';

/** Soft location labels for seeded pros until a city column exists. */
const DEMO_LOCATIONS: Record<string, string> = {
  'a0000000-0000-4000-8000-000000000001': 'ရန်ကုန်',
  'a0000000-0000-4000-8000-000000000009': 'မန္တလေး',
  'a0000000-0000-4000-8000-00000000000d': 'ရန်ကုန်',
};

const SKILL_FACET_LIMIT = 12;
const MAX_PORTFOLIO_ITEMS = 8;

/**
 * Text-match score for the directory search box. Name beats headline beats
 * skills beats bio, so `sort=relevance` with a query reads naturally.
 * Zero means "no match" and the row is dropped.
 */
function searchScore(row: repo.ProfessionalProfileRow, q: string): number {
  const has = (value: string | null): boolean =>
    value !== null && value.toLowerCase().includes(q);
  let score = 0;
  if (has(row.displayName)) score += 8;
  if (has(row.headlineMy) || has(row.headlineEn)) score += 4;
  if (row.skills.some((skill) => skill.toLowerCase().includes(q))) score += 3;
  if (has(row.categoryNameMy) || has(row.categoryNameEn)) score += 2;
  if (has(row.bioMy) || has(row.bioEn)) score += 1;
  return score;
}

function sortRows(
  rows: repo.ProfessionalProfileRow[],
  sort: ProfessionalsSort,
  scores: Map<string, number>,
): repo.ProfessionalProfileRow[] {
  const byName = (
    a: repo.ProfessionalProfileRow,
    b: repo.ProfessionalProfileRow,
  ): number => a.displayName.localeCompare(b.displayName);

  if (sort === 'jobs') {
    return [...rows].sort(
      (a, b) => b.completedCount - a.completedCount || byName(a, b),
    );
  }
  if (sort === 'reply') {
    return [...rows].sort((a, b) => {
      const am = a.medianResponseMins;
      const bm = b.medianResponseMins;
      if (am === null && bm === null) return byName(a, b);
      if (am === null) return 1;
      if (bm === null) return -1;
      return am - bm || byName(a, b);
    });
  }
  // relevance: match strength when searching, otherwise the repo's name order.
  if (scores.size > 0) {
    return [...rows].sort(
      (a, b) =>
        (scores.get(b.userId) ?? 0) - (scores.get(a.userId) ?? 0) ||
        byName(a, b),
    );
  }
  return rows;
}

function toMe(
  row: repo.ProfessionalProfileRow,
  portfolio: repo.PortfolioRow[],
): ProfessionalMe {
  return {
    id: row.userId,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    verified: row.status === 'approved',
    status: row.status,
    headlineMy: row.headlineMy,
    headlineEn: row.headlineEn,
    bioMy: row.bioMy,
    bioEn: row.bioEn,
    location: DEMO_LOCATIONS[row.userId] ?? 'မြန်မာ',
    category:
      row.categoryId &&
      row.categorySlug &&
      row.categoryNameMy &&
      row.categoryNameEn
        ? {
            id: row.categoryId,
            slug: row.categorySlug,
            nameMy: row.categoryNameMy,
            nameEn: row.categoryNameEn,
          }
        : null,
    skills: row.skills,
    acceptingWork: row.acceptingWork,
    stats: {
      completedCount: row.completedCount,
      declinedCount: row.declinedCount,
      uniqueClients: row.uniqueClients,
      completionRatePct: row.completionRatePct,
      medianResponseMins: row.medianResponseMins,
      typicalTurnaroundDays: row.typicalTurnaroundDays,
      minBudgetMmk: row.minBudgetMmk,
    },
    portfolio: portfolio.map((p) => ({
      id: p.id,
      caption: p.caption,
      externalUrl: p.externalUrl,
      storagePath: p.storagePath,
      sort: p.sort,
    })),
  };
}

export async function listProfessionals(filters: {
  categories?: CategorySlug[];
  minBudget?: number;
  maxBudget?: number;
  acceptingOnly?: boolean;
  skills?: string[];
  q?: string;
  sort?: ProfessionalsSort;
}): Promise<ProfessionalsListResponse> {
  let rows = await repo.listApprovedProfiles({
    categories: filters.categories,
    minBudget: filters.minBudget,
    maxBudget: filters.maxBudget,
    acceptingOnly: filters.acceptingOnly,
  });

  if (filters.skills && filters.skills.length > 0) {
    const wanted = filters.skills.map((s) =>
      normalizeToUnicode(s).trim().toLowerCase(),
    );
    rows = rows.filter((row) =>
      row.skills.some((skill) => wanted.includes(skill.toLowerCase())),
    );
  }

  const scores = new Map<string, number>();
  const q = filters.q ? normalizeToUnicode(filters.q).trim().toLowerCase() : '';
  if (q) {
    rows = rows.filter((row) => {
      const score = searchScore(row, q);
      if (score > 0) scores.set(row.userId, score);
      return score > 0;
    });
  }

  const sorted = sortRows(rows, filters.sort ?? 'relevance', scores);

  return {
    professionals: sorted.map((row) => ({
      id: row.userId,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      verified: row.status === 'approved',
      headlineMy: row.headlineMy,
      headlineEn: row.headlineEn,
      bioMy: row.bioMy,
      bioEn: row.bioEn,
      location: DEMO_LOCATIONS[row.userId] ?? 'မြန်မာ',
      categorySlug: row.categorySlug,
      skills: row.skills,
      acceptingWork: row.acceptingWork,
      stats: {
        completedCount: row.completedCount,
        declinedCount: row.declinedCount,
        uniqueClients: row.uniqueClients,
        completionRatePct: row.completionRatePct,
        medianResponseMins: row.medianResponseMins,
        typicalTurnaroundDays: row.typicalTurnaroundDays,
        minBudgetMmk: row.minBudgetMmk,
      },
    })),
  };
}

export async function listSkills(): Promise<ProfessionalSkillsResponse> {
  const facets = await repo.listSkillFacets();
  return { skills: facets.slice(0, SKILL_FACET_LIMIT) };
}

export async function listCategories(): Promise<CategoriesResponse> {
  const categories = await repo.listCategories();
  return {
    categories: categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      nameMy: c.nameMy,
      nameEn: c.nameEn,
    })),
  };
}

export async function getPublicProfile(
  id: string,
): Promise<ProfessionalProfile> {
  const row = await repo.getApprovedProfileById(id);
  if (!row) {
    throw new AppError(404, 'NOT_FOUND', 'Professional not found');
  }

  const portfolio = await repo.listPortfolio(id);
  const me = toMe(row, portfolio);
  const { status: _status, ...profile } = me;
  return profile;
}

export async function getMyProfessional(
  userId: string,
): Promise<ProfessionalMe> {
  const row = await repo.getProfileByUserId(userId);
  if (!row) {
    throw new AppError(404, 'NOT_FOUND', 'Professional profile not found');
  }
  const portfolio = await repo.listPortfolio(userId);
  return toMe(row, portfolio);
}

export async function applyAsProfessional(
  input: ProfessionalApplyInput,
  userId: string,
): Promise<ProfessionalApplyResponse> {
  const category = await repo.getCategoryBySlug(input.categorySlug);
  if (!category) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Unknown category');
  }

  const existing = await repo.getProfileByUserId(userId);
  if (
    existing &&
    (existing.status === 'pending' || existing.status === 'approved')
  ) {
    throw new AppError(
      409,
      'ALREADY_APPLIED',
      'Professional profile already exists',
    );
  }

  await repo.upsertApplicantProfile({
    userId,
    displayName: normalizeToUnicode(input.displayName.trim()),
  });

  // DEMO_MODE auto-approves so stage demos reach the interest feed immediately.
  const status = config.demoMode ? 'approved' : 'pending';

  const result = await repo.insertApplication({
    userId,
    categoryId: category.id,
    headlineMy: normalizeToUnicode(input.headlineMy.trim()),
    headlineEn: normalizeToUnicode(input.headlineEn.trim()),
    bioMy: normalizeToUnicode(input.bioMy.trim()),
    bioEn: normalizeToUnicode(input.bioEn.trim()),
    skills: input.skills.map((s) => normalizeToUnicode(s.trim())),
    typicalTurnaroundDays: input.typicalTurnaroundDays,
    minBudgetMmk: input.minBudgetMmk,
    acceptingWork: input.acceptingWork,
    status,
    portfolio: input.portfolio.map((p) => ({
      externalUrl: p.externalUrl,
      caption: p.caption
        ? normalizeToUnicode(p.caption.trim())
        : undefined,
    })),
  });

  return result;
}

export async function updateMyProfessional(
  userId: string,
  input: ProfessionalUpdateInput,
): Promise<ProfessionalMe> {
  const existing = await repo.getProfileByUserId(userId);
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Professional profile not found');
  }

  let categoryId: string | undefined;
  if (input.categorySlug) {
    const category = await repo.getCategoryBySlug(input.categorySlug);
    if (!category) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Unknown category');
    }
    categoryId = category.id;
  }

  if (input.displayName !== undefined) {
    await repo.updateDisplayName(
      userId,
      normalizeToUnicode(input.displayName.trim()),
    );
  }

  await repo.updateProfessional({
    userId,
    categoryId,
    headlineMy:
      input.headlineMy !== undefined
        ? normalizeToUnicode(input.headlineMy.trim())
        : undefined,
    headlineEn:
      input.headlineEn !== undefined
        ? normalizeToUnicode(input.headlineEn.trim())
        : undefined,
    bioMy:
      input.bioMy !== undefined
        ? normalizeToUnicode(input.bioMy.trim())
        : undefined,
    bioEn:
      input.bioEn !== undefined
        ? normalizeToUnicode(input.bioEn.trim())
        : undefined,
    skills: input.skills?.map((s) => normalizeToUnicode(s.trim())),
    typicalTurnaroundDays: input.typicalTurnaroundDays,
    minBudgetMmk: input.minBudgetMmk,
    acceptingWork: input.acceptingWork,
  });

  return getMyProfessional(userId);
}

export async function addMyPortfolioItem(
  userId: string,
  input: PortfolioUploadItem,
): Promise<PortfolioItem> {
  const existing = await repo.getProfileByUserId(userId);
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Professional profile not found');
  }

  const count = await repo.countPortfolioItems(userId);
  if (count >= MAX_PORTFOLIO_ITEMS) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      `Portfolio is limited to ${MAX_PORTFOLIO_ITEMS} items`,
    );
  }

  const row = await repo.addPortfolioItem({
    professionalId: userId,
    externalUrl: input.externalUrl,
    caption: input.caption
      ? normalizeToUnicode(input.caption.trim())
      : undefined,
  });

  return {
    id: row.id,
    caption: row.caption,
    externalUrl: row.externalUrl,
    storagePath: row.storagePath,
    sort: row.sort,
  };
}

export async function deleteMyPortfolioItem(
  userId: string,
  itemId: string,
): Promise<void> {
  const existing = await repo.getProfileByUserId(userId);
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Professional profile not found');
  }

  const count = await repo.countPortfolioItems(userId);
  if (count <= 1) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Keep at least one portfolio item',
    );
  }

  const deleted = await repo.deletePortfolioItem(userId, itemId);
  if (!deleted) {
    throw new AppError(404, 'NOT_FOUND', 'Portfolio item not found');
  }
}
