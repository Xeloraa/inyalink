import { z } from 'zod';
import { BriefDraftSchema, TextLanguageSchema, UiLocaleSchema } from './brief.js';

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ConverseBriefInputSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(24),
  briefDraft: BriefDraftSchema.optional(),
  /** UI language toggle. AI reply language follows the latest user message. */
  locale: UiLocaleSchema.default('my'),
});

export type ConverseBriefInput = z.infer<typeof ConverseBriefInputSchema>;

export const ConverseBriefResponseSchema = z.object({
  nextQuestion: z.string().min(1).max(1000).optional(),
  briefDraft: BriefDraftSchema,
  complete: z.boolean(),
  /**
   * Client should abandon the brief conversation and open Guided Plan.
   * Used when the opening is goal-shaped or the user signals "I don't know".
   */
  redirectTo: z.literal('roadmap').optional(),
  /** Soft transient failure (e.g. rate limit). Client keeps state and retries. */
  retryable: z.boolean().optional(),
  /** Short user-facing notice when retryable is true. */
  notice: z.string().min(1).max(300).optional(),
});

export type ConverseBriefResponse = z.infer<typeof ConverseBriefResponseSchema>;

export const RoadmapStepSchema = z
  .object({
    order: z.number().int().min(1).max(6),
    title: z.string().min(1).max(200),
    why: z.string().min(1).max(1000),
    category_slug: z.string().min(1).max(80),
    est_min_mmk: z.number().int().nonnegative(),
    est_max_mmk: z.number().int().nonnegative(),
  })
  .refine((s) => s.est_max_mmk >= s.est_min_mmk, {
    message: 'est_max_mmk must be >= est_min_mmk',
  });

export type RoadmapStep = z.infer<typeof RoadmapStepSchema>;

export const GenerateRoadmapInputSchema = z.object({
  goal: z.string().min(1).max(4000),
  /** UI language toggle — roadmap text in this language regardless of goal language. */
  locale: UiLocaleSchema.default('my'),
});

export type GenerateRoadmapInput = z.infer<typeof GenerateRoadmapInputSchema>;

export const GenerateRoadmapResponseSchema = z.object({
  id: z.string().uuid().optional(),
  language: TextLanguageSchema.optional(),
  steps: z.array(RoadmapStepSchema).min(4).max(6).optional(),
  disclaimer: z.string().min(1).max(2000).optional(),
  retryable: z.boolean().optional(),
  notice: z.string().min(1).max(300).optional(),
});

export type GenerateRoadmapResponse = z.infer<
  typeof GenerateRoadmapResponseSchema
>;
