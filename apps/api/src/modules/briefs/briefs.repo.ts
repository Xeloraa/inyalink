import { getSql } from '../../db/client.js';
import type {
  BriefSource,
  BriefStatus,
  MatchingMode,
  TextLanguage,
} from '@inyalink/shared';
import {
  BriefSourceSchema,
  BriefStatusSchema,
  MatchingModeSchema,
  TextLanguageSchema,
} from '@inyalink/shared';

function toInt(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value !== '') return Number(value);
  return null;
}

function toRequirements(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

function toDateOnly(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  return null;
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return new Date(0).toISOString();
}

export type BriefRow = {
  id: string;
  clientId: string;
  status: BriefStatus;
  source: BriefSource;
  rawInput: string | null;
  language: TextLanguage | null;
  categoryId: string | null;
  categorySlug: string | null;
  title: string | null;
  description: string | null;
  requirements: string[];
  budgetMinMmk: number | null;
  budgetMaxMmk: number | null;
  deadline: string | null;
  referenceLinks: string[];
  aiConfidence: number | null;
  needsHumanReview: boolean;
  roadmapId: string | null;
  urgent: boolean;
  interestOpensAt: string | null;
  interestClosesAt: string | null;
  matchingMode: MatchingMode | null;
  fallbackUsed: boolean;
  rankedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type SqlBrief = {
  id: string;
  client_id: string;
  status: string;
  source: string;
  raw_input: string | null;
  language: string | null;
  category_id: string | null;
  category_slug: string | null;
  title: string | null;
  description: string | null;
  requirements: unknown;
  budget_min_mmk: string | number | null;
  budget_max_mmk: string | number | null;
  deadline: unknown;
  reference_links: string[] | null;
  ai_confidence: string | number | null;
  needs_human_review: boolean;
  roadmap_id: string | null;
  urgent: boolean;
  interest_opens_at: unknown;
  interest_closes_at: unknown;
  matching_mode: string | null;
  fallback_used: boolean;
  ranked_at: unknown;
  created_at: unknown;
  updated_at: unknown;
};

function mapIsoOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return toIso(value);
}

function mapRow(row: SqlBrief): BriefRow {
  return {
    id: row.id,
    clientId: row.client_id,
    status: BriefStatusSchema.parse(row.status),
    source: BriefSourceSchema.parse(row.source),
    rawInput: row.raw_input,
    language: row.language
      ? TextLanguageSchema.parse(row.language)
      : null,
    categoryId: row.category_id,
    categorySlug: row.category_slug,
    title: row.title,
    description: row.description,
    requirements: toRequirements(row.requirements),
    budgetMinMmk: toInt(row.budget_min_mmk),
    budgetMaxMmk: toInt(row.budget_max_mmk),
    deadline: toDateOnly(row.deadline),
    referenceLinks: toStringArray(row.reference_links),
    aiConfidence:
      row.ai_confidence === null || row.ai_confidence === undefined
        ? null
        : Number(row.ai_confidence),
    needsHumanReview: row.needs_human_review,
    roadmapId: row.roadmap_id,
    urgent: row.urgent ?? false,
    interestOpensAt: mapIsoOrNull(row.interest_opens_at),
    interestClosesAt: mapIsoOrNull(row.interest_closes_at),
    matchingMode: row.matching_mode
      ? MatchingModeSchema.parse(row.matching_mode)
      : null,
    fallbackUsed: row.fallback_used ?? false,
    rankedAt: mapIsoOrNull(row.ranked_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export async function findCategoryIdBySlug(
  slug: string,
): Promise<string | null> {
  const sql = getSql();
  const rows = await sql<{ id: string }[]>`
    select id from categories
    where slug = ${slug} and is_active = true
    limit 1
  `;
  return rows[0]?.id ?? null;
}

export type InsertBriefRow = {
  clientId: string;
  source: BriefSource;
  rawInput: string | null;
  language: TextLanguage | null;
  categoryId: string | null;
  title: string | null;
  description: string | null;
  requirements: string[];
  budgetMinMmk: number | null;
  budgetMaxMmk: number | null;
  deadline: string | null;
  referenceLinks: string[];
  aiConfidence: number | null;
  needsHumanReview: boolean;
  roadmapId: string | null;
};

export async function insertBrief(row: InsertBriefRow): Promise<BriefRow> {
  const sql = getSql();
  const inserted = await sql<{ id: string }[]>`
    insert into briefs (
      client_id, status, source, raw_input, language, category_id,
      title, description, requirements,
      budget_min_mmk, budget_max_mmk, deadline, reference_links,
      ai_confidence, needs_human_review, roadmap_id
    ) values (
      ${row.clientId}::uuid,
      'draft'::brief_status,
      ${row.source}::brief_source,
      ${row.rawInput},
      ${row.language}::text_language,
      ${row.categoryId}::uuid,
      ${row.title},
      ${row.description},
      ${sql.json(row.requirements)},
      ${row.budgetMinMmk},
      ${row.budgetMaxMmk},
      ${row.deadline},
      ${row.referenceLinks},
      ${row.aiConfidence},
      ${row.needsHumanReview},
      ${row.roadmapId}::uuid
    )
    returning id
  `;
  const id = inserted[0]?.id;
  if (!id) {
    throw new Error('insertBrief returned no id');
  }
  const brief = await getBriefById(id);
  if (!brief) {
    throw new Error('insertBrief could not reload row');
  }
  return brief;
}

export async function getBriefById(id: string): Promise<BriefRow | null> {
  const sql = getSql();
  const rows = await sql<SqlBrief[]>`
    select
      b.id,
      b.client_id,
      b.status,
      b.source,
      b.raw_input,
      b.language,
      b.category_id,
      c.slug as category_slug,
      b.title,
      b.description,
      b.requirements,
      b.budget_min_mmk,
      b.budget_max_mmk,
      b.deadline,
      b.reference_links,
      b.ai_confidence,
      b.needs_human_review,
      b.roadmap_id,
      b.urgent,
      b.interest_opens_at,
      b.interest_closes_at,
      b.matching_mode,
      b.fallback_used,
      b.ranked_at,
      b.created_at,
      b.updated_at
    from briefs b
    left join categories c on c.id = b.category_id
    where b.id = ${id}::uuid
    limit 1
  `;
  const row = rows[0];
  return row ? mapRow(row) : null;
}

export type UpdateBriefRow = {
  rawInput?: string | null;
  language?: TextLanguage | null;
  categoryId?: string | null;
  title?: string | null;
  description?: string | null;
  requirements?: string[];
  budgetMinMmk?: number | null;
  budgetMaxMmk?: number | null;
  deadline?: string | null;
  referenceLinks?: string[];
  aiConfidence?: number | null;
  needsHumanReview?: boolean;
  roadmapId?: string | null;
  status?: BriefStatus;
  urgent?: boolean;
  interestOpensAt?: string | null;
  interestClosesAt?: string | null;
  matchingMode?: MatchingMode | null;
  fallbackUsed?: boolean;
  rankedAt?: string | null;
};

export async function updateBrief(
  id: string,
  patch: UpdateBriefRow,
): Promise<BriefRow | null> {
  const existing = await getBriefById(id);
  if (!existing) return null;

  const next = {
    rawInput: patch.rawInput !== undefined ? patch.rawInput : existing.rawInput,
    language: patch.language !== undefined ? patch.language : existing.language,
    categoryId:
      patch.categoryId !== undefined ? patch.categoryId : existing.categoryId,
    title: patch.title !== undefined ? patch.title : existing.title,
    description:
      patch.description !== undefined ? patch.description : existing.description,
    requirements:
      patch.requirements !== undefined
        ? patch.requirements
        : existing.requirements,
    budgetMinMmk:
      patch.budgetMinMmk !== undefined
        ? patch.budgetMinMmk
        : existing.budgetMinMmk,
    budgetMaxMmk:
      patch.budgetMaxMmk !== undefined
        ? patch.budgetMaxMmk
        : existing.budgetMaxMmk,
    deadline: patch.deadline !== undefined ? patch.deadline : existing.deadline,
    referenceLinks:
      patch.referenceLinks !== undefined
        ? patch.referenceLinks
        : existing.referenceLinks,
    aiConfidence:
      patch.aiConfidence !== undefined
        ? patch.aiConfidence
        : existing.aiConfidence,
    needsHumanReview:
      patch.needsHumanReview !== undefined
        ? patch.needsHumanReview
        : existing.needsHumanReview,
    roadmapId:
      patch.roadmapId !== undefined ? patch.roadmapId : existing.roadmapId,
    status: patch.status ?? existing.status,
    urgent: patch.urgent !== undefined ? patch.urgent : existing.urgent,
    interestOpensAt:
      patch.interestOpensAt !== undefined
        ? patch.interestOpensAt
        : existing.interestOpensAt,
    interestClosesAt:
      patch.interestClosesAt !== undefined
        ? patch.interestClosesAt
        : existing.interestClosesAt,
    matchingMode:
      patch.matchingMode !== undefined
        ? patch.matchingMode
        : existing.matchingMode,
    fallbackUsed:
      patch.fallbackUsed !== undefined
        ? patch.fallbackUsed
        : existing.fallbackUsed,
    rankedAt: patch.rankedAt !== undefined ? patch.rankedAt : existing.rankedAt,
  };

  const sql = getSql();
  await sql`
    update briefs set
      raw_input = ${next.rawInput},
      language = ${next.language}::text_language,
      category_id = ${next.categoryId}::uuid,
      title = ${next.title},
      description = ${next.description},
      requirements = ${sql.json(next.requirements)},
      budget_min_mmk = ${next.budgetMinMmk},
      budget_max_mmk = ${next.budgetMaxMmk},
      deadline = ${next.deadline},
      reference_links = ${next.referenceLinks},
      ai_confidence = ${next.aiConfidence},
      needs_human_review = ${next.needsHumanReview},
      roadmap_id = ${next.roadmapId}::uuid,
      status = ${next.status}::brief_status,
      urgent = ${next.urgent},
      interest_opens_at = ${next.interestOpensAt},
      interest_closes_at = ${next.interestClosesAt},
      matching_mode = ${next.matchingMode},
      fallback_used = ${next.fallbackUsed},
      ranked_at = ${next.rankedAt}
    where id = ${id}::uuid
  `;

  return getBriefById(id);
}
