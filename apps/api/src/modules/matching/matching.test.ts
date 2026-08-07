import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MatchingProRow } from './matching.repo.js';

const explainMatch = vi.fn();

vi.mock('../../ai/features/explainMatch.js', () => ({
  explainMatch: (...args: unknown[]) => explainMatch(...args),
}));

vi.mock('../../lib/config.js', () => ({
  config: { demoMode: true, aiProvider: 'groq' },
}));

vi.mock('./matching.repo.js', () => ({
  getBriefForMatching: vi.fn(),
  listApprovedProsInCategory: vi.fn(),
  listPartnerProsInCategory: vi.fn(),
  listProsByIds: vi.fn(),
  getApprovedProById: vi.fn(),
  getProfessionalProfileRow: vi.fn(),
  listPortfolioThumbs: vi.fn(async () => new Map()),
  listPortfolioCaptions: vi.fn(async () => new Map()),
  insertAiCall: vi.fn(async () => undefined),
  countActiveInterests: vi.fn(async () => 0),
  hasInterest: vi.fn(async () => false),
  insertInterest: vi.fn(async () => undefined),
  deleteInterest: vi.fn(async () => undefined),
  countInterests: vi.fn(async () => 0),
  listInterestedProIds: vi.fn(async () => []),
  listTerminalEngagementProIds: vi.fn(async () => []),
  seedInterests: vi.fn(async () => undefined),
  listOpenFeedForCategory: vi.fn(async () => []),
  listSurfacedCandidates: vi.fn(async () => []),
  replaceSurfacedCandidates: vi.fn(async () => undefined),
  markBriefRanked: vi.fn(async () => undefined),
  updateCandidateExplanation: vi.fn(async () => undefined),
  adminMatchingMetrics: vi.fn(async () => ({
    briefsRanked: 0,
    briefsWithFallback: 0,
    briefsUrgent: 0,
    openPoolBriefs: 0,
  })),
}));

import * as repo from './matching.repo.js';
import { getCandidateExplanation } from './matching.explain.js';
import {
  budgetFitScore,
  expressInterest,
  getAdminMetrics,
  getCandidates,
  resolveBriefMatching,
  skillOverlapScore,
} from './matching.service.js';
import { buildRankReason, rankTopCandidates, scoreProfessional } from './matching.score.js';

function pro(
  partial: Partial<MatchingProRow> & { userId: string; displayName: string },
): MatchingProRow {
  return {
    categoryId: '22222222-2222-4222-8222-222222222222',
    avatarUrl: null,
    headlineMy: null,
    headlineEn: null,
    skills: [],
    minBudgetMmk: null,
    typicalTurnaroundDays: null,
    acceptingWork: true,
    partnerTier: false,
    completedCount: 0,
    declinedCount: 0,
    uniqueClients: 0,
    completionRatePct: null,
    medianResponseMins: null,
    ...partial,
  };
}

const actorId = 'b0000000-0000-4000-8000-000000000001';
const briefId = '11111111-1111-4111-8111-111111111111';
const categoryId = '22222222-2222-4222-8222-222222222222';

describe('matching scores', () => {
  it('scores skill overlap from requirements', () => {
    expect(skillOverlapScore(['logo', 'branding'], ['logo', 'packaging'])).toBe(
      0.5,
    );
  });

  it('zeros budget fit when pro floor exceeds brief max', () => {
    expect(budgetFitScore(100_000, 300_000, 500_000)).toBe(0);
    expect(budgetFitScore(100_000, 300_000, 200_000)).toBe(1);
  });

  it('ranks by fit and never uses interest order', () => {
    const a = scoreProfessional({
      professionalId: 'a',
      displayName: 'A',
      skills: ['logo'],
      portfolioCaptions: [],
      minBudgetMmk: 200_000,
      completionRatePct: 50,
      completedCount: 1,
      partnerTier: false,
      fromInterest: true,
      requirements: ['logo', 'branding'],
      budgetMin: 100_000,
      budgetMax: 400_000,
      briefText: 'logo',
    });
    const b = scoreProfessional({
      professionalId: 'b',
      displayName: 'B',
      skills: ['logo', 'branding'],
      portfolioCaptions: ['cafe logo'],
      minBudgetMmk: 150_000,
      completionRatePct: 90,
      completedCount: 5,
      partnerTier: false,
      fromInterest: true,
      requirements: ['logo', 'branding'],
      budgetMin: 100_000,
      budgetMax: 400_000,
      briefText: 'cafe logo',
    });
    const ranked = rankTopCandidates([a, b], 3);
    expect(ranked[0]?.professionalId).toBe('b');
    expect(buildRankReason(b.breakdown).length).toBeGreaterThan(0);
  });
});

