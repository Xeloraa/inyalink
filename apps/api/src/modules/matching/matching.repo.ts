import { getSql } from '../../db/client.js';
import type { AiCallLog } from '../../ai/telemetry.js';
import type { MatchingMode, TextLanguage } from '@inyalink/shared';
import type { ScoreBreakdown } from './matching.score.js';

export async function insertAiCall(row: AiCallLog): Promise<void> {
  const sql = getSql();
  await sql`
    insert into ai_calls (
      feature, provider, model, brief_id,
      tokens_in, tokens_out, cost_usd, latency_ms,
      succeeded, error_kind
    ) values (
      ${row.feature},
      ${row.provider},
      ${row.model},
      ${row.briefId ?? null},
      ${row.tokensIn ?? null},
      ${row.tokensOut ?? null},
      ${row.costUsd ?? null},
      ${row.latencyMs ?? null},
      ${row.succeeded},
      ${row.errorKind ?? null}
    )
  `;
}

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

function toIso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return null;
}

export type MatchingBriefRow = {
  id: string;
  clientId: string;
  title: string | null;
  description: string | null;
  language: TextLanguage | null;
  categoryId: string | null;
  categorySlug: string | null;
  requirements: string[];
  budgetMinMmk: number | null;
  budgetMaxMmk: number | null;
  deadline: string | null;
  status: string;
  urgent: boolean;
  matchingMode: MatchingMode | null;
  interestOpensAt: string | null;
  interestClosesAt: string | null;
  fallbackUsed: boolean;
  rankedAt: string | null;
};

