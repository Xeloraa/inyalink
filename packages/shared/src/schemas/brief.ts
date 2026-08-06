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