describe('resolveBriefMatching', () => {
  beforeEach(() => {
    vi.mocked(repo.getBriefForMatching).mockReset();
    vi.mocked(repo.listApprovedProsInCategory).mockReset();
    vi.mocked(repo.listPartnerProsInCategory).mockReset();
    vi.mocked(repo.listProsByIds).mockReset();
    vi.mocked(repo.listInterestedProIds).mockReset();
    vi.mocked(repo.seedInterests).mockReset();
    vi.mocked(repo.replaceSurfacedCandidates).mockReset();
    vi.mocked(repo.markBriefRanked).mockReset();
    vi.mocked(repo.listPortfolioCaptions).mockResolvedValue(new Map());
  });

  it('seeds demo interests and stores score breakdown for top 3', async () => {
    vi.mocked(repo.getBriefForMatching).mockResolvedValue({
      id: briefId,
      clientId: actorId,
      title: 'Cafe logo',
      description: 'Need a logo',
      language: 'my',
      categoryId,
      categorySlug: 'graphic-design',
      requirements: ['logo'],
      budgetMinMmk: 100_000,
      budgetMaxMmk: 500_000,
      deadline: null,
      status: 'submitted',
      urgent: false,
      matchingMode: 'open_pool',
      interestOpensAt: new Date().toISOString(),
      interestClosesAt: new Date(Date.now() + 86_400_000).toISOString(),
      fallbackUsed: false,
      rankedAt: null,
    });
    const pros = [
      pro({
        userId: '33333333-3333-4333-8333-333333333331',
        displayName: 'A',
        skills: ['logo'],
        completionRatePct: 80,
        completedCount: 3,
        minBudgetMmk: 150_000,
      }),
      pro({
        userId: '33333333-3333-4333-8333-333333333332',
        displayName: 'B',
        skills: ['logo', 'branding'],
        completionRatePct: 90,
        completedCount: 5,
        minBudgetMmk: 150_000,
      }),
      pro({
        userId: '33333333-3333-4333-8333-333333333333',
        displayName: 'C',
        skills: ['logo'],
        completionRatePct: 70,
        completedCount: 2,
        minBudgetMmk: 180_000,
      }),
      pro({
        userId: '33333333-3333-4333-8333-333333333334',
        displayName: 'D',
        skills: ['poster'],
        completionRatePct: 60,
        completedCount: 1,
        minBudgetMmk: 100_000,
      }),
      pro({
        userId: '33333333-3333-4333-8333-333333333335',
        displayName: 'E',
        skills: ['logo'],
        completionRatePct: 55,
        completedCount: 1,
        minBudgetMmk: 120_000,
      }),
    ];
    vi.mocked(repo.listInterestedProIds).mockResolvedValue([]);
    vi.mocked(repo.listApprovedProsInCategory).mockResolvedValue(pros);
    vi.mocked(repo.listProsByIds).mockImplementation(async (ids) =>
      pros.filter((p) => ids.includes(p.userId)),
    );
    vi.mocked(repo.listPartnerProsInCategory).mockResolvedValue([]);

    await resolveBriefMatching(briefId);

    expect(repo.seedInterests).toHaveBeenCalled();
    expect(repo.replaceSurfacedCandidates).toHaveBeenCalled();
    const stored = vi.mocked(repo.replaceSurfacedCandidates).mock.calls[0]![1];
    expect(stored).toHaveLength(3);
    expect(stored[0]?.scoreBreakdown).toMatchObject({
      skillOverlap: expect.any(Number),
      portfolioRelevance: expect.any(Number),
      budgetFit: expect.any(Number),
      completionRate: expect.any(Number),
    });
    expect(stored[0]?.rankReason.length).toBeGreaterThan(0);
    expect(repo.markBriefRanked).toHaveBeenCalledWith(briefId, expect.any(Boolean));
  });
});

