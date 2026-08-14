import { getSql } from '../../db/client.js';
import type { EngagementStatus, TextLanguage } from '@inyalink/shared';

const LIVE_STATUSES = [
  'proposed',
  'accepted',
  'in_progress',
  'delivered',
  'confirmed',
  'disputed',
] as const;

function toInt(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value !== '') return Number(value);
  return null;
}

function toIso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return null;
}

export type EngagementRow = {
  id: string;
  briefId: string;
  professionalId: string;
  status: EngagementStatus;
  matchReason: string | null;
  declineReason: string | null;
  proposedAt: string;
  respondBy: string | null;
  acceptedAt: string | null;
};

export type InboxRow = EngagementRow & {
  briefTitle: string | null;
  briefDescription: string | null;
  briefLanguage: TextLanguage | null;
  budgetMinMmk: number | null;
  budgetMaxMmk: number | null;
  deadline: string | null;
  categorySlug: string | null;
};

function mapEngagement(row: {
  id: string;
  brief_id: string;
  professional_id: string;
  status: EngagementStatus;
  match_reason: string | null;
  decline_reason: string | null;
  proposed_at: unknown;
  respond_by: unknown;
  accepted_at: unknown;
}): EngagementRow {
  return {
    id: row.id,
    briefId: row.brief_id,
    professionalId: row.professional_id,
    status: row.status,
    matchReason: row.match_reason,
    declineReason: row.decline_reason,
    proposedAt: toIso(row.proposed_at) ?? new Date().toISOString(),
    respondBy: toIso(row.respond_by),
    acceptedAt: toIso(row.accepted_at),
  };
}

export async function isSurfacedCandidate(
  briefId: string,
  professionalId: string,
): Promise<boolean> {
  const sql = getSql();
  const rows = await sql<{ ok: boolean }[]>`
    select exists(
      select 1 from brief_match_candidates
      where brief_id = ${briefId}::uuid
        and professional_id = ${professionalId}::uuid
    ) as ok
  `;
  return Boolean(rows[0]?.ok);
}