export async function getBriefForMatching(
  briefId: string,
): Promise<MatchingBriefRow | null> {
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      client_id: string;
      title: string | null;
      description: string | null;
      language: TextLanguage | null;
      category_id: string | null;
      category_slug: string | null;
      requirements: unknown;
      budget_min_mmk: string | number | null;
      budget_max_mmk: string | number | null;
      deadline: unknown;
      status: string;
      urgent: boolean;
      matching_mode: MatchingMode | null;
      interest_opens_at: unknown;
      interest_closes_at: unknown;
      fallback_used: boolean;
      ranked_at: unknown;
    }[]
  >`
    select
      b.id,
      b.client_id,
      b.title,
      b.description,
      b.language,
      b.category_id,
      c.slug as category_slug,
      b.requirements,
      b.budget_min_mmk,
      b.budget_max_mmk,
      b.deadline,
      b.status,
      b.urgent,
      b.matching_mode,
      b.interest_opens_at,
      b.interest_closes_at,
      b.fallback_used,
      b.ranked_at
    from briefs b
    left join categories c on c.id = b.category_id
    where b.id = ${briefId}::uuid
    limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  const deadline =
    row.deadline instanceof Date
      ? row.deadline.toISOString().slice(0, 10)
      : typeof row.deadline === 'string'
        ? row.deadline.slice(0, 10)
        : null;
  return {
    id: row.id,
    clientId: row.client_id,
    title: row.title,
    description: row.description,
    language: row.language,
    categoryId: row.category_id,
    categorySlug: row.category_slug,
    requirements: toRequirements(row.requirements),
    budgetMinMmk: toInt(row.budget_min_mmk),
    budgetMaxMmk: toInt(row.budget_max_mmk),
    deadline,
    status: row.status,
    urgent: row.urgent ?? false,
    matchingMode: row.matching_mode,
    interestOpensAt: toIso(row.interest_opens_at),
    interestClosesAt: toIso(row.interest_closes_at),
    fallbackUsed: row.fallback_used ?? false,
    rankedAt: toIso(row.ranked_at),
  };
}

export type MatchingProRow = {
  userId: string;
  categoryId: string;
  displayName: string;
  avatarUrl: string | null;
  headlineMy: string | null;
  headlineEn: string | null;
  skills: string[];
  minBudgetMmk: number | null;
  typicalTurnaroundDays: number | null;
  acceptingWork: boolean;
  partnerTier: boolean;
  completedCount: number;
  declinedCount: number;
  uniqueClients: number;
  completionRatePct: number | null;
  medianResponseMins: number | null;
};

function mapProRow(row: {
  user_id: string;
  category_id: string;
  display_name: string;
  avatar_url: string | null;
  headline_my: string | null;
  headline_en: string | null;
  skills: string[] | null;
  min_budget_mmk: string | number | null;
  typical_turnaround_days: number | null;
  accepting_work: boolean;
  partner_tier: boolean;
  completed_count: string | number | null;
  declined_count: string | number | null;
  unique_clients: string | number | null;
  completion_rate_pct: string | number | null;
  median_response_mins: string | number | null;
}): MatchingProRow {
  return {
    userId: row.user_id,
    categoryId: row.category_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    headlineMy: row.headline_my,
    headlineEn: row.headline_en,
    skills: row.skills ?? [],
    minBudgetMmk: toInt(row.min_budget_mmk),
    typicalTurnaroundDays: row.typical_turnaround_days,
    acceptingWork: row.accepting_work,
    partnerTier: row.partner_tier ?? false,
    completedCount: toInt(row.completed_count) ?? 0,
    declinedCount: toInt(row.declined_count) ?? 0,
    uniqueClients: toInt(row.unique_clients) ?? 0,
    completionRatePct: toInt(row.completion_rate_pct),
    medianResponseMins:
      row.median_response_mins === null || row.median_response_mins === undefined
        ? null
        : Number(row.median_response_mins),
  };
}

type ProSqlRow = Parameters<typeof mapProRow>[0];

export async function listApprovedProsInCategory(
  categoryId: string,
): Promise<MatchingProRow[]> {
  const sql = getSql();
  const rows = await sql<ProSqlRow[]>`
    select
      p.user_id,
      p.category_id,
      pr.display_name,
      coalesce(u.raw_user_meta_data->>'avatar_url', null) as avatar_url,
      p.headline_my,
      p.headline_en,
      p.skills,
      p.min_budget_mmk,
      p.typical_turnaround_days,
      p.accepting_work,
      p.partner_tier,
      coalesce(rep.completed_count, 0) as completed_count,
      coalesce(rep.declined_count, 0) as declined_count,
      coalesce(rep.unique_clients, 0) as unique_clients,
      rep.completion_rate_pct,
      rep.median_response_mins
    from professionals p
    join profiles pr on pr.id = p.user_id
    left join auth.users u on u.id = p.user_id
    left join professional_reputation rep on rep.professional_id = p.user_id
    where p.category_id = ${categoryId}::uuid
      and p.status = 'approved'
      and p.accepting_work = true
  `;
  return rows.map(mapProRow);
}

export async function listPartnerProsInCategory(
  categoryId: string,
): Promise<MatchingProRow[]> {
  const sql = getSql();
  const rows = await sql<ProSqlRow[]>`
    select
      p.user_id,
      p.category_id,
      pr.display_name,
      coalesce(u.raw_user_meta_data->>'avatar_url', null) as avatar_url,
      p.headline_my,
      p.headline_en,
      p.skills,
      p.min_budget_mmk,
      p.typical_turnaround_days,
      p.accepting_work,
      p.partner_tier,
      coalesce(rep.completed_count, 0) as completed_count,
      coalesce(rep.declined_count, 0) as declined_count,
      coalesce(rep.unique_clients, 0) as unique_clients,
      rep.completion_rate_pct,
      rep.median_response_mins
    from professionals p
    join profiles pr on pr.id = p.user_id
    left join auth.users u on u.id = p.user_id
    left join professional_reputation rep on rep.professional_id = p.user_id
    where p.category_id = ${categoryId}::uuid
      and p.status = 'approved'
      and p.accepting_work = true
      and p.partner_tier = true
  `;
  return rows.map(mapProRow);
}

export async function listProsByIds(
  userIds: string[],
): Promise<MatchingProRow[]> {
  if (userIds.length === 0) return [];
  const sql = getSql();
  const rows = await sql<ProSqlRow[]>`
    select
      p.user_id,
      p.category_id,
      pr.display_name,
      coalesce(u.raw_user_meta_data->>'avatar_url', null) as avatar_url,
      p.headline_my,
      p.headline_en,
      p.skills,
      p.min_budget_mmk,
      p.typical_turnaround_days,
      p.accepting_work,
      p.partner_tier,
      coalesce(rep.completed_count, 0) as completed_count,
      coalesce(rep.declined_count, 0) as declined_count,
      coalesce(rep.unique_clients, 0) as unique_clients,
      rep.completion_rate_pct,
      rep.median_response_mins
    from professionals p
    join profiles pr on pr.id = p.user_id
    left join auth.users u on u.id = p.user_id
    left join professional_reputation rep on rep.professional_id = p.user_id
    where p.user_id in ${sql(userIds)}
      and p.status = 'approved'
  `;
  return rows.map(mapProRow);
}

export async function getApprovedProById(
  userId: string,
): Promise<MatchingProRow | null> {
  const pros = await listProsByIds([userId]);
  return pros[0] ?? null;
}

export async function getProfessionalProfileRow(
  userId: string,
): Promise<{ userId: string; categoryId: string; skills: string[] } | null> {
  const sql = getSql();
  const rows = await sql<
    { user_id: string; category_id: string; skills: string[] | null }[]
  >`
    select user_id, category_id, skills
    from professionals
    where user_id = ${userId}::uuid
      and status = 'approved'
    limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    userId: row.user_id,
    categoryId: row.category_id,
    skills: row.skills ?? [],
  };
}

