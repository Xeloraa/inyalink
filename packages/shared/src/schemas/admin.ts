import { z } from 'zod';
import { BriefStatusSchema } from './brief.js';
import { EngagementStatusSchema } from './engagement.js';
import {
  CategorySlugSchema,
  PortfolioItemSchema,
  WorkLinkSchema,
} from './professional.js';

/** GET /admin/dashboard */
export const AdminDashboardResponseSchema = z.object({
  pendingProfessionals: z.number().int().nonnegative(),
  openBriefs: z.number().int().nonnegative(),
  activeEngagements: z.number().int().nonnegative(),
  fallbackRate: z.number().min(0).max(1),
  aiCostUsdThisWeek: z.number().nonnegative(),
});

export type AdminDashboardResponse = z.infer<
  typeof AdminDashboardResponseSchema
>;

export const AdminPendingProfessionalSchema = z.object({
  userId: z.string().uuid(),
  displayName: z.string(),
  categorySlug: CategorySlugSchema,
  categoryNameEn: z.string(),
  categoryNameMy: z.string(),
  categoryOtherText: z.string().nullable(),
  skills: z.array(z.string()),
  bioMy: z.string().nullable(),
  bioEn: z.string().nullable(),
  headlineMy: z.string().nullable(),
  headlineEn: z.string().nullable(),
  cvUrl: z.string().nullable(),
  reviewNote: z.string().nullable(),
  createdAt: z.string(),
  portfolio: z.array(PortfolioItemSchema),
  workLinks: z.array(WorkLinkSchema),
});

export type AdminPendingProfessional = z.infer<
  typeof AdminPendingProfessionalSchema
>;

export const AdminPendingProfessionalsResponseSchema = z.object({
  items: z.array(AdminPendingProfessionalSchema),
});

export type AdminPendingProfessionalsResponse = z.infer<
  typeof AdminPendingProfessionalsResponseSchema
>;

export const AdminReviewActionSchema = z.enum([
  'approve',
  'reject',
  'request_info',
]);

export type AdminReviewAction = z.infer<typeof AdminReviewActionSchema>;

export const AdminReviewProfessionalInputSchema = z
  .object({
    action: AdminReviewActionSchema,
    reason: z.string().trim().min(2).max(500).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.action === 'reject' && !val.reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Reason required to reject',
        path: ['reason'],
      });
    }
    if (val.action === 'request_info' && !val.reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Note required when requesting more info',
        path: ['reason'],
      });
    }
  });

export type AdminReviewProfessionalInput = z.infer<
  typeof AdminReviewProfessionalInputSchema
>;

export const AdminReviewProfessionalResponseSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(['pending', 'approved', 'rejected', 'paused']),
  reviewNote: z.string().nullable(),
});

export type AdminReviewProfessionalResponse = z.infer<
  typeof AdminReviewProfessionalResponseSchema
>;

export const AdminProfessionalIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type AdminProfessionalIdParams = z.infer<
  typeof AdminProfessionalIdParamsSchema
>;

export const AdminSurfacedProfessionalSchema = z.object({
  professionalId: z.string().uuid(),
  displayName: z.string(),
  rank: z.number().int().min(1).max(3),
  score: z.number(),
  fromInterest: z.boolean(),
  guaranteedResponse: z.boolean(),
});

export type AdminSurfacedProfessional = z.infer<
  typeof AdminSurfacedProfessionalSchema
>;

export const AdminBriefListItemSchema = z.object({
  id: z.string().uuid(),
  status: BriefStatusSchema,
  title: z.string().nullable(),
  categorySlug: z.string().nullable(),
  clientId: z.string().uuid(),
  clientDisplayName: z.string(),
  interestCount: z.number().int().nonnegative(),
  fallbackUsed: z.boolean(),
  surfaced: z.array(AdminSurfacedProfessionalSchema),
  createdAt: z.string(),
  rankedAt: z.string().nullable(),
});

