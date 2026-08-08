import { getSql } from '../../db/client.js';
import type {
  BriefStatus,
  CategorySlug,
  EngagementStatus,
  WorkLinkPlatform,
} from '@inyalink/shared';

function toInt(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value !== '') return Number(value);
  return 0;
}

function toFloat(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value !== '') return Number(value);
  return 0;
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

function toIsoOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return toIso(value);
}

export async function insertAuditLog(args: {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  const sql = getSql();
  const metadata = args.metadata ?? {};
  await sql`
    insert into audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (
      ${args.actorId}::uuid,
      ${args.action},
      ${args.entityType},
      ${args.entityId},
      ${sql.json(metadata)}
    )
  `;
}

export async function countPendingProfessionals(): Promise<number> {
  const sql = getSql();
  const rows = await sql<{ n: string | number }[]>`
    select count(*)::int as n from professionals where status = 'pending'
  `;
  return toInt(rows[0]?.n);
}

export async function countOpenBriefs(): Promise<number> {
  const sql = getSql();
  const rows = await sql<{ n: string | number }[]>`
    select count(*)::int as n
    from briefs
    where status in ('submitted', 'matched')
  `;
  return toInt(rows[0]?.n);
}

export async function countActiveEngagements(): Promise<number> {
  const sql = getSql();
  const rows = await sql<{ n: string | number }[]>`
    select count(*)::int as n
    from engagements
    where status in ('proposed', 'accepted', 'in_progress', 'delivered', 'disputed')
  `;
  return toInt(rows[0]?.n);
}

export async function sumAiCostThisWeek(): Promise<number> {
  const sql = getSql();
  const rows = await sql<{ total: string | number | null }[]>`
    select coalesce(sum(cost_usd), 0) as total
    from ai_calls
    where created_at >= date_trunc('week', now())
  `;
  return toFloat(rows[0]?.total);
}

export async function fallbackStats(): Promise<{
  briefsRanked: number;
  briefsWithFallback: number;
}> {
  const sql = getSql();
  const rows = await sql<
    {
      briefs_ranked: string | number;
      briefs_with_fallback: string | number;
    }[]
  >`
    select
      (select count(*)::int from briefs where ranked_at is not null) as briefs_ranked,
      (select count(*)::int
       from briefs
       where ranked_at is not null and fallback_used = true) as briefs_with_fallback
  `;
  return {
    briefsRanked: toInt(rows[0]?.briefs_ranked),
    briefsWithFallback: toInt(rows[0]?.briefs_with_fallback),
  };
}

export type PendingProRow = {
  userId: string;
  displayName: string;
  categorySlug: CategorySlug;
  categoryNameEn: string;
  categoryNameMy: string;
  categoryOtherText: string | null;
  skills: string[];
  bioMy: string | null;
  bioEn: string | null;
  headlineMy: string | null;
  headlineEn: string | null;
  cvUrl: string | null;
  reviewNote: string | null;
  createdAt: string;
};

export async function listPendingProfessionals(): Promise<PendingProRow[]> {
  const sql = getSql();
  const rows = await sql<
    {
      user_id: string;
      display_name: string;
      category_slug: CategorySlug;
      category_name_en: string;
      category_name_my: string;
      category_other_text: string | null;
      skills: string[];
      bio_my: string | null;
      bio_en: string | null;
      headline_my: string | null;
      headline_en: string | null;
      cv_url: string | null;
      review_note: string | null;
      created_at: unknown;
    }[]
  >`
    select
      p.user_id,
      pr.display_name,
      c.slug as category_slug,
      c.name_en as category_name_en,
      c.name_my as category_name_my,
      p.category_other_text,
      p.skills,
      p.bio_my,
      p.bio_en,
      p.headline_my,
      p.headline_en,
      p.cv_url,
      p.review_note,
      p.created_at
    from professionals p
    join profiles pr on pr.id = p.user_id
    join categories c on c.id = p.category_id
    where p.status = 'pending'
    order by p.created_at asc
  `;
  return rows.map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    categorySlug: row.category_slug,
    categoryNameEn: row.category_name_en,
    categoryNameMy: row.category_name_my,
    categoryOtherText: row.category_other_text,
    skills: row.skills ?? [],
    bioMy: row.bio_my,
    bioEn: row.bio_en,
    headlineMy: row.headline_my,
    headlineEn: row.headline_en,
    cvUrl: row.cv_url,
    reviewNote: row.review_note,
    createdAt: toIso(row.created_at),
  }));
}

