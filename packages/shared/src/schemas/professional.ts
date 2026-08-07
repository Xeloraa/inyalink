import { z } from 'zod';
import { ProfessionalReputationSchema } from './matching.js';

export const CategorySlugSchema = z.enum([
  'graphic-design',
  'photography',
  'web-development',
  'social-media-marketing',
]);

export type CategorySlug = z.infer<typeof CategorySlugSchema>;

export const CategorySchema = z.object({
  id: z.string().uuid(),
  slug: CategorySlugSchema,
  nameMy: z.string().min(1).max(80),
  nameEn: z.string().min(1).max(80),
});

export type Category = z.infer<typeof CategorySchema>;

export const CategoriesResponseSchema = z.object({
  categories: z.array(CategorySchema),
});

export type CategoriesResponse = z.infer<typeof CategoriesResponseSchema>;

export const PortfolioItemSchema = z.object({
  id: z.string().uuid(),
  caption: z.string().max(300).nullable(),
  externalUrl: z.string().nullable(),
  storagePath: z.string().nullable(),
  sort: z.number().int().nonnegative(),
});

export type PortfolioItem = z.infer<typeof PortfolioItemSchema>;

export const WorkLinkPlatformSchema = z.enum([
  'github',
  'behance',
  'dribbble',
  'website',
  'instagram',
  'facebook',
  'linkedin',
  'other',
]);

export type WorkLinkPlatform = z.infer<typeof WorkLinkPlatformSchema>;

export const MAX_WORK_LINKS = 12 as const;

export const WorkLinkSchema = z.object({
  id: z.string().uuid(),
  platform: WorkLinkPlatformSchema,
  url: z.string().url().max(500),
  label: z.string().min(1).max(80).nullable(),
  sort: z.number().int().nonnegative(),
  verifiedAt: z.string(),
});

export type WorkLink = z.infer<typeof WorkLinkSchema>;

export const WorkLinkCreateInputSchema = z.object({
  platform: WorkLinkPlatformSchema,
  url: z
    .string()
    .trim()
    .url()
    .max(500)
    .refine(
      (u) => {
        try {
          const parsed = new URL(u);
          return parsed.protocol === 'https:' || parsed.protocol === 'http:';
        } catch {
          return false;
        }
      },
      { message: 'URL must be http or https' },
    ),
  /** Optional display label — mainly for platform `other`. */
  label: z.string().trim().min(1).max(80).optional(),
});

export type WorkLinkCreateInput = z.infer<typeof WorkLinkCreateInputSchema>;

export const WorkLinkIdParamsSchema = z.object({
  linkId: z.string().uuid(),
});

export type WorkLinkIdParams = z.infer<typeof WorkLinkIdParamsSchema>;

/** Six-cell public reputation + ops stats for the profile page. */
export const ProfessionalProfileStatsSchema = ProfessionalReputationSchema.extend(
  {
    typicalTurnaroundDays: z.number().int().positive().nullable(),
    minBudgetMmk: z.number().int().nonnegative().nullable(),
  },
);

export type ProfessionalProfileStats = z.infer<
  typeof ProfessionalProfileStatsSchema
>;

export const ProfessionalProfileSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().min(1).max(80),
  avatarUrl: z.string().nullable(),
  verified: z.boolean(),
  headlineMy: z.string().max(120).nullable(),
  headlineEn: z.string().max(120).nullable(),
  bioMy: z.string().max(4000).nullable(),
  bioEn: z.string().max(4000).nullable(),
  location: z.string().max(80).nullable(),
  category: CategorySchema.nullable(),
  skills: z.array(z.string().min(1).max(40)).max(24),
  acceptingWork: z.boolean(),
  stats: ProfessionalProfileStatsSchema,
  portfolio: z.array(PortfolioItemSchema).max(24),
  workLinks: z.array(WorkLinkSchema).max(MAX_WORK_LINKS),
});

export type ProfessionalProfile = z.infer<typeof ProfessionalProfileSchema>;

export const ProfessionalIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type ProfessionalIdParams = z.infer<typeof ProfessionalIdParamsSchema>;

export const ProfessionalListItemSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().min(1).max(80),
  avatarUrl: z.string().nullable(),
  verified: z.boolean(),
  headlineMy: z.string().max(120).nullable(),
  headlineEn: z.string().max(120).nullable(),
  bioMy: z.string().max(4000).nullable(),
  bioEn: z.string().max(4000).nullable(),
  location: z.string().max(80).nullable(),
  categorySlug: CategorySlugSchema.nullable(),
  skills: z.array(z.string().min(1).max(40)).max(24),
  acceptingWork: z.boolean(),
  stats: ProfessionalProfileStatsSchema,
  explanation: z.string().max(500).nullable().optional(),
});

export type ProfessionalListItem = z.infer<typeof ProfessionalListItemSchema>;

export const ProfessionalsSortSchema = z.enum(['relevance', 'jobs', 'reply']);

export type ProfessionalsSort = z.infer<typeof ProfessionalsSortSchema>;

