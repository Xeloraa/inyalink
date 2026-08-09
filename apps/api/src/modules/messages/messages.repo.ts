import { getSql } from '../../db/client.js';
import type { EngagementStatus, TextLanguage } from '@inyalink/shared';

function toIso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return null;
}

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

export async function listByEngagement(
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