export type PortfolioRow = {
  id: string;
  caption: string | null;
  externalUrl: string | null;
  storagePath: string | null;
  sort: number;
};

export async function listPortfolioForPros(
  professionalIds: string[],
): Promise<Map<string, PortfolioRow[]>> {
  const map = new Map<string, PortfolioRow[]>();
  if (professionalIds.length === 0) return map;
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      professional_id: string;
      caption: string | null;
      external_url: string | null;
      storage_path: string | null;
      sort: number;
    }[]
  >`
    select id, professional_id, caption, external_url, storage_path, sort
    from portfolio_items
    where professional_id = any(${professionalIds}::uuid[])
    order by professional_id, sort, created_at
  `;
  for (const row of rows) {
    const list = map.get(row.professional_id) ?? [];
    list.push({
      id: row.id,
      caption: row.caption,
      externalUrl: row.external_url,
      storagePath: row.storage_path,
      sort: row.sort,
    });
    map.set(row.professional_id, list);
  }
  return map;
}

export type WorkLinkRow = {
  id: string;
  platform: WorkLinkPlatform;
  url: string;
  label: string | null;
  sort: number;
  verifiedAt: string;
};

export async function listWorkLinksForPros(
  professionalIds: string[],
): Promise<Map<string, WorkLinkRow[]>> {
  const map = new Map<string, WorkLinkRow[]>();
  if (professionalIds.length === 0) return map;
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      professional_id: string;
      platform: WorkLinkPlatform;
      url: string;
      label: string | null;
      sort: number;
      verified_at: unknown;
    }[]
  >`
    select id, professional_id, platform, url, label, sort, verified_at
    from work_links
    where professional_id = any(${professionalIds}::uuid[])
    order by professional_id, sort, created_at
  `;
  for (const row of rows) {
    const list = map.get(row.professional_id) ?? [];
    list.push({
      id: row.id,
      platform: row.platform,
      url: row.url,
      label: row.label,
      sort: row.sort,
      verifiedAt: toIso(row.verified_at),
    });
    map.set(row.professional_id, list);
  }
  return map;
}

export async function getProfessionalStatus(
  userId: string,
): Promise<'pending' | 'approved' | 'rejected' | 'paused' | null> {
  const sql = getSql();
  const rows = await sql<{ status: 'pending' | 'approved' | 'rejected' | 'paused' }[]>`
    select status from professionals where user_id = ${userId}::uuid limit 1
  `;
  return rows[0]?.status ?? null;
}

export async function reviewProfessional(args: {
  userId: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewNote: string | null;
  reviewedBy: string;
}): Promise<{
  userId: string;
  status: 'pending' | 'approved' | 'rejected' | 'paused';
  reviewNote: string | null;
}> {
  const sql = getSql();
  const rows = await sql<
    {
      user_id: string;
      status: 'pending' | 'approved' | 'rejected' | 'paused';
      review_note: string | null;
    }[]
  >`
    update professionals
    set
      status = ${args.status}::pro_status,
      review_note = ${args.reviewNote},
      reviewed_by = ${args.reviewedBy}::uuid,
      reviewed_at = now(),
      updated_at = now()
    where user_id = ${args.userId}::uuid
    returning user_id, status, review_note
  `;
  const row = rows[0];
  if (!row) throw new Error('reviewProfessional returned no row');
  return {
    userId: row.user_id,
    status: row.status,
    reviewNote: row.review_note,
  };
}

export type BriefListRow = {
  id: string;
  status: BriefStatus;
  title: string | null;
  categorySlug: string | null;
  clientId: string;
  clientDisplayName: string;
  interestCount: number;
  fallbackUsed: boolean;
  createdAt: string;
  rankedAt: string | null;
};

export async function listBriefs(
  status?: BriefStatus,
): Promise<BriefListRow[]> {
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      status: BriefStatus;
      title: string | null;
      category_slug: string | null;
      client_id: string;
      client_display_name: string;
      interest_count: string | number;
      fallback_used: boolean;
      created_at: unknown;
      ranked_at: unknown;
    }[]
  >`
    select
      b.id,
      b.status,
      b.title,
      c.slug as category_slug,
      b.client_id,
      pr.display_name as client_display_name,
      (
        select count(*)::int from brief_interests bi where bi.brief_id = b.id
      ) as interest_count,
      b.fallback_used,
      b.created_at,
      b.ranked_at
    from briefs b
    join profiles pr on pr.id = b.client_id
    left join categories c on c.id = b.category_id
    where (${status ?? null}::brief_status is null or b.status = ${status ?? null}::brief_status)
    order by b.created_at desc
    limit 500
  `;
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    title: row.title,
    categorySlug: row.category_slug,
    clientId: row.client_id,
    clientDisplayName: row.client_display_name,
    interestCount: toInt(row.interest_count),
    fallbackUsed: row.fallback_used,
    createdAt: toIso(row.created_at),
    rankedAt: toIsoOrNull(row.ranked_at),
  }));
}

