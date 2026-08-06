import { z } from 'zod';
import { TextLanguageSchema, UiLocaleSchema } from './brief.js';

export const ACTIVE_INTEREST_CAP = 10 as const;

export const MatchingCandidatesQuerySchema = z.object({
  briefId: z.string().uuid(),
});

export type MatchingCandidatesQuery = z.infer<
  typeof MatchingCandidatesQuerySchema
>;

export const ProfessionalReputationSchema = z.object({
  completedCount: z.number().int().nonnegative(),
  declinedCount: z.number().int().nonnegative(),
  uniqueClients: z.number().int().nonnegative(),
  /** null when the pro has no scored engagements yet */
  completionRatePct: z.number().min(0).max(100).nullable(),
  medianResponseMins: z.number().nonnegative().nullable(),
});

export type ProfessionalReputation = z.infer<
  typeof ProfessionalReputationSchema
>;

/** Fit signals only — never interest speed. */
export const MatchScoreBreakdownSchema = z.object({
  skillOverlap: z.number().min(0).max(1),
  portfolioRelevance: z.number().min(0).max(1),
  budgetFit: z.number().min(0).max(1),
  completionRate: z.number().min(0).max(1),
});

export type MatchScoreBreakdown = z.infer<typeof MatchScoreBreakdownSchema>;

export const MatchCandidateSchema = z.object({
  professionalId: z.string().uuid(),
  displayName: z.string().min(1).max(80),
  avatarUrl: z.string().nullable(),
  headlineMy: z.string().max(120).nullable(),
  headlineEn: z.string().max(120).nullable(),
  skills: z.array(z.string()),
  rank: z.number().int().min(1).max(3),
  score: z.number().min(0).max(1),
  scoreBreakdown: MatchScoreBreakdownSchema,
  /** Short deterministic summary of which signals drove the rank. */
  rankReason: z.string().min(1).max(400),
  /** Partner-tier fill or urgent partner path. */
  guaranteedResponse: z.boolean(),
  /** null until the explanation endpoint has filled it in */
  explanation: z.string().max(500).nullable(),
  reputation: ProfessionalReputationSchema,
  portfolio: z
    .array(
      z.object({
        id: z.string().uuid(),
        caption: z.string().max(300).nullable(),
        externalUrl: z.string().nullable(),
        storagePath: z.string().nullable(),
      }),
    )
    .max(4),
});

export type MatchCandidate = z.infer<typeof MatchCandidateSchema>;

export const MatchingCandidatesResponseSchema = z.object({
  briefId: z.string().uuid(),
  language: TextLanguageSchema.nullable(),
  /** waiting = interest window still open; ready = top-3 available */
  status: z.enum(['waiting', 'ready']),
  interestedCount: z.number().int().nonnegative(),
  /**
   * Show "3 of N interested…" only when N > 4.
   * Otherwise UI should say "Ranked by fit."
   */
  showInterestCount: z.boolean(),
  fallbackUsed: z.boolean(),
  matchingMode: z.enum(['open_pool', 'partner_direct']).nullable(),
  interestClosesAt: z.string().nullable(),
  candidates: z.array(MatchCandidateSchema).max(3),
});

export type MatchingCandidatesResponse = z.infer<
  typeof MatchingCandidatesResponseSchema
>;

export const MatchExplanationParamsSchema = z.object({
  professionalId: z.string().uuid(),
});

export type MatchExplanationParams = z.infer<
  typeof MatchExplanationParamsSchema
>;

export const MatchExplanationQuerySchema = z.object({
  briefId: z.string().uuid(),
  /** UI language toggle — explanation in this language regardless of brief language. */
  locale: UiLocaleSchema.default('my'),
});

export type MatchExplanationQuery = z.infer<typeof MatchExplanationQuerySchema>;

export const MatchExplanationResponseSchema = z.object({
  briefId: z.string().uuid(),
  professionalId: z.string().uuid(),
  /** null when the LLM is unavailable / rate-limited — never blocks the list */
  explanation: z.string().min(1).max(500).nullable(),
  /** Soft transient failure (e.g. rate limit). Client may retry. */
  retryable: z.boolean().optional(),
  notice: z.string().min(1).max(300).optional(),
});

export type MatchExplanationResponse = z.infer<
  typeof MatchExplanationResponseSchema
>;

export const BriefInterestParamsSchema = z.object({
  briefId: z.string().uuid(),
});

export type BriefInterestParams = z.infer<typeof BriefInterestParamsSchema>;

export const BriefInterestResponseSchema = z.object({
  briefId: z.string().uuid(),
  professionalId: z.string().uuid(),
  interested: z.boolean(),
  activeCount: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative().max(ACTIVE_INTEREST_CAP),
  cap: z.literal(ACTIVE_INTEREST_CAP),
});

export type BriefInterestResponse = z.infer<typeof BriefInterestResponseSchema>;

export const MatchingFeedItemSchema = z.object({
  briefId: z.string().uuid(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  categorySlug: z.string().nullable(),
  language: TextLanguageSchema.nullable(),
  budgetMinMmk: z.number().int().nonnegative().nullable(),
  budgetMaxMmk: z.number().int().nonnegative().nullable(),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  interestClosesAt: z.string().nullable(),
  requirements: z.array(z.string()),
  alreadyInterested: z.boolean(),
  skillOverlapHint: z.number().min(0).max(1),
});

export type MatchingFeedItem = z.infer<typeof MatchingFeedItemSchema>;

export const MatchingFeedResponseSchema = z.object({
  items: z.array(MatchingFeedItemSchema),
  activeInterestCount: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative().max(ACTIVE_INTEREST_CAP),
  cap: z.literal(ACTIVE_INTEREST_CAP),
});

export type MatchingFeedResponse = z.infer<typeof MatchingFeedResponseSchema>;

export const AdminMetricsResponseSchema = z.object({
  briefsRanked: z.number().int().nonnegative(),
  briefsWithFallback: z.number().int().nonnegative(),
  /** briefsWithFallback / briefsRanked, or 0 when none ranked */
  fallbackRate: z.number().min(0).max(1),
  briefsUrgent: z.number().int().nonnegative(),
  openPoolBriefs: z.number().int().nonnegative(),
});

export type AdminMetricsResponse = z.infer<typeof AdminMetricsResponseSchema>;
