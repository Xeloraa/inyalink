import { getSql } from '../../db/client.js';
import type {
  NotificationMeta,
  NotificationType,
} from '@inyalink/shared';

function toIso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return null;
}

function parseMeta(value: unknown): NotificationMeta {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const raw = value as Record<string, unknown>;
  const meta: NotificationMeta = {};
  if (raw.briefTitle === null) meta.briefTitle = null;
  else if (typeof raw.briefTitle === 'string') meta.briefTitle = raw.briefTitle;
  if (raw.professionalName === null) meta.professionalName = null;
  else if (typeof raw.professionalName === 'string') {
    meta.professionalName = raw.professionalName;
  }
  return meta;
}

export type NotificationRow = {
  id: string;
  userId: string;
  type: NotificationType;
  href: string;
  briefId: string | null;
  engagementId: string | null;
  meta: NotificationMeta;
  readAt: string | null;
  createdAt: string;
};

type DbNotification = {
  id: string;
  user_id: string;
  type: NotificationType;
  href: string;
  brief_id: string | null;
  engagement_id: string | null;
  meta: unknown;
  read_at: unknown;
  created_at: unknown;
};

function mapRow(row: DbNotification): NotificationRow {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    href: row.href,
    briefId: row.brief_id,
    engagementId: row.engagement_id,
    meta: parseMeta(row.meta),
    readAt: toIso(row.read_at),
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
  };
}

export async function insertNotification(args: {
  userId: string;
  type: NotificationType;
  href: string;
  briefId?: string | null;
  engagementId?: string | null;
  meta?: NotificationMeta;
}): Promise<NotificationRow> {
  const sql = getSql();
  const meta = args.meta ?? {};
  const rows = await sql<DbNotification[]>`
    insert into notifications (
      user_id, type, href, brief_id, engagement_id, meta
    ) values (
      ${args.userId}::uuid,
      ${args.type}::notification_type,
      ${args.href},
      ${args.briefId ?? null}::uuid,
      ${args.engagementId ?? null}::uuid,
      ${sql.json(meta)}
    )
    returning
      id, user_id, type, href, brief_id, engagement_id, meta, read_at, created_at
  `;
  const row = rows[0];
  if (!row) throw new Error('notification insert returned no row');
  return mapRow(row);
}

export async function insertMany(args: {
  userIds: string[];
  type: NotificationType;
  href: string;
  briefId?: string | null;
  engagementId?: string | null;
  meta?: NotificationMeta;
}): Promise<void> {
  if (args.userIds.length === 0) return;
  const sql = getSql();
  const meta = args.meta ?? {};
  for (const userId of args.userIds) {
    await sql`
      insert into notifications (
        user_id, type, href, brief_id, engagement_id, meta
      ) values (
        ${userId}::uuid,
        ${args.type}::notification_type,
        ${args.href},
        ${args.briefId ?? null}::uuid,
        ${args.engagementId ?? null}::uuid,
        ${sql.json(meta)}
      )
    `;
  }
}

export async function listForUser(
  userId: string,
  limit = 50,
): Promise<NotificationRow[]> {
  const sql = getSql();
  const rows = await sql<DbNotification[]>`
    select
      id, user_id, type, href, brief_id, engagement_id, meta, read_at, created_at
    from notifications
    where user_id = ${userId}::uuid
    order by created_at desc
    limit ${limit}
  `;
  return rows.map(mapRow);
}

export async function countUnread(userId: string): Promise<number> {
  const sql = getSql();
  const rows = await sql<{ n: string | number }[]>`
    select count(*)::int as n
    from notifications
    where user_id = ${userId}::uuid
      and read_at is null
  `;
  const n = rows[0]?.n;
  return typeof n === 'number' ? n : Number(n ?? 0);
}

export async function getOwned(
  id: string,
  userId: string,
): Promise<NotificationRow | null> {
  const sql = getSql();
  const rows = await sql<DbNotification[]>`
    select
      id, user_id, type, href, brief_id, engagement_id, meta, read_at, created_at
    from notifications
    where id = ${id}::uuid
      and user_id = ${userId}::uuid
    limit 1
  `;
  const row = rows[0];
  return row ? mapRow(row) : null;
}

export async function markRead(
  id: string,
  userId: string,
): Promise<NotificationRow | null> {
  const sql = getSql();
  const rows = await sql<DbNotification[]>`
    update notifications
    set read_at = coalesce(read_at, now())
    where id = ${id}::uuid
      and user_id = ${userId}::uuid
    returning
      id, user_id, type, href, brief_id, engagement_id, meta, read_at, created_at
  `;
  const row = rows[0];
  return row ? mapRow(row) : null;
}

export async function getBriefTitle(briefId: string): Promise<string | null> {
  const sql = getSql();
  const rows = await sql<{ title: string | null }[]>`
    select title from briefs where id = ${briefId}::uuid limit 1
  `;
  return rows[0]?.title ?? null;
}

export async function getBriefClient(
  briefId: string,
): Promise<{ clientId: string; title: string | null } | null> {
  const sql = getSql();
  const rows = await sql<{ client_id: string; title: string | null }[]>`
    select client_id, title
    from briefs
    where id = ${briefId}::uuid
    limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  return { clientId: row.client_id, title: row.title };
}

export async function getProfessionalDisplayName(
  professionalId: string,
): Promise<string | null> {
  const sql = getSql();
  const rows = await sql<{ display_name: string | null }[]>`
    select display_name
    from profiles
    where id = ${professionalId}::uuid
    limit 1
  `;
  return rows[0]?.display_name ?? null;
}