describe('expressInterest', () => {
  beforeEach(() => {
    vi.mocked(repo.getProfessionalProfileRow).mockReset();
    vi.mocked(repo.getBriefForMatching).mockReset();
    vi.mocked(repo.hasInterest).mockReset();
    vi.mocked(repo.countActiveInterests).mockReset();
    vi.mocked(repo.insertInterest).mockReset();
    vi.mocked(repo.countInterests).mockReset();
  });

  it('enforces the active interest cap of 10', async () => {
    vi.mocked(repo.getProfessionalProfileRow).mockResolvedValue({
      userId: 'a0000000-0000-4000-8000-000000000001',
      categoryId,
      skills: ['logo'],
    });
    vi.mocked(repo.getBriefForMatching).mockResolvedValue({
      id: briefId,
      clientId: actorId,
      title: 'Cafe logo',
      description: 'Need a logo',
      language: 'my',
      categoryId,
      categorySlug: 'graphic-design',
      requirements: ['logo'],
      budgetMinMmk: 100_000,
      budgetMaxMmk: 500_000,
      deadline: null,
      status: 'submitted',
      urgent: false,
      matchingMode: 'open_pool',
      interestOpensAt: new Date().toISOString(),
      interestClosesAt: new Date(Date.now() + 86_400_000).toISOString(),
      fallbackUsed: false,
      rankedAt: null,
    });
    vi.mocked(repo.hasInterest).mockResolvedValue(false);
    vi.mocked(repo.countActiveInterests).mockResolvedValue(10);

    await expect(
      expressInterest(briefId, 'a0000000-0000-4000-8000-000000000001'),
    ).rejects.toMatchObject({ code: 'INTEREST_CAP' });
  });
});

describe('getCandidates', () => {
  beforeEach(() => {
    vi.mocked(repo.getBriefForMatching).mockReset();
    vi.mocked(repo.listSurfacedCandidates).mockReset();
    vi.mocked(repo.listProsByIds).mockReset();
    vi.mocked(repo.countInterests).mockReset();
    vi.mocked(repo.listPortfolioThumbs).mockResolvedValue(new Map());
  });

  it('returns ready top-3 with showInterestCount only when N > 4', async () => {
    const rankedBrief = {
      id: briefId,
      clientId: actorId,
      title: 'Cafe logo',
      description: 'Need a logo',
      language: 'my' as const,
      categoryId,
      categorySlug: 'graphic-design',
      requirements: ['logo'],
      budgetMinMmk: 100_000,
      budgetMaxMmk: 500_000,
      deadline: null,
      status: 'submitted',
      urgent: false,
      matchingMode: 'open_pool' as const,
      interestOpensAt: new Date().toISOString(),
      interestClosesAt: new Date().toISOString(),
      fallbackUsed: false,
      rankedAt: new Date().toISOString(),
    };
    vi.mocked(repo.getBriefForMatching).mockResolvedValue(rankedBrief);
    vi.mocked(repo.countInterests).mockResolvedValue(5);
    vi.mocked(repo.listSurfacedCandidates).mockResolvedValue([
      {
        professionalId: '33333333-3333-4333-8333-333333333333',
        rank: 1,
        score: 0.9,
        scoreBreakdown: {
          skillOverlap: 1,
          portfolioRelevance: 0.5,
          budgetFit: 1,
          completionRate: 1,
        },
        rankReason: 'Strong skill overlap and budget fit.',
        guaranteedResponse: false,
        fromInterest: true,
        explanation: null,
      },
    ]);
    vi.mocked(repo.listProsByIds).mockResolvedValue([
      pro({
        userId: '33333333-3333-4333-8333-333333333333',
        displayName: 'Su',
        skills: ['logo'],
        completionRatePct: 100,
        completedCount: 4,
      }),
    ]);

    const result = await getCandidates(briefId, actorId);
    expect(result.status).toBe('ready');
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.rankReason).toContain('skill');
    expect(result.showInterestCount).toBe(true);
    expect(result.interestedCount).toBe(5);
  });

  it('hides interest count when N <= 4', async () => {
    vi.mocked(repo.getBriefForMatching).mockResolvedValue({
      id: briefId,
      clientId: actorId,
      title: 'Cafe logo',
      description: 'Need a logo',
      language: 'my',
      categoryId,
      categorySlug: 'graphic-design',
      requirements: ['logo'],
      budgetMinMmk: 100_000,
      budgetMaxMmk: 500_000,
      deadline: null,
      status: 'submitted',
      urgent: false,
      matchingMode: 'open_pool',
      interestOpensAt: new Date().toISOString(),
      interestClosesAt: new Date().toISOString(),
      fallbackUsed: false,
      rankedAt: new Date().toISOString(),
    });
    vi.mocked(repo.countInterests).mockResolvedValue(3);
    vi.mocked(repo.listSurfacedCandidates).mockResolvedValue([]);
    vi.mocked(repo.listProsByIds).mockResolvedValue([]);

    const result = await getCandidates(briefId, actorId);
    expect(result.showInterestCount).toBe(false);
  });
});