export type SurfacedRow = {
  briefId: string;
  professionalId: string;
  displayName: string;
  rank: number;
  score: number;
  fromInterest: boolean;
  guaranteedResponse: boolean;
};

export async function listSurfacedForBriefs(
  briefIds: string[],
): Promise<Map<string, SurfacedRow[]>> {
  const map = new Map<string, SurfacedRow[]>();
  if (briefIds.length === 0) return map;
  const sql = getSql();
  const rows = await sql<
    {
      brief_id: string;
      professional_id: string;
      display_name: string;
      rank: number;
      score: string | number;
      from_interest: boolean;
      guaranteed_response: boolean;
    }[]
  >`
    select
      m.brief_id,
      m.professional_id,
      pr.display_name,
      m.rank,
      m.score,
      m.from_interest,
      m.guaranteed_response
    from brief_match_candidates m
    join profiles pr on pr.id = m.professional_id
    where m.brief_id = any(${briefIds}::uuid[])
    order by m.brief_id, m.rank
  `;
  for (const row of rows) {
    const list = map.get(row.brief_id) ?? [];
    list.push({
      briefId: row.brief_id,
      professionalId: row.professional_id,
      displayName: row.display_name,
      rank: row.rank,
      score: toFloat(row.score),
      fromInterest: row.from_interest,
      guaranteedResponse: row.guaranteed_response,
    });
    map.set(row.brief_id, list);
  }
  return map;
}

