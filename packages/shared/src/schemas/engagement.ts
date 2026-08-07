import { z } from 'zod';
import { TextLanguageSchema } from './brief.js';

export const EngagementStatusSchema = z.enum([
  'proposed',
  'accepted',
  'declined',
  'in_progress',
  'delivered',
  'confirmed',
  'disputed',
  'cancelled',
]);

export type EngagementStatus = z.infer<typeof EngagementStatusSchema>;

/** Hours a professional has to accept or decline a proposal. */
export const ENGAGEMENT_RESPOND_HOURS = 24 as const;

export const EngagementIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type EngagementIdParams = z.infer<typeof EngagementIdParamsSchema>;

/** Client proposes to one of the surfaced top-3 candidates. */
export const CreateEngagementInputSchema = z.object({
  briefId: z.string().uuid(),
  professionalId: z.string().uuid(),
});

export type CreateEngagementInput = z.infer<typeof CreateEngagementInputSchema>;

export const DeclineEngagementInputSchema = z.object({
  reason: z.string().trim().min(4).max(500),
});

export type DeclineEngagementInput = z.infer<
  typeof DeclineEngagementInputSchema
>;

export const EngagementSchema = z.object({
  id: z.string().uuid(),
  briefId: z.string().uuid(),
  professionalId: z.string().uuid(),
  status: EngagementStatusSchema,
  matchReason: z.string().max(400).nullable(),
  declineReason: z.string().max(500).nullable(),
  proposedAt: z.string(),
  respondBy: z.string().nullable(),
  acceptedAt: z.string().nullable(),
  /** Seconds remaining until respondBy; null when not proposed or already expired. */
  secondsRemaining: z.number().int().nullable(),
});

export type Engagement = z.infer<typeof EngagementSchema>;

export const EngagementInboxItemSchema = EngagementSchema.extend({
  briefTitle: z.string().nullable(),
  briefDescription: z.string().nullable(),
  briefLanguage: TextLanguageSchema.nullable(),
  budgetMinMmk: z.number().int().nonnegative().nullable(),
  budgetMaxMmk: z.number().int().nonnegative().nullable(),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  categorySlug: z.string().nullable(),
});

export type EngagementInboxItem = z.infer<typeof EngagementInboxItemSchema>;

export const EngagementInboxResponseSchema = z.object({
  items: z.array(EngagementInboxItemSchema),
});

export type EngagementInboxResponse = z.infer<
  typeof EngagementInboxResponseSchema
>;

export const EngagementListQuerySchema = z.object({
  briefId: z.string().uuid(),
});

export type EngagementListQuery = z.infer<typeof EngagementListQuerySchema>;

export const EngagementListResponseSchema = z.object({
  engagements: z.array(EngagementSchema),
});

export type EngagementListResponse = z.infer<
  typeof EngagementListResponseSchema
>;