export type AdminBriefListItem = z.infer<typeof AdminBriefListItemSchema>;

export const AdminBriefsListQuerySchema = z.object({
  status: BriefStatusSchema.optional(),
});

export type AdminBriefsListQuery = z.infer<typeof AdminBriefsListQuerySchema>;

export const AdminBriefsListResponseSchema = z.object({
  items: z.array(AdminBriefListItemSchema),
});

export type AdminBriefsListResponse = z.infer<
  typeof AdminBriefsListResponseSchema
>;

export const AdminBriefIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type AdminBriefIdParams = z.infer<typeof AdminBriefIdParamsSchema>;

export const AdminAssignBriefInputSchema = z.object({
  professionalId: z.string().uuid(),
  matchReason: z.string().trim().min(2).max(400).optional(),
});

export type AdminAssignBriefInput = z.infer<typeof AdminAssignBriefInputSchema>;

export const AdminAssignBriefResponseSchema = z.object({
  engagementId: z.string().uuid(),
  briefId: z.string().uuid(),
  professionalId: z.string().uuid(),
  status: EngagementStatusSchema,
});

export type AdminAssignBriefResponse = z.infer<
  typeof AdminAssignBriefResponseSchema
>;

export const AdminEngagementListItemSchema = z.object({
  id: z.string().uuid(),
  briefId: z.string().uuid(),
  briefTitle: z.string().nullable(),
  professionalId: z.string().uuid(),
  professionalDisplayName: z.string(),
  clientId: z.string().uuid(),
  clientDisplayName: z.string(),
  status: EngagementStatusSchema,
  proposedAt: z.string(),
  respondBy: z.string().nullable(),
  updatedAt: z.string(),
  hoursInState: z.number().nonnegative(),
  stalled: z.boolean(),
  stallReason: z.enum(['past_respond_by', 'in_progress_over_30d']).nullable(),
});

export type AdminEngagementListItem = z.infer<
  typeof AdminEngagementListItemSchema
>;

export const AdminEngagementsListQuerySchema = z.object({
  status: EngagementStatusSchema.optional(),
});

export type AdminEngagementsListQuery = z.infer<
  typeof AdminEngagementsListQuerySchema
>;

export const AdminEngagementsListResponseSchema = z.object({
  items: z.array(AdminEngagementListItemSchema),
});

export type AdminEngagementsListResponse = z.infer<
  typeof AdminEngagementsListResponseSchema
>;

export const AdminEngagementIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type AdminEngagementIdParams = z.infer<
  typeof AdminEngagementIdParamsSchema
>;

export const AdminPatchEngagementStatusInputSchema = z.object({
  status: EngagementStatusSchema,
  note: z.string().trim().min(2).max(500).optional(),
});

export type AdminPatchEngagementStatusInput = z.infer<
  typeof AdminPatchEngagementStatusInputSchema
>;

export const AdminPatchEngagementStatusResponseSchema = z.object({
  id: z.string().uuid(),
  status: EngagementStatusSchema,
});

export type AdminPatchEngagementStatusResponse = z.infer<
  typeof AdminPatchEngagementStatusResponseSchema
>;

/** Full ops metrics — distinct from matching-only AdminMetricsResponse. */
export const AdminOpsMetricsResponseSchema = z.object({
  briefsCreated: z.number().int().nonnegative(),
  matchRate: z.number().min(0).max(1),
  completionRate: z.number().min(0).max(1),
  /** Clients with ≥2 confirmed engagements / clients with ≥1 confirmed. */
  clientRepeatRate: z.number().min(0).max(1),
  aiCostUsdThisWeek: z.number().nonnegative(),
  fallbackRate: z.number().min(0).max(1),
  briefsRanked: z.number().int().nonnegative(),
  briefsWithFallback: z.number().int().nonnegative(),
});

export type AdminOpsMetricsResponse = z.infer<
  typeof AdminOpsMetricsResponseSchema
>;