export async function getBriefOwner(
  briefId: string,
): Promise<{ clientId: string; status: string } | null> {
  const sql = getSql();
  const rows = await sql<{ client_id: string; status: string }[]>`
    select client_id, status
    from briefs
    where id = ${briefId}::uuid
    limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  return { clientId: row.client_id, status: row.status };
}

export async function insertProposed(args: {
  briefId: string;
  professionalId: string;
  matchReason: string | null;
  respondBy: Date;
}): Promise<EngagementRow> {
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      brief_id: string;
      professional_id: string;
      status: EngagementStatus;
      match_reason: string | null;
      decline_reason: string | null;
      proposed_at: unknown;
      respond_by: unknown;
      accepted_at: unknown;
    }[]
  >`
    insert into engagements (
      brief_id, professional_id, status, match_reason, respond_by
    ) values (
      ${args.briefId}::uuid,
      ${args.professionalId}::uuid,
      'proposed'::engagement_status,
      ${args.matchReason},
      ${args.respondBy.toISOString()}::timestamptz
    )
    returning
      id, brief_id, professional_id, status, match_reason, decline_reason,
      proposed_at, respond_by, accepted_at
  `;
  const row = rows[0];
  if (!row) throw new Error('engagement insert returned no row');
  return mapEngagement(row);
}

export async function getById(id: string): Promise<EngagementRow | null> {
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      brief_id: string;
      professional_id: string;
      status: EngagementStatus;
      match_reason: string | null;
      decline_reason: string | null;
      proposed_at: unknown;
      respond_by: unknown;
      accepted_at: unknown;
    }[]
  >`
    select
      id, brief_id, professional_id, status, match_reason, decline_reason,
      proposed_at, respond_by, accepted_at
    from engagements
    where id = ${id}::uuid
    limit 1
  `;
  const row = rows[0];
  return row ? mapEngagement(row) : null;
}

export async function listByBrief(briefId: string): Promise<EngagementRow[]> {
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      brief_id: string;
      professional_id: string;
      status: EngagementStatus;
      match_reason: string | null;
      decline_reason: string | null;
      proposed_at: unknown;
      respond_by: unknown;
      accepted_at: unknown;
    }[]
  >`
    select
      id, brief_id, professional_id, status, match_reason, decline_reason,
      proposed_at, respond_by, accepted_at
    from engagements
    where brief_id = ${briefId}::uuid
    order by proposed_at desc
  `;
  return rows.map(mapEngagement);
}

export async function listProposedInbox(
  professionalId: string,
): Promise<InboxRow[]> {
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      brief_id: string;
      professional_id: string;
      status: EngagementStatus;
      match_reason: string | null;
      decline_reason: string | null;
      proposed_at: unknown;
      respond_by: unknown;
      accepted_at: unknown;
      brief_title: string | null;
      brief_description: string | null;
      brief_language: TextLanguage | null;
      budget_min_mmk: string | number | null;
      budget_max_mmk: string | number | null;
      deadline: unknown;
      category_slug: string | null;
    }[]
  >`
    select
      e.id, e.brief_id, e.professional_id, e.status, e.match_reason,
      e.decline_reason, e.proposed_at, e.respond_by, e.accepted_at,
      b.title as brief_title,
      b.description as brief_description,
      b.language as brief_language,
      b.budget_min_mmk,
      b.budget_max_mmk,
      b.deadline,
      c.slug as category_slug
    from engagements e
    join briefs b on b.id = e.brief_id
    left join categories c on c.id = b.category_id
    where e.professional_id = ${professionalId}::uuid
      and e.status = 'proposed'::engagement_status
    order by e.respond_by asc nulls last, e.proposed_at asc
  `;

  return rows.map((row) => ({
    ...mapEngagement(row),
    briefTitle: row.brief_title,
    briefDescription: row.brief_description,
    briefLanguage: row.brief_language,
    budgetMinMmk: toInt(row.budget_min_mmk),
    budgetMaxMmk: toInt(row.budget_max_mmk),
    deadline:
      row.deadline instanceof Date
        ? row.deadline.toISOString().slice(0, 10)
        : typeof row.deadline === 'string'
          ? row.deadline.slice(0, 10)
          : null,
    categorySlug: row.category_slug,
  }));
}

export async function listExpiredProposed(
  professionalId?: string,
): Promise<EngagementRow[]> {
  const sql = getSql();
  const rows = professionalId
    ? await sql<
        {
          id: string;
          brief_id: string;
          professional_id: string;
          status: EngagementStatus;
          match_reason: string | null;
          decline_reason: string | null;
          proposed_at: unknown;
          respond_by: unknown;
          accepted_at: unknown;
        }[]
      >`
        select
          id, brief_id, professional_id, status, match_reason, decline_reason,
          proposed_at, respond_by, accepted_at
        from engagements
        where status = 'proposed'::engagement_status
          and respond_by is not null
          and respond_by < now()
          and professional_id = ${professionalId}::uuid
      `
    : await sql<
        {
          id: string;
          brief_id: string;
          professional_id: string;
          status: EngagementStatus;
          match_reason: string | null;
          decline_reason: string | null;
          proposed_at: unknown;
          respond_by: unknown;
          accepted_at: unknown;
        }[]
      >`
        select
          id, brief_id, professional_id, status, match_reason, decline_reason,
          proposed_at, respond_by, accepted_at
        from engagements
        where status = 'proposed'::engagement_status
          and respond_by is not null
          and respond_by < now()
      `;
  return rows.map(mapEngagement);
}

export async function markAccepted(id: string): Promise<EngagementRow | null> {
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      brief_id: string;
      professional_id: string;
      status: EngagementStatus;
      match_reason: string | null;
      decline_reason: string | null;
      proposed_at: unknown;
      respond_by: unknown;
      accepted_at: unknown;
    }[]
  >`
    update engagements set
      status = 'accepted'::engagement_status,
      accepted_at = now(),
      updated_at = now()
    where id = ${id}::uuid
      and status = 'proposed'::engagement_status
    returning
      id, brief_id, professional_id, status, match_reason, decline_reason,
      proposed_at, respond_by, accepted_at
  `;
  const row = rows[0];
  return row ? mapEngagement(row) : null;
}

export async function markDeclined(
  id: string,
  reason: string,
): Promise<EngagementRow | null> {
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      brief_id: string;
      professional_id: string;
      status: EngagementStatus;
      match_reason: string | null;
      decline_reason: string | null;
      proposed_at: unknown;
      respond_by: unknown;
      accepted_at: unknown;
    }[]
  >`
    update engagements set
      status = 'declined'::engagement_status,
      decline_reason = ${reason},
      updated_at = now()
    where id = ${id}::uuid
      and status = 'proposed'::engagement_status
    returning
      id, brief_id, professional_id, status, match_reason, decline_reason,
      proposed_at, respond_by, accepted_at
  `;
  const row = rows[0];
  return row ? mapEngagement(row) : null;
}

export async function markBriefMatched(briefId: string): Promise<void> {
  const sql = getSql();
  await sql`
    update briefs set
      status = 'matched'::brief_status,
      updated_at = now()
    where id = ${briefId}::uuid
      and status = 'submitted'::brief_status
  `;
}

export async function getCandidateRankReason(
  briefId: string,
  professionalId: string,
): Promise<string | null> {
  const sql = getSql();
  const rows = await sql<{ rank_reason: string }[]>`
    select rank_reason
    from brief_match_candidates
    where brief_id = ${briefId}::uuid
      and professional_id = ${professionalId}::uuid
    limit 1
  `;
  return rows[0]?.rank_reason ?? null;
}

// -------------------------------------------------------------- messages

export type EngagementAccessRow = {
  id: string;
  status: EngagementStatus;
  professionalId: string;
  clientId: string;
  briefId: string;
  briefTitle: string | null;
  briefDescription: string | null;
  briefLanguage: TextLanguage | null;
};

export type MessageRow = {
  id: string;
  engagementId: string;
  senderId: string;
  body: string;
  createdAt: string;
  expiresAt: string;
};

export type ThreadSummaryRow = {
  engagementId: string;
  status: EngagementStatus;
  briefId: string;
  briefTitle: string | null;
  counterpartName: string | null;
  lastMessageAt: string | null;
};

export async function getEngagementAccess(
  engagementId: string,
): Promise<EngagementAccessRow | null> {
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      status: EngagementStatus;
      professional_id: string;
      client_id: string;
      brief_id: string;
      brief_title: string | null;
      brief_description: string | null;
      brief_language: TextLanguage | null;
    }[]
  >`
    select
      e.id,
      e.status,
      e.professional_id,
      b.client_id,
      b.id as brief_id,
      b.title as brief_title,
      b.description as brief_description,
      b.language as brief_language
    from engagements e
    join briefs b on b.id = e.brief_id
    where e.id = ${engagementId}::uuid
    limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    professionalId: row.professional_id,
    clientId: row.client_id,
    briefId: row.brief_id,
    briefTitle: row.brief_title,
    briefDescription: row.brief_description,
    briefLanguage: row.brief_language,
  };
}