export type PortfolioThumbRow = {
  id: string;
  professionalId: string;
  caption: string | null;
  externalUrl: string | null;
  storagePath: string | null;
};

export async function listPortfolioThumbs(
  professionalIds: string[],
  limitPerPro = 3,
): Promise<Map<string, PortfolioThumbRow[]>> {
  const map = new Map<string, PortfolioThumbRow[]>();
  if (professionalIds.length === 0) return map;

  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      professional_id: string;
      caption: string | null;
      external_url: string | null;
      storage_path: string | null;
    }[]
  >`
    select id, professional_id, caption, external_url, storage_path, sort
    from portfolio_items
    where professional_id in ${sql(professionalIds)}
    order by professional_id, sort asc, created_at asc
  `;

  for (const row of rows) {
    const list = map.get(row.professional_id) ?? [];
    if (list.length >= limitPerPro) continue;
    list.push({
      id: row.id,
      professionalId: row.professional_id,
      caption: row.caption,
      externalUrl: row.external_url,
      storagePath: row.storage_path,
    });
    map.set(row.professional_id, list);
  }
  return map;
}

export async function listPortfolioCaptions(
  professionalIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (professionalIds.length === 0) return map;
  const sql = getSql();
  const rows = await sql<
    { professional_id: string; caption: string | null }[]
  >`
    select professional_id, caption
    from portfolio_items
    where professional_id in ${sql(professionalIds)}
      and caption is not null
  `;
  for (const row of rows) {
    if (!row.caption) continue;
    const list = map.get(row.professional_id) ?? [];
    list.push(row.caption);
    map.set(row.professional_id, list);
  }
  return map;
}

/** Active = submitted open_pool brief still before interest_closes_at. */
export async function countActiveInterests(
  professionalId: string,
): Promise<number> {
  const sql = getSql();
  const rows = await sql<{ n: string | number }[]>`
    select count(*)::int as n
    from brief_interests i
    join briefs b on b.id = i.brief_id
    where i.professional_id = ${professionalId}::uuid
      and b.status = 'submitted'
      and b.matching_mode = 'open_pool'
      and b.ranked_at is null
      and (b.interest_closes_at is null or b.interest_closes_at > now())
  `;
  return toInt(rows[0]?.n) ?? 0;
}

export async function hasInterest(
  briefId: string,
  professionalId: string,
): Promise<boolean> {
  const sql = getSql();
  const rows = await sql<{ ok: boolean }[]>`
    select true as ok
    from brief_interests
    where brief_id = ${briefId}::uuid
      and professional_id = ${professionalId}::uuid
    limit 1
  `;
  return Boolean(rows[0]);
}