export async function getBriefForAssign(
  briefId: string,
): Promise<{ id: string; status: BriefStatus; clientId: string } | null> {
  const sql = getSql();
  const rows = await sql<
    { id: string; status: BriefStatus; client_id: string }[]
  >`
    select id, status, client_id from briefs where id = ${briefId}::uuid limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  return { id: row.id, status: row.status, clientId: row.client_id };
}

export async function isApprovedProfessional(
  professionalId: string,
): Promise<boolean> {
  const sql = getSql();
  const rows = await sql<{ ok: boolean }[]>`
    select exists(
      select 1 from professionals
      where user_id = ${professionalId}::uuid and status = 'approved'
    ) as ok
  `;
  return Boolean(rows[0]?.ok);
}

export async function findEngagement(
  briefId: string,
  professionalId: string,
): Promise<{ id: string; status: EngagementStatus } | null> {
  const sql = getSql();
  const rows = await sql<{ id: string; status: EngagementStatus }[]>`
    select id, status from engagements
    where brief_id = ${briefId}::uuid
      and professional_id = ${professionalId}::uuid
    limit 1
  `;
  return rows[0] ?? null;
}

export async function insertAdminAssignment(args: {
  briefId: string;
  professionalId: string;
  matchReason: string;
  matchedBy: string;
  respondBy: Date;
}): Promise<{ id: string; status: EngagementStatus }> {
  const sql = getSql();
  const rows = await sql<{ id: string; status: EngagementStatus }[]>`
    insert into engagements (
      brief_id, professional_id, status, match_reason, matched_by, respond_by
    ) values (
      ${args.briefId}::uuid,
      ${args.professionalId}::uuid,
      'proposed'::engagement_status,
      ${args.matchReason},
      ${args.matchedBy}::uuid,
      ${args.respondBy.toISOString()}::timestamptz
    )
    returning id, status
  `;
  const row = rows[0];
  if (!row) throw new Error('insertAdminAssignment returned no row');
  return row;
}

export async function markBriefMatched(briefId: string): Promise<void> {
  const sql = getSql();
  await sql`
    update briefs
    set status = 'matched'::brief_status, updated_at = now()
    where id = ${briefId}::uuid
      and status in ('submitted', 'matched')
  `;
}

export type EngagementListRow = {
  id: string;
  briefId: string;
  briefTitle: string | null;
  professionalId: string;
  professionalDisplayName: string;
  clientId: string;
  clientDisplayName: string;
  status: EngagementStatus;
  proposedAt: string;
  respondBy: string | null;
  updatedAt: string;
  acceptedAt: string | null;
};

export async function listEngagements(
  status?: EngagementStatus,
): Promise<EngagementListRow[]> {
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      brief_id: string;
      brief_title: string | null;
      professional_id: string;
      professional_display_name: string;
      client_id: string;
      client_display_name: string;
      status: EngagementStatus;
      proposed_at: unknown;
      respond_by: unknown;
      updated_at: unknown;
      accepted_at: unknown;
    }[]
  >`
    select
      e.id,
      e.brief_id,
      b.title as brief_title,
      e.professional_id,
      pp.display_name as professional_display_name,
      b.client_id,
      cp.display_name as client_display_name,
      e.status,
      e.proposed_at,
      e.respond_by,
      e.updated_at,
      e.accepted_at
    from engagements e
    join briefs b on b.id = e.brief_id
    join profiles pp on pp.id = e.professional_id
    join profiles cp on cp.id = b.client_id
    where (${status ?? null}::engagement_status is null
      or e.status = ${status ?? null}::engagement_status)
    order by e.updated_at desc
    limit 500
  `;
  return rows.map((row) => ({
    id: row.id,
    briefId: row.brief_id,
    briefTitle: row.brief_title,
    professionalId: row.professional_id,
    professionalDisplayName: row.professional_display_name,
    clientId: row.client_id,
    clientDisplayName: row.client_display_name,
    status: row.status,
    proposedAt: toIso(row.proposed_at),
    respondBy: toIsoOrNull(row.respond_by),
    updatedAt: toIso(row.updated_at),
    acceptedAt: toIsoOrNull(row.accepted_at),
  }));
}

export async function getEngagementById(
  id: string,
): Promise<{ id: string; status: EngagementStatus } | null> {
  const sql = getSql();
  const rows = await sql<{ id: string; status: EngagementStatus }[]>`
    select id, status from engagements where id = ${id}::uuid limit 1
  `;
  return rows[0] ?? null;
}

export async function patchEngagementStatus(args: {
  id: string;
  status: EngagementStatus;
}): Promise<{ id: string; status: EngagementStatus }> {
  const sql = getSql();
  const rows = await sql<{ id: string; status: EngagementStatus }[]>`
    update engagements
    set
      status = ${args.status}::engagement_status,
      updated_at = now(),
      accepted_at = case
        when ${args.status}::text = 'accepted' and accepted_at is null then now()
        else accepted_at
      end,
      delivered_at = case
        when ${args.status}::text = 'delivered' and delivered_at is null then now()
        else delivered_at
      end,
      confirmed_at = case
        when ${args.status}::text = 'confirmed' and confirmed_at is null then now()
        else confirmed_at
      end
    where id = ${args.id}::uuid
    returning id, status
  `;
  const row = rows[0];
  if (!row) throw new Error('patchEngagementStatus returned no row');
  return row;
}

export async function opsMetricsCounts(): Promise<{
  briefsCreated: number;
  briefsMatched: number;
  engagementsStarted: number;
  engagementsConfirmed: number;
  clientsWithConfirmed: number;
  clientsWithRepeatConfirmed: number;
}> {
  const sql = getSql();
  const rows = await sql<
    {
      briefs_created: string | number;
      briefs_matched: string | number;
      engagements_started: string | number;
      engagements_confirmed: string | number;
      clients_with_confirmed: string | number;
      clients_with_repeat: string | number;
    }[]
  >`
    select
      (select count(*)::int from briefs) as briefs_created,
      (select count(*)::int from briefs where status = 'matched') as briefs_matched,
      (select count(*)::int from engagements
        where status in ('accepted','in_progress','delivered','confirmed','disputed')
      ) as engagements_started,
      (select count(*)::int from engagements where status = 'confirmed') as engagements_confirmed,
      (select count(*)::int from (
        select b.client_id
        from engagements e
        join briefs b on b.id = e.brief_id
        where e.status = 'confirmed'
        group by b.client_id
      ) t) as clients_with_confirmed,
      (select count(*)::int from (
        select b.client_id
        from engagements e
        join briefs b on b.id = e.brief_id
        where e.status = 'confirmed'
        group by b.client_id
        having count(*) >= 2
      ) t) as clients_with_repeat
  `;
  const row = rows[0];
  return {
    briefsCreated: toInt(row?.briefs_created),
    briefsMatched: toInt(row?.briefs_matched),
    engagementsStarted: toInt(row?.engagements_started),
    engagementsConfirmed: toInt(row?.engagements_confirmed),
    clientsWithConfirmed: toInt(row?.clients_with_confirmed),
    clientsWithRepeatConfirmed: toInt(row?.clients_with_repeat),
  };
}