export async function listMessagesByEngagement(
  engagementId: string,
): Promise<MessageRow[]> {
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      engagement_id: string;
      sender_id: string;
      body: string;
      created_at: unknown;
      expires_at: unknown;
    }[]
  >`
    select id, engagement_id, sender_id, body, created_at, expires_at
    from messages
    where engagement_id = ${engagementId}::uuid
      and expires_at > now()
    order by created_at asc
  `;
  return rows.map((row) => ({
    id: row.id,
    engagementId: row.engagement_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
    expiresAt: toIso(row.expires_at) ?? new Date().toISOString(),
  }));
}

export async function insertMessage(args: {
  engagementId: string;
  senderId: string;
  body: string;
}): Promise<MessageRow> {
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      engagement_id: string;
      sender_id: string;
      body: string;
      created_at: unknown;
      expires_at: unknown;
    }[]
  >`
    insert into messages (engagement_id, sender_id, body)
    values (
      ${args.engagementId}::uuid,
      ${args.senderId}::uuid,
      ${args.body}
    )
    returning id, engagement_id, sender_id, body, created_at, expires_at
  `;
  const row = rows[0];
  if (!row) throw new Error('message insert returned no row');
  return {
    id: row.id,
    engagementId: row.engagement_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
    expiresAt: toIso(row.expires_at) ?? new Date().toISOString(),
  };
}

