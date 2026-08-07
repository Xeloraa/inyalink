import { z } from 'zod';
import { TextLanguageSchema } from '@inyalink/shared';

/**
 * Model output under Groq/OpenAI strict json_schema: every key must be
 * required; use null for "missing" instead of omitting fields.
 */
export const StructureBriefModelOutputSchema = z.object({
  nextQuestion: z.string().min(1).max(1000).nullable(),
  briefDraft: z.object({
    language: TextLanguageSchema.nullable(),
    category: z.string().min(1).max(80).nullable(),
    title: z.string().min(1).max(140).nullable(),
    description: z.string().min(1).max(4000).nullable(),
    requirements: z.array(z.string().max(500)).max(30).nullable(),
    budget_min_mmk: z.number().int().nonnegative().nullable(),
    budget_max_mmk: z.number().int().nonnegative().nullable(),
    deadline: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'deadline must be YYYY-MM-DD')
      .nullable(),
    reference_links: z.array(z.string().max(500)).max(20).nullable(),
    ai_confidence: z.number().min(0).max(1).nullable(),
    needs_human_review: z.boolean().nullable(),
  }),
  complete: z.boolean(),
  /** Hand off to Guided Plan (goals, problems, don't-know). */
  redirectTo: z.literal('roadmap').nullable(),
});

export type StructureBriefModelOutput = z.infer<
  typeof StructureBriefModelOutputSchema
>;

/**
 * Model output under Groq/OpenAI strict json_schema: every key required.
 * Money fields are integer Myanmar kyat.
 */
export const GenerateRoadmapModelOutputSchema = z.object({
  language: TextLanguageSchema,
  steps: z
    .array(
      z.object({
        order: z.number().int().min(1).max(6),
        title: z.string().min(1).max(200),
        why: z.string().min(1).max(1000),
        category_slug: z.string().min(1).max(80),
        est_min_mmk: z.number().int().nonnegative(),
        est_max_mmk: z.number().int().nonnegative(),
      }),
    )
    .min(4)
    .max(6),
  disclaimer: z.string().min(1).max(2000),
});

export type GenerateRoadmapModelOutput = z.infer<
  typeof GenerateRoadmapModelOutputSchema
>;

/**
 * One-sentence match explanation. Language must match the brief.
 */
export const ExplainMatchModelOutputSchema = z.object({
  explanation: z.string().min(1).max(500),
});

export type ExplainMatchModelOutput = z.infer<
  typeof ExplainMatchModelOutputSchema
>;
