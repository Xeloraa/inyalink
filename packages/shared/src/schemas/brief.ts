import { z } from 'zod';

export const TextLanguageSchema = z.enum(['my', 'en', 'mixed']);
export type TextLanguage = z.infer<typeof TextLanguageSchema>;

/** Header my/en toggle — drives AI response language. */
export const UiLocaleSchema = z.enum(['my', 'en']);
export type UiLocale = z.infer<typeof UiLocaleSchema>;

export const BriefStatusSchema = z.enum([
  'draft',
  'submitted',
  'matched',
  'closed',
  'cancelled',
]);
export type BriefStatus = z.infer<typeof BriefStatusSchema>;

export const BriefSourceSchema = z.enum(['form', 'ai_chat', 'roadmap']);
export type BriefSource = z.infer<typeof BriefSourceSchema>;
/** Draft fields filled during AI converse / form. Money is integer kyat. */
export const BriefDraftSchema = z.object({
  language: TextLanguageSchema.optional(),
  category: z.string().min(1).max(80).optional(),
  title: z.string().min(1).max(140).optional(),
  description: z.string().min(1).max(4000).optional(),
  requirements: z.array(z.string().max(500)).max(30).optional(),
  budget_min_mmk: z.number().int().nonnegative().optional(),
  budget_max_mmk: z.number().int().nonnegative().optional(),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'deadline must be YYYY-MM-DD')
    .optional(),
  reference_links: z.array(z.string().max(500)).max(20).optional(),
  ai_confidence: z.number().min(0).max(1).optional(),
  needs_human_review: z.boolean().optional(),
});

export type BriefDraft = z.infer<typeof BriefDraftSchema>;

export function isBriefDraftComplete(draft: BriefDraft): boolean {
  const hasCategory = Boolean(draft.category?.trim());
  const hasDescription = Boolean(draft.description?.trim());
  const hasBudget =
    draft.budget_min_mmk !== undefined || draft.budget_max_mmk !== undefined;
  const hasDeadline = Boolean(draft.deadline);
  return hasCategory && hasDescription && (hasBudget || hasDeadline);
}

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