describe('getAdminMetrics', () => {
  it('computes fallback rate', async () => {
    vi.mocked(repo.adminMatchingMetrics).mockResolvedValue({
      briefsRanked: 10,
      briefsWithFallback: 4,
      briefsUrgent: 1,
      openPoolBriefs: 2,
    });
    const m = await getAdminMetrics();
    expect(m.fallbackRate).toBe(0.4);
  });
});

describe('getCandidateExplanation', () => {
  beforeEach(() => {
    vi.mocked(repo.getBriefForMatching).mockReset();
    vi.mocked(repo.getApprovedProById).mockReset();
    vi.mocked(repo.updateCandidateExplanation).mockReset();
    explainMatch.mockReset();
  });

  it('persists explanation onto surfaced candidate', async () => {
    vi.mocked(repo.getBriefForMatching).mockResolvedValue({
      id: briefId,
      clientId: actorId,
      title: 'Cafe logo',
      description: 'Need a logo',
      language: 'my',
      categoryId,
      categorySlug: 'graphic-design',
      requirements: ['logo'],
      budgetMinMmk: 100_000,
      budgetMaxMmk: 500_000,
      deadline: null,
      status: 'submitted',
      urgent: false,
      matchingMode: 'open_pool',
      interestOpensAt: null,
      interestClosesAt: null,
      fallbackUsed: false,
      rankedAt: new Date().toISOString(),
    });
    vi.mocked(repo.getApprovedProById).mockResolvedValue(
      pro({
        userId: '33333333-3333-4333-8333-333333333333',
        displayName: 'Su',
        skills: ['logo'],
        completionRatePct: 100,
        completedCount: 4,
      }),
    );
    explainMatch.mockResolvedValue({
      ok: true,
      explanation: 'ကိုက်ညီသော ဒီဇိုင်နာ ဖြစ်သည်။',
    });

    const result = await getCandidateExplanation(
      briefId,
      '33333333-3333-4333-8333-333333333333',
      'my',
      actorId,
    );
    expect(result.explanation).toContain('ကိုက်ညီ');
    expect(repo.updateCandidateExplanation).toHaveBeenCalled();
  });

  it('returns explanation null + busy notice when the provider rate-limits', async () => {
    vi.mocked(repo.getBriefForMatching).mockResolvedValue({
      id: briefId,
      clientId: actorId,
      title: 'Cafe logo',
      description: 'Need a logo',
      language: 'my',
      categoryId,
      categorySlug: 'graphic-design',
      requirements: ['logo'],
      budgetMinMmk: 100_000,
      budgetMaxMmk: 500_000,
      deadline: null,
      status: 'submitted',
      urgent: false,
      matchingMode: 'open_pool',
      interestOpensAt: null,
      interestClosesAt: null,
      fallbackUsed: false,
      rankedAt: new Date().toISOString(),
    });
    vi.mocked(repo.getApprovedProById).mockResolvedValue(
      pro({
        userId: '33333333-3333-4333-8333-333333333333',
        displayName: 'Su',
        skills: ['logo'],
        completionRatePct: 100,
        completedCount: 4,
      }),
    );
    explainMatch.mockResolvedValue({
      ok: false,
      retryable: true,
      explanation: null,
      errorKind: 'AI_RATE_LIMIT',
    });

    const result = await getCandidateExplanation(
      briefId,
      '33333333-3333-4333-8333-333333333333',
      'my',
      actorId,
    );
    expect(result.explanation).toBeNull();
    expect(result.retryable).toBe(true);
    expect(result.notice).toMatch(/busy/i);
    expect(repo.updateCandidateExplanation).not.toHaveBeenCalled();
  });
});

