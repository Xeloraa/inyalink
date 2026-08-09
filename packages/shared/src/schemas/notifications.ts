import { z } from 'zod';

export const NotificationTypeSchema = z.enum([
  'match_top3',
  'engagement_proposed',
  'engagement_accepted',
  'engagement_declined',
  'application_approved',
  'application_rejected',
]);

export type NotificationType = z.infer<typeof NotificationTypeSchema>;

export const NotificationIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type NotificationIdParams = z.infer<typeof NotificationIdParamsSchema>;

/** Optional display context; titles come from i18n on the client. */
export const NotificationMetaSchema = z.object({
  briefTitle: z.string().max(200).nullable().optional(),
  professionalName: z.string().max(120).nullable().optional(),
});

export type NotificationMeta = z.infer<typeof NotificationMetaSchema>;

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  type: NotificationTypeSchema,
  href: z.string().min(1).max(500),
  briefId: z.string().uuid().nullable(),
  engagementId: z.string().uuid().nullable(),
  meta: NotificationMetaSchema,
  readAt: z.string().nullable(),
  createdAt: z.string(),
});

export type Notification = z.infer<typeof NotificationSchema>;

export const NotificationListResponseSchema = z.object({
  notifications: z.array(NotificationSchema),
  unreadCount: z.number().int().nonnegative(),
});

export type NotificationListResponse = z.infer<
  typeof NotificationListResponseSchema
>;

export const NotificationUnreadCountResponseSchema = z.object({
  unreadCount: z.number().int().nonnegative(),
});

export type NotificationUnreadCountResponse = z.infer<
  typeof NotificationUnreadCountResponseSchema
>;

export const MarkNotificationReadResponseSchema = NotificationSchema;

export type MarkNotificationReadResponse = z.infer<
  typeof MarkNotificationReadResponseSchema
>;
