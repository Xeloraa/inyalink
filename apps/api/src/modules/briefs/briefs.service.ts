import { normalizeToUnicode } from '@inyalink/burmese';
import {
  BriefResponseSchema,
  type BriefDraft,
  type BriefResponse,
  type CreateBriefInput,
  type MatchingMode,
  type SubmitBriefInput,
  type UpdateBriefInput,
} from '@inyalink/shared';
import { config } from '../../lib/config.js';
import { AppError } from '../../middleware/errors.js';
import * as matchingService from '../matching/matching.service.js';
import * as repo from './briefs.repo.js';
import type { BriefRow, UpdateBriefRow } from './briefs.repo.js';

function normalizeOptionalText(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const normalized = normalizeToUnicode(value.trim());
  return normalized === '' ? null : normalized;
}

function normalizeStringList(values: string[] | undefined): string[] | undefined {
  if (values === undefined) return undefined;
  return values
    .map((v) => normalizeToUnicode(v.trim()))
    .filter((v) => v.length > 0);
}

async function resolveCategoryId(
  slug: string | undefined,
): Promise<string | null | undefined> {
  if (slug === undefined) return undefined;
  const trimmed = slug.trim();
  if (!trimmed) return null;
  const id = await repo.findCategoryIdBySlug(trimmed);
  if (!id) {
    throw new AppError(400, 'CATEGORY_NOT_FOUND', `Unknown category: ${trimmed}`);
  }
  return id;
}

function toResponse(row: BriefRow): BriefResponse {
  return BriefResponseSchema.parse({
    id: row.id,
    client_id: row.clientId,
    status: row.status,
    source: row.source,
    raw_input: row.rawInput,
    language: row.language,
    category_id: row.categoryId,
    category_slug: row.categorySlug,
    title: row.title,
    description: row.description,
    requirements: row.requirements,
    budget_min_mmk: row.budgetMinMmk,
    budget_max_mmk: row.budgetMaxMmk,
    deadline: row.deadline,
    reference_links: row.referenceLinks,
    ai_confidence: row.aiConfidence,
    needs_human_review: row.needsHumanReview,
    roadmap_id: row.roadmapId,
    urgent: row.urgent,
    interest_opens_at: row.interestOpensAt,
    interest_closes_at: row.interestClosesAt,
    matching_mode: row.matchingMode,
    fallback_used: row.fallbackUsed,
    ranked_at: row.rankedAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  });
}

/** interest_closes_at = min(now+24h, deadline end-of-day UTC). */
export function computeInterestClosesAt(
  opensAt: Date,
  deadline: string | null,
): Date {
  const plus24h = new Date(opensAt.getTime() + 24 * 60 * 60 * 1000);
  if (!deadline) return plus24h;
  const deadlineEnd = new Date(`${deadline}T23:59:59.999Z`);
  return deadlineEnd.getTime() < plus24h.getTime() ? deadlineEnd : plus24h;
}

function assertOwner(row: BriefRow, actorId: string): void {
  if (row.clientId !== actorId) {
    throw new AppError(403, 'FORBIDDEN', 'Not allowed to access this brief');
  }
}

function draftToInsertFields(draft: BriefDraft): {
  language: BriefDraft['language'] | null;
  title: string | null;
  description: string | null;
  requirements: string[];
  budgetMinMmk: number | null;
  budgetMaxMmk: number | null;
  deadline: string | null;
  referenceLinks: string[];
  aiConfidence: number | null;
  needsHumanReview: boolean;
  categorySlug?: string;
} {
  return {
    language: draft.language ?? null,
    title: normalizeOptionalText(draft.title) ?? null,
    description: normalizeOptionalText(draft.description) ?? null,
    requirements: normalizeStringList(draft.requirements) ?? [],
    budgetMinMmk: draft.budget_min_mmk ?? null,
    budgetMaxMmk: draft.budget_max_mmk ?? null,
    deadline: draft.deadline ?? null,
    referenceLinks: normalizeStringList(draft.reference_links) ?? [],
    aiConfidence: draft.ai_confidence ?? null,
    needsHumanReview: draft.needs_human_review ?? false,
    categorySlug: draft.category,
  };
}

export async function createBrief(
  input: CreateBriefInput,
  clientId: string,
): Promise<BriefResponse> {
  const fields = draftToInsertFields(input.draft);
  const categoryId =
    (await resolveCategoryId(fields.categorySlug)) ?? null;

  const row = await repo.insertBrief({
    clientId,
    source: input.source,
    rawInput: normalizeOptionalText(input.raw_input) ?? null,
    language: fields.language ?? null,
    categoryId,
    title: fields.title,
    description: fields.description,
    requirements: fields.requirements,
    budgetMinMmk: fields.budgetMinMmk,
    budgetMaxMmk: fields.budgetMaxMmk,
    deadline: fields.deadline,
    referenceLinks: fields.referenceLinks,
    aiConfidence: fields.aiConfidence,
    needsHumanReview: fields.needsHumanReview,
    roadmapId: input.roadmap_id ?? null,
  });

  return toResponse(row);
}