/**
 * Messaging-eligible engagements for a participant (client or professional).
 * Statuses: accepted and later active states (not proposed/declined/cancelled).
 */
export async function listThreadsForUser(
  userId: string,
): Promise<ThreadSummaryRow[]> {
  const sql = getSql();
  const rows = await sql<
    {
      engagement_id: string;
      status: EngagementStatus;
      brief_id: string;
      brief_title: string | null;
      counterpart_name: string | null;
      last_message_at: unknown;
    }[]
  >`
    select
      e.id as engagement_id,
      e.status,
      b.id as brief_id,
      b.title as brief_title,
      case
        when e.professional_id = ${userId}::uuid then
          nullif(trim(cp.display_name), '')
        else
          nullif(trim(pp.display_name), '')
      end as counterpart_name,
      (
        select max(m.created_at)
        from messages m
        where m.engagement_id = e.id
          and m.expires_at > now()
      ) as last_message_at
    from engagements e
    join briefs b on b.id = e.brief_id
    join profiles cp on cp.id = b.client_id
    join profiles pp on pp.id = e.professional_id
    where e.status in (
      'accepted'::engagement_status,
      'in_progress'::engagement_status,
      'delivered'::engagement_status,
      'disputed'::engagement_status
    )
      and (
        e.professional_id = ${userId}::uuid
        or b.client_id = ${userId}::uuid
      )
    order by last_message_at desc nulls last, e.accepted_at desc nulls last
  `;
  return rows.map((row) => ({
    engagementId: row.engagement_id,
    status: row.status,
    briefId: row.brief_id,
    briefTitle: row.brief_title,
    counterpartName: row.counterpart_name,
    lastMessageAt: toIso(row.last_message_at),
  }));
}

// ---------------------------------------------------- direct conversations

/** Approved professionals only — mirrors the Browse listing's own filter. */
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

/**
 * Most recent non-terminal (not declined/cancelled) engagement between this
 * client and professional, across any of the client's briefs — reused so
 * repeated "Message" clicks land on the same thread instead of piling up
 * duplicates.
 */
export async function findLiveEngagement(
  clientId: string,
  professionalId: string,
): Promise<EngagementRow | null> {
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      brief_id: string;
      professional_id: string;
      status: EngagementStatus;
      match_reason: string | null;
      decline_reason: string | null;
      proposed_at: unknown;
      respond_by: unknown;
      accepted_at: unknown;
    }[]
  >`
    select
      e.id, e.brief_id, e.professional_id, e.status, e.match_reason,
      e.decline_reason, e.proposed_at, e.respond_by, e.accepted_at
    from engagements e
    join briefs b on b.id = e.brief_id
    where b.client_id = ${clientId}::uuid
      and e.professional_id = ${professionalId}::uuid
      and e.status = any(${LIVE_STATUSES}::engagement_status[])
    order by e.proposed_at desc
    limit 1
  `;
  const row = rows[0];
  return row ? mapEngagement(row) : null;
}

/**
 * Creates a minimal brief (source 'form', status 'closed' so it never
 * surfaces in matching/open-pool feeds — it exists only to satisfy
 * engagements.brief_id) plus an already-accepted engagement, so messaging
 * is usable immediately with no propose/accept step. One DB round trip via
 * a CTE keeps the pair atomic without a separate transaction call.
 */
export async function insertDirectEngagement(args: {
  clientId: string;
  professionalId: string;
}): Promise<EngagementRow> {
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      brief_id: string;
      professional_id: string;
      status: EngagementStatus;
      match_reason: string | null;
      decline_reason: string | null;
      proposed_at: unknown;
      respond_by: unknown;
      accepted_at: unknown;
    }[]
  >`
    with new_brief as (
      insert into briefs (client_id, status, source)
      values (${args.clientId}::uuid, 'closed'::brief_status, 'form'::brief_source)
      returning id
    )
    insert into engagements (brief_id, professional_id, status, accepted_at)
    select id, ${args.professionalId}::uuid, 'accepted'::engagement_status, now()
    from new_brief
    returning
      id, brief_id, professional_id, status, match_reason, decline_reason,
      proposed_at, respond_by, accepted_at
  `;
  const row = rows[0];
  if (!row) throw new Error('direct engagement insert returned no row');
  return mapEngagement(row);
}