export async function insertInterest(
  briefId: string,
  professionalId: string,
): Promise<void> {
  const sql = getSql();
  await sql`
    insert into brief_interests (brief_id, professional_id)
    values (${briefId}::uuid, ${professionalId}::uuid)
    on conflict do nothing
  `;
}

export async function deleteInterest(
  briefId: string,
  professionalId: string,
): Promise<void> {
  const sql = getSql();
  await sql`
    delete from brief_interests
    where brief_id = ${briefId}::uuid
      and professional_id = ${professionalId}::uuid
  `;
}

export async function countInterests(briefId: string): Promise<number> {
  const sql = getSql();
  const rows = await sql<{ n: string | number }[]>`
    select count(*)::int as n
    from brief_interests
    where brief_id = ${briefId}::uuid
  `;
  return toInt(rows[0]?.n) ?? 0;
}

export async function listInterestedProIds(briefId: string): Promise<string[]> {
  const sql = getSql();
  const rows = await sql<{ professional_id: string }[]>`
    select professional_id
    from brief_interests
    where brief_id = ${briefId}::uuid
  `;
  return rows.map((r) => r.professional_id);
}

/** Pros who already left the top-3 path (declined / cancelled) — do not re-surface. */
export async function listTerminalEngagementProIds(
  briefId: string,
): Promise<string[]> {
  const sql = getSql();
  const rows = await sql<{ professional_id: string }[]>`
    select professional_id
    from engagements
    where brief_id = ${briefId}::uuid
      and status in ('declined', 'cancelled')
  `;
  return rows.map((r) => r.professional_id);
}

export async function seedInterests(
  briefId: string,
  professionalIds: string[],
): Promise<void> {
  if (professionalIds.length === 0) return;
  const sql = getSql();
  for (const id of professionalIds) {
    await sql`
      insert into brief_interests (brief_id, professional_id)
      values (${briefId}::uuid, ${id}::uuid)
      on conflict do nothing
    `;
  }
}

export type FeedBriefRow = {
  briefId: string;
  title: string | null;
  description: string | null;
  categorySlug: string | null;
  language: TextLanguage | null;
  budgetMinMmk: number | null;
  budgetMaxMmk: number | null;
  deadline: string | null;
  interestClosesAt: string | null;
  requirements: string[];
  alreadyInterested: boolean;
};

export async function listOpenFeedForCategory(
  categoryId: string,
  professionalId: string,
): Promise<FeedBriefRow[]> {
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      title: string | null;
      description: string | null;
      category_slug: string | null;
      language: TextLanguage | null;
      budget_min_mmk: string | number | null;
      budget_max_mmk: string | number | null;
      deadline: unknown;
      interest_closes_at: unknown;
      requirements: unknown;
      already_interested: boolean;
    }[]
  >`
    select
      b.id,
      b.title,
      b.description,
      c.slug as category_slug,
      b.language,
      b.budget_min_mmk,
      b.budget_max_mmk,
      b.deadline,
      b.interest_closes_at,
      b.requirements,
      exists(
        select 1 from brief_interests i
        where i.brief_id = b.id and i.professional_id = ${professionalId}::uuid
      ) as already_interested
    from briefs b
    left join categories c on c.id = b.category_id
    where b.category_id = ${categoryId}::uuid
      and b.status = 'submitted'
      and b.matching_mode = 'open_pool'
      and b.ranked_at is null
      and (b.interest_closes_at is null or b.interest_closes_at > now())
    order by b.interest_closes_at asc nulls last, b.created_at desc
  `;

  return rows.map((row) => ({
    briefId: row.id,
    title: row.title,
    description: row.description,
    categorySlug: row.category_slug,
    language: row.language,
    budgetMinMmk: toInt(row.budget_min_mmk),
    budgetMaxMmk: toInt(row.budget_max_mmk),
    deadline:
      row.deadline instanceof Date
        ? row.deadline.toISOString().slice(0, 10)
        : typeof row.deadline === 'string'
          ? row.deadline.slice(0, 10)
          : null,
    interestClosesAt: toIso(row.interest_closes_at),
    requirements: toRequirements(row.requirements),
    alreadyInterested: row.already_interested,
  }));
}