export async function getBrief(
  id: string,
  actorId: string,
): Promise<BriefResponse> {
  const row = await repo.getBriefById(id);
  if (!row) {
    throw new AppError(404, 'BRIEF_NOT_FOUND', 'Brief not found');
  }
  assertOwner(row, actorId);
  return toResponse(row);
}

export async function submitBrief(
  id: string,
  input: SubmitBriefInput,
  actorId: string,
): Promise<BriefResponse> {
  const existing = await repo.getBriefById(id);
  if (!existing) {
    throw new AppError(404, 'BRIEF_NOT_FOUND', 'Brief not found');
  }
  assertOwner(existing, actorId);
  if (existing.status !== 'draft') {
    throw new AppError(
      409,
      'BRIEF_NOT_EDITABLE',
      'Only draft briefs can be submitted',
    );
  }
  if (!existing.categoryId) {
    throw new AppError(
      400,
      'BRIEF_NOT_READY',
      'Brief needs a category before matching',
    );
  }
  if (!existing.description?.trim()) {
    throw new AppError(
      400,
      'BRIEF_NOT_READY',
      'Brief needs a description before matching',
    );
  }

  const urgent = input.urgent ?? false;
  const matchingMode: MatchingMode = urgent ? 'partner_direct' : 'open_pool';
  const opensAt = new Date();
  const closesAt = computeInterestClosesAt(opensAt, existing.deadline);

  const updated = await repo.updateBrief(id, {
    status: 'submitted',
    urgent,
    matchingMode,
    interestOpensAt: opensAt.toISOString(),
    interestClosesAt: closesAt.toISOString(),
    fallbackUsed: false,
    rankedAt: null,
  });
  if (!updated) {
    throw new AppError(404, 'BRIEF_NOT_FOUND', 'Brief not found');
  }

  // Partner-direct and DEMO_MODE resolve immediately so the stage path
  // never dead-ends on a waiting screen.
  if (urgent || config.demoMode) {
    await matchingService.resolveBriefMatching(id);
  }

  const fresh = await repo.getBriefById(id);
  if (!fresh) {
    throw new AppError(404, 'BRIEF_NOT_FOUND', 'Brief not found');
  }
  return toResponse(fresh);
}

export async function updateBrief(
  id: string,
  input: UpdateBriefInput,
  actorId: string,
): Promise<BriefResponse> {
  const existing = await repo.getBriefById(id);
  if (!existing) {
    throw new AppError(404, 'BRIEF_NOT_FOUND', 'Brief not found');
  }
  assertOwner(existing, actorId);

  if (existing.status !== 'draft' && input.status === 'submitted') {
    throw new AppError(
      409,
      'BRIEF_NOT_EDITABLE',
      'Only draft briefs can be submitted',
    );
  }
  if (existing.status !== 'draft' && input.draft) {
    throw new AppError(
      409,
      'BRIEF_NOT_EDITABLE',
      'Only draft briefs can be edited',
    );
  }

  const patch: UpdateBriefRow = {};
  if (input.raw_input !== undefined) {
    patch.rawInput = normalizeOptionalText(input.raw_input) ?? null;
  }
  if (input.roadmap_id !== undefined) {
    patch.roadmapId = input.roadmap_id;
  }
  if (input.status !== undefined) {
    patch.status = input.status;
  }
  if (input.draft) {
    const d = input.draft;
    if (d.language !== undefined) patch.language = d.language;
    if (d.title !== undefined) patch.title = normalizeOptionalText(d.title) ?? null;
    if (d.description !== undefined) {
      patch.description = normalizeOptionalText(d.description) ?? null;
    }
    if (d.requirements !== undefined) {
      patch.requirements = normalizeStringList(d.requirements) ?? [];
    }
    if (d.budget_min_mmk !== undefined) patch.budgetMinMmk = d.budget_min_mmk;
    if (d.budget_max_mmk !== undefined) patch.budgetMaxMmk = d.budget_max_mmk;
    if (d.deadline !== undefined) patch.deadline = d.deadline;
    if (d.reference_links !== undefined) {
      patch.referenceLinks = normalizeStringList(d.reference_links) ?? [];
    }
    if (d.ai_confidence !== undefined) patch.aiConfidence = d.ai_confidence;
    if (d.needs_human_review !== undefined) {
      patch.needsHumanReview = d.needs_human_review;
    }
    if (d.category !== undefined) {
      patch.categoryId = (await resolveCategoryId(d.category)) ?? null;
    }
  }

  const updated = await repo.updateBrief(id, patch);
  if (!updated) {
    throw new AppError(404, 'BRIEF_NOT_FOUND', 'Brief not found');
  }
  return toResponse(updated);
}
