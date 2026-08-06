import { z } from 'zod';
import {
  BriefDraftSchema,
  BriefSourceSchema,
  BriefStatusSchema,
  TextLanguageSchema,
} from './brief.js';

export const CreateBriefInputSchema = z.object({
  source: BriefSourceSchema.default('ai_chat'),
  raw_input: z.string().max(4000).optional(),
  roadmap_id: z.string().uuid().optional(),
  draft: BriefDraftSchema,
});

export type CreateBriefInput = z.infer<typeof CreateBriefInputSchema>;

export const UpdateBriefInputSchema = z.object({
  draft: BriefDraftSchema.optional(),
  raw_input: z.string().max(4000).nullable().optional(),
  status: z.enum(['draft', 'submitted']).optional(),
  roadmap_id: z.string().uuid().nullable().optional(),
});

export type UpdateBriefInput = z.infer<typeof UpdateBriefInputSchema>;

export const BriefIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type BriefIdParams = z.infer<typeof BriefIdParamsSchema>;

export const MatchingModeSchema = z.enum(['open_pool', 'partner_direct']);
export type MatchingMode = z.infer<typeof MatchingModeSchema>;

export const SubmitBriefInputSchema = z.object({
  urgent: z.boolean().optional(),
});

export type SubmitBriefInput = z.infer<typeof SubmitBriefInputSchema>;

export const BriefResponseSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string().uuid(),
  status: BriefStatusSchema,
  source: BriefSourceSchema,
  raw_input: z.string().nullable(),
  language: TextLanguageSchema.nullable(),
  category_id: z.string().uuid().nullable(),
  category_slug: z.string().nullable(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  requirements: z.array(z.string()),
  budget_min_mmk: z.number().int().nonnegative().nullable(),
  budget_max_mmk: z.number().int().nonnegative().nullable(),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  reference_links: z.array(z.string()),
  ai_confidence: z.number().min(0).max(1).nullable(),
  needs_human_review: z.boolean(),
  roadmap_id: z.string().uuid().nullable(),
  urgent: z.boolean(),
  interest_opens_at: z.string().nullable(),
  interest_closes_at: z.string().nullable(),
  matching_mode: MatchingModeSchema.nullable(),
  fallback_used: z.boolean(),
  ranked_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type BriefResponse = z.infer<typeof BriefResponseSchema>;