export type SurfacedCandidateRow = {
  professionalId: string;
  rank: number;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  rankReason: string;
  guaranteedResponse: boolean;
  fromInterest: boolean;
  explanation: string | null;
};

export async function listSurfacedCandidates(
  briefId: string,
): Promise<SurfacedCandidateRow[]> {
  const sql = getSql();
  const rows = await sql<
    {
      professional_id: string;
      rank: number;
      score: string | number;
      score_breakdown: ScoreBreakdown;
      rank_reason: string;
      guaranteed_response: boolean;
      from_interest: boolean;
      explanation: string | null;
    }[]
  >`
    select
      professional_id,
      rank,
      score,
      score_breakdown,
      rank_reason,
      guaranteed_response,
      from_interest,
      explanation
    from brief_match_candidates
    where brief_id = ${briefId}::uuid
    order by rank asc
  `;
  return rows.map((row) => ({
    professionalId: row.professional_id,
    rank: Number(row.rank),
    score: Number(row.score),
    scoreBreakdown: row.score_breakdown,
    rankReason: row.rank_reason,
    guaranteedResponse: row.guaranteed_response,
    fromInterest: row.from_interest,
    explanation: row.explanation,
  }));
}

export async function replaceSurfacedCandidates(
  briefId: string,
  rows: Array<{
    professionalId: string;
    rank: number;
    score: number;
    scoreBreakdown: ScoreBreakdown;
    rankReason: string;
    guaranteedResponse: boolean;
    fromInterest: boolean;
  }>,
): Promise<void> {
  const sql = getSql();
  await sql`delete from brief_match_candidates where brief_id = ${briefId}::uuid`;
  for (const row of rows) {
    await sql`
      insert into brief_match_candidates (
        brief_id, professional_id, rank, score, score_breakdown,
        rank_reason, guaranteed_response, from_interest
      ) values (
        ${briefId}::uuid,
        ${row.professionalId}::uuid,
        ${row.rank},
        ${row.score},
        ${sql.json(row.scoreBreakdown)},
        ${row.rankReason},
        ${row.guaranteedResponse},
        ${row.fromInterest}
      )
    `;
  }
}

export async function markBriefRanked(
  briefId: string,
  fallbackUsed: boolean,
): Promise<void> {
  const sql = getSql();
  await sql`
    update briefs set
      ranked_at = now(),
      fallback_used = ${fallbackUsed},
      interest_closes_at = least(coalesce(interest_closes_at, now()), now())
    where id = ${briefId}::uuid
  `;
}

export async function updateCandidateExplanation(
  briefId: string,
  professionalId: string,
  explanation: string | null,
): Promise<void> {
  const sql = getSql();
  await sql`
    update brief_match_candidates
    set explanation = ${explanation}
    where brief_id = ${briefId}::uuid
      and professional_id = ${professionalId}::uuid
  `;
}

export async function adminMatchingMetrics(): Promise<{
  briefsRanked: number;
  briefsWithFallback: number;
  briefsUrgent: number;
  openPoolBriefs: number;
}> {
  const sql = getSql();
  const rows = await sql<
    {
      briefs_ranked: string | number;
      briefs_with_fallback: string | number;
      briefs_urgent: string | number;
      open_pool_briefs: string | number;
    }[]
  >`
    select
      (select count(*)::int from briefs where ranked_at is not null) as briefs_ranked,
      (select count(*)::int from briefs where ranked_at is not null and fallback_used = true) as briefs_with_fallback,
      (select count(*)::int from briefs where matching_mode = 'partner_direct') as briefs_urgent,
      (select count(*)::int from briefs
        where status = 'submitted' and matching_mode = 'open_pool' and ranked_at is null
      ) as open_pool_briefs
  `;
  const row = rows[0];
  return {
    briefsRanked: toInt(row?.briefs_ranked) ?? 0,
    briefsWithFallback: toInt(row?.briefs_with_fallback) ?? 0,
    briefsUrgent: toInt(row?.briefs_urgent) ?? 0,
    openPoolBriefs: toInt(row?.open_pool_briefs) ?? 0,
  };
}