describe('getCandidates ignores LLM', () => {
  it('returns ranked pros with reputation and portfolio even when explanations would fail', async () => {
    explainMatch.mockReset();
    vi.mocked(repo.getBriefForMatching).mockReset();
    vi.mocked(repo.listSurfacedCandidates).mockReset();
    vi.mocked(repo.listProsByIds).mockReset();
    vi.mocked(repo.countInterests).mockReset();
    vi.mocked(repo.listPortfolioThumbs).mockReset();

    const proId1 = '33333333-3333-4333-8333-333333333331';
    const proId2 = '33333333-3333-4333-8333-333333333332';
    const proId3 = '33333333-3333-4333-8333-333333333333';
    const rankedBrief = {
      id: briefId,
      clientId: actorId,
      title: 'Cafe logo',
      description: 'Need a logo',
      language: 'my' as const,
      categoryId,
      categorySlug: 'graphic-design',
      requirements: ['logo'],
      budgetMinMmk: 100_000,
      budgetMaxMmk: 500_000,
      deadline: null,
      status: 'submitted',
      urgent: false,
      matchingMode: 'open_pool' as const,
      interestOpensAt: new Date().toISOString(),
      interestClosesAt: new Date().toISOString(),
      fallbackUsed: false,
      rankedAt: new Date().toISOString(),
    };
    vi.mocked(repo.getBriefForMatching).mockResolvedValue(rankedBrief);
    vi.mocked(repo.countInterests).mockResolvedValue(5);
    vi.mocked(repo.listSurfacedCandidates).mockResolvedValue(
      [proId1, proId2, proId3].map((id, i) => ({
        professionalId: id,
        rank: i + 1,
        score: 0.9 - i * 0.1,
        scoreBreakdown: {
          skillOverlap: 1,
          portfolioRelevance: 0.5,
          budgetFit: 1,
          completionRate: 1,
        },
        rankReason: 'Strong skill overlap and budget fit.',
        guaranteedResponse: false,
        fromInterest: true,
        // Even if DB has a prior explanation, list endpoint stays LLM-free.
        explanation: 'stale LLM text',
      })),
    );
    vi.mocked(repo.listProsByIds).mockResolvedValue([
      pro({
        userId: proId1,
        displayName: 'Su',
        skills: ['logo'],
        completionRatePct: 100,
        completedCount: 4,
        uniqueClients: 3,
      }),
      pro({
        userId: proId2,
        displayName: 'Aye',
        skills: ['branding'],
        completionRatePct: 90,
        completedCount: 8,
        uniqueClients: 5,
      }),
      pro({
        userId: proId3,
        displayName: 'Min',
        skills: ['illustration'],
        completionRatePct: 80,
        completedCount: 2,
        uniqueClients: 2,
      }),
    ]);
    vi.mocked(repo.listPortfolioThumbs).mockResolvedValue(
      new Map([
        [
          proId1,
          [
            {
              id: '44444444-4444-4444-8444-444444444441',
              professionalId: proId1,
              caption: 'Cafe mark',
              externalUrl: 'https://example.com/1.jpg',
              storagePath: null,
            },
          ],
        ],
        [
          proId2,
          [
            {
              id: '44444444-4444-4444-8444-444444444442',
              professionalId: proId2,
              caption: 'Menu',
              externalUrl: null,
              storagePath: 'portfolio/2.jpg',
            },
          ],
        ],
        [
          proId3,
          [
            {
              id: '44444444-4444-4444-8444-444444444443',
              professionalId: proId3,
              caption: null,
              externalUrl: 'https://example.com/3.jpg',
              storagePath: null,
            },
          ],
        ],
      ]),
    );

    // Provider forced to fail — must not affect the list.
    explainMatch.mockResolvedValue({
      ok: false,
      retryable: true,
      explanation: null,
      errorKind: 'AI_RATE_LIMIT',
    });

    const result = await getCandidates(briefId, actorId);
    expect(result.status).toBe('ready');
    expect(result.candidates).toHaveLength(3);
    expect(explainMatch).not.toHaveBeenCalled();
    for (const c of result.candidates) {
      expect(c.explanation).toBeNull();
      expect(c.reputation.completedCount).toBeGreaterThan(0);
      expect(c.portfolio.length).toBeGreaterThan(0);
    }
  });
});