export const ProfessionalsListQuerySchema = z.object({
  category: z
    .union([CategorySlugSchema, z.array(CategorySlugSchema)])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      return Array.isArray(v) ? v : [v];
    }),
  skill: z
    .union([z.string().min(1).max(40), z.array(z.string().min(1).max(40))])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      return Array.isArray(v) ? v : [v];
    }),
  q: z
    .string()
    .max(120)
    .optional()
    .transform((v) => {
      const trimmed = v?.trim();
      return trimmed ? trimmed : undefined;
    }),
  sort: ProfessionalsSortSchema.optional().default('relevance'),
  minBudget: z.coerce.number().int().nonnegative().optional(),
  maxBudget: z.coerce.number().int().nonnegative().optional(),
  acceptingOnly: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .optional()
    .transform((v) => v === true || v === 'true'),
});

export type ProfessionalsListQuery = z.infer<
  typeof ProfessionalsListQuerySchema
>;

export const ProfessionalsListResponseSchema = z.object({
  professionals: z.array(ProfessionalListItemSchema),
});

export type ProfessionalsListResponse = z.infer<
  typeof ProfessionalsListResponseSchema
>;

/** One skill filter option in the directory rail, with how many pros offer it. */
export const SkillFacetSchema = z.object({
  name: z.string().min(1).max(40),
  count: z.number().int().positive(),
});

export type SkillFacet = z.infer<typeof SkillFacetSchema>;

export const ProfessionalSkillsResponseSchema = z.object({
  skills: z.array(SkillFacetSchema),
});

export type ProfessionalSkillsResponse = z.infer<
  typeof ProfessionalSkillsResponseSchema
>;

export const PortfolioUploadItemSchema = z.object({
  /** External URL or local demo path — no identity-document uploads */
  externalUrl: z.union([z.string().url(), z.string().startsWith('/')]),
  caption: z.string().max(300).optional(),
});

export type PortfolioUploadItem = z.infer<typeof PortfolioUploadItemSchema>;

export const ProStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'paused',
]);

export type ProStatus = z.infer<typeof ProStatusSchema>;

/**
 * Professional onboarding application.
 * Never includes NRC, national ID, passport, selfie, or biometrics.
 */
export const ProfessionalApplyInputSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  categorySlug: CategorySlugSchema,
  skills: z.array(z.string().trim().min(1).max(40)).min(1).max(12),
  headlineMy: z.string().trim().min(4).max(120),
  headlineEn: z.string().trim().min(4).max(120),
  bioMy: z.string().trim().min(20).max(2000),
  bioEn: z.string().trim().min(20).max(2000),
  typicalTurnaroundDays: z.number().int().min(1).max(90),
  minBudgetMmk: z.number().int().min(10_000).max(100_000_000),
  acceptingWork: z.boolean().default(true),
  portfolio: z.array(PortfolioUploadItemSchema).min(1).max(8),
});

export type ProfessionalApplyInput = z.infer<typeof ProfessionalApplyInputSchema>;

export const ProfessionalApplyResponseSchema = z.object({
  professionalId: z.string().uuid(),
  status: ProStatusSchema,
});

export type ProfessionalApplyResponse = z.infer<
  typeof ProfessionalApplyResponseSchema
>;

/** Own professional row — any status, for join gate + profile edit. */
export const ProfessionalMeSchema = ProfessionalProfileSchema.extend({
  status: ProStatusSchema,
});

export type ProfessionalMe = z.infer<typeof ProfessionalMeSchema>;

/**
 * Partial profile update. Portfolio is managed via dedicated add/delete routes.
 * Never includes NRC, national ID, passport, selfie, or biometrics.
 */
export const ProfessionalUpdateInputSchema = z
  .object({
    displayName: z.string().trim().min(2).max(80).optional(),
    categorySlug: CategorySlugSchema.optional(),
    skills: z.array(z.string().trim().min(1).max(40)).min(1).max(12).optional(),
    headlineMy: z.string().trim().min(4).max(120).optional(),
    headlineEn: z.string().trim().min(4).max(120).optional(),
    bioMy: z.string().trim().min(20).max(2000).optional(),
    bioEn: z.string().trim().min(20).max(2000).optional(),
    typicalTurnaroundDays: z.number().int().min(1).max(90).optional(),
    minBudgetMmk: z.number().int().min(10_000).max(100_000_000).optional(),
    acceptingWork: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.displayName !== undefined ||
      v.categorySlug !== undefined ||
      v.skills !== undefined ||
      v.headlineMy !== undefined ||
      v.headlineEn !== undefined ||
      v.bioMy !== undefined ||
      v.bioEn !== undefined ||
      v.typicalTurnaroundDays !== undefined ||
      v.minBudgetMmk !== undefined ||
      v.acceptingWork !== undefined,
    { message: 'At least one field is required' },
  );

export type ProfessionalUpdateInput = z.infer<
  typeof ProfessionalUpdateInputSchema
>;

export const PortfolioItemIdParamsSchema = z.object({
  itemId: z.string().uuid(),
});

export type PortfolioItemIdParams = z.infer<typeof PortfolioItemIdParamsSchema>;
