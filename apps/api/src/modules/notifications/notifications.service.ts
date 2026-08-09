import { normalizeToUnicode } from '@inyalink/burmese';
import {
  NotificationListResponseSchema,
  NotificationSchema,
  NotificationUnreadCountResponseSchema,
  type Notification,
  type NotificationListResponse,
  type NotificationMeta,
  type NotificationType,
  type NotificationUnreadCountResponse,
} from '@inyalink/shared';
import { AppError } from '../../middleware/errors.js';
import * as repo from './notifications.repo.js';

function normalizeMeta(meta: NotificationMeta | undefined): NotificationMeta {
  if (!meta) return {};
  const out: NotificationMeta = {};
  if (meta.briefTitle !== undefined) {
    out.briefTitle =
      meta.briefTitle === null
        ? null
        : normalizeToUnicode(meta.briefTitle.trim()).slice(0, 200) || null;
  }
  if (meta.professionalName !== undefined) {
    out.professionalName =
      meta.professionalName === null
        ? null
        : normalizeToUnicode(meta.professionalName.trim()).slice(0, 120) ||
          null;
  }
  return out;
}

function toNotification(row: repo.NotificationRow): Notification {
  return NotificationSchema.parse({
    id: row.id,
    type: row.type,
    href: row.href,
    briefId: row.briefId,
    engagementId: row.engagementId,
    meta: row.meta,
    readAt: row.readAt,
    createdAt: row.createdAt,
  });
}

/** Deep links for each notification type. */
export function hrefFor(
  type: NotificationType,
  refs: { briefId?: string | null; engagementId?: string | null } = {},
): string {
  switch (type) {
    case 'match_top3':
    case 'engagement_proposed':
      return '/app/briefs';
    case 'engagement_accepted':
    case 'engagement_declined':
      return refs.briefId
        ? `/?briefId=${encodeURIComponent(refs.briefId)}`
        : '/';
    case 'application_approved':
      return '/professionals/me/edit';
    case 'application_rejected':
      return '/professionals/join';
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export async function createNotification(args: {
  userId: string;
  type: NotificationType;
  briefId?: string | null;
  engagementId?: string | null;
  meta?: NotificationMeta;
  href?: string;
}): Promise<Notification> {
  const href =
    args.href ??
    hrefFor(args.type, {
      briefId: args.briefId,
      engagementId: args.engagementId,
    });
  const row = await repo.insertNotification({
    userId: args.userId,
    type: args.type,
    href,
    briefId: args.briefId ?? null,
    engagementId: args.engagementId ?? null,
    meta: normalizeMeta(args.meta),
  });
  return toNotification(row);
}

export async function notifyUsers(args: {
  userIds: string[];
  type: NotificationType;
  briefId?: string | null;
  engagementId?: string | null;
  meta?: NotificationMeta;
  href?: string;
}): Promise<void> {
  const unique = [...new Set(args.userIds.filter(Boolean))];
  if (unique.length === 0) return;
  const href =
    args.href ??
    hrefFor(args.type, {
      briefId: args.briefId,
      engagementId: args.engagementId,
    });
  await repo.insertMany({
    userIds: unique,
    type: args.type,
    href,
    briefId: args.briefId ?? null,
    engagementId: args.engagementId ?? null,
    meta: normalizeMeta(args.meta),
  });
}

/** Notify pros newly surfaced in a top-3 set (skip anyone already notified). */
export async function notifyTop3Match(args: {
  briefId: string;
  professionalIds: string[];
  previousProfessionalIds?: string[];
}): Promise<void> {
  const prev = new Set(args.previousProfessionalIds ?? []);
  const fresh = args.professionalIds.filter((id) => !prev.has(id));
  if (fresh.length === 0) return;
  const title = await repo.getBriefTitle(args.briefId);
  await notifyUsers({
    userIds: fresh,
    type: 'match_top3',
    briefId: args.briefId,
    meta: { briefTitle: title },
  });
}

export async function notifyEngagementProposed(args: {
  professionalId: string;
  briefId: string;
  engagementId: string;
}): Promise<void> {
  const title = await repo.getBriefTitle(args.briefId);
  await createNotification({
    userId: args.professionalId,
    type: 'engagement_proposed',
    briefId: args.briefId,
    engagementId: args.engagementId,
    meta: { briefTitle: title },
  });
}

export async function notifyEngagementAccepted(args: {
  briefId: string;
  engagementId: string;
  professionalId: string;
}): Promise<void> {
  const brief = await repo.getBriefClient(args.briefId);
  if (!brief) return;
  const name = await repo.getProfessionalDisplayName(args.professionalId);
  await createNotification({
    userId: brief.clientId,
    type: 'engagement_accepted',
    briefId: args.briefId,
    engagementId: args.engagementId,
    meta: {
      briefTitle: brief.title,
      professionalName: name,
    },
  });
}

export async function notifyEngagementDeclined(args: {
  briefId: string;
  engagementId: string;
  professionalId: string;
}): Promise<void> {
  const brief = await repo.getBriefClient(args.briefId);
  if (!brief) return;
  const name = await repo.getProfessionalDisplayName(args.professionalId);
  await createNotification({
    userId: brief.clientId,
    type: 'engagement_declined',
    briefId: args.briefId,
    engagementId: args.engagementId,
    meta: {
      briefTitle: brief.title,
      professionalName: name,
    },
  });
}

export async function notifyApplicationReviewed(args: {
  professionalId: string;
  approved: boolean;
}): Promise<void> {
  await createNotification({
    userId: args.professionalId,
    type: args.approved ? 'application_approved' : 'application_rejected',
  });
}

export async function listNotifications(
  userId: string,
): Promise<NotificationListResponse> {
  const [rows, unreadCount] = await Promise.all([
    repo.listForUser(userId),
    repo.countUnread(userId),
  ]);
  return NotificationListResponseSchema.parse({
    notifications: rows.map(toNotification),
    unreadCount,
  });
}

export async function getUnreadCount(
  userId: string,
): Promise<NotificationUnreadCountResponse> {
  const unreadCount = await repo.countUnread(userId);
  return NotificationUnreadCountResponseSchema.parse({ unreadCount });
}

export async function markNotificationRead(
  id: string,
  userId: string,
): Promise<Notification> {
  const updated = await repo.markRead(id, userId);
  if (!updated) {
    throw new AppError(404, 'NOT_FOUND', 'Notification not found');
  }
  return toNotification(updated);
}
