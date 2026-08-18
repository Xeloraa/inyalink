import {
  ACTIVE_INTEREST_CAP,
  AdminMetricsResponseSchema,
  BriefInterestResponseSchema,
  MatchingCandidatesResponseSchema,
  MatchingFeedResponseSchema,
  type AdminMetricsResponse,
  type BriefInterestResponse,
  type MatchingCandidatesResponse,
  type MatchingFeedResponse,
  type TextLanguage,
} from '@inyalink/shared';
import { config } from '../../lib/config.js';
import { AppError } from '../../middleware/errors.js';
import * as notifications from '../notifications/notifications.service.js';
import * as repo from './matching.repo.js';
import type { MatchingProRow } from './matching.repo.js';
import {
  rankTopCandidates,
  scoreProfessional,
  skillOverlapScore,
  type ScoredPro,
} from './matching.score.js';

function briefText(brief: {
  title: string | null;
  description: string | null;
}): string {
  return `${brief.title ?? ''} ${brief.description ?? ''}`.trim();
}

function scorePool(
  pros: MatchingProRow[],
  brief: {
    requirements: string[];
    budgetMinMmk: number | null;
    budgetMaxMmk: number | null;
    title: string | null;
    description: string | null;
  },
  captions: Map<string, string[]>,
  fromInterestIds: Set<string>,
): ScoredPro[] {
  const text = briefText(brief);
  return pros.map((pro) =>
    scoreProfessional({
      professionalId: pro.userId,
      displayName: pro.displayName,
      skills: pro.skills,
      portfolioCaptions: captions.get(pro.userId) ?? [],
      minBudgetMmk: pro.minBudgetMmk,
      completionRatePct: pro.completionRatePct,
      completedCount: pro.completedCount,
      partnerTier: pro.partnerTier,
      fromInterest: fromInterestIds.has(pro.userId),
      requirements: brief.requirements,
      budgetMin: brief.budgetMinMmk,
      budgetMax: brief.budgetMaxMmk,
      briefText: text,
    }),
  );
}

/**
 * Rank and persist top-3. Uses interested pros for open_pool; partner pool
 * for partner_direct / fallback fill. Never ranks on interest speed.
 */
export async function resolveBriefMatching(briefId: string): Promise<void> {
  const brief = await repo.getBriefForMatching(briefId);
  if (!brief?.categoryId) {
    throw new AppError(
      400,
      'BRIEF_NOT_READY',
      'Brief needs a category before matching',
    );
  }
  if (brief.rankedAt) return;

  const interestedIds = await repo.listInterestedProIds(briefId);
  const fromInterest = new Set(interestedIds);
  let fallbackUsed = false;
  let pool: MatchingProRow[] = [];

  if (brief.matchingMode === 'partner_direct' || brief.urgent) {
    pool = await repo.listPartnerProsInCategory(brief.categoryId);
    if (pool.length === 0) {
      // Last resort: any approved pro in category so demo never empties.
      pool = await repo.listApprovedProsInCategory(brief.categoryId);
      fallbackUsed = true;
    }
  } else {
    // DEMO_SEED_INTERESTS: seed ≥5 interests so stage always resolves with N > 4.
    if (config.demoSeedInterests && interestedIds.length < 5) {
      const all = await repo.listApprovedProsInCategory(brief.categoryId);
      const need = all
        .map((p) => p.userId)
        .filter((id) => !fromInterest.has(id))
        .slice(0, 5 - interestedIds.length);
      await repo.seedInterests(briefId, need);
      for (const id of need) fromInterest.add(id);
      interestedIds.push(...need);
    }

    pool = await repo.listProsByIds(interestedIds);

    if (pool.length < 3) {
      const partners = await repo.listPartnerProsInCategory(brief.categoryId);
      const have = new Set(pool.map((p) => p.userId));
      for (const p of partners) {
        if (have.has(p.userId)) continue;
        pool.push(p);
        have.add(p.userId);
        if (pool.length >= 3) break;
      }
      if (pool.length > interestedIds.length) fallbackUsed = true;
    }

    // Still short (no partners): fill from category approved.
    if (pool.length < 3) {
      const all = await repo.listApprovedProsInCategory(brief.categoryId);
      const have = new Set(pool.map((p) => p.userId));
      for (const p of all) {
        if (have.has(p.userId)) continue;
        pool.push(p);
        have.add(p.userId);
        fallbackUsed = true;
        if (pool.length >= 3) break;
      }
    }
  }

  const captions = await repo.listPortfolioCaptions(pool.map((p) => p.userId));
  const scored = scorePool(pool, brief, captions, fromInterest);
  const top = rankTopCandidates(scored, 3);

  await repo.replaceSurfacedCandidates(
    briefId,
    top.map((item, i) => ({
      professionalId: item.professionalId,
      rank: i + 1,
      score: Number(item.score.toFixed(4)),
      scoreBreakdown: {
        skillOverlap: Number(item.breakdown.skillOverlap.toFixed(4)),
        portfolioRelevance: Number(item.breakdown.portfolioRelevance.toFixed(4)),
        budgetFit: Number(item.breakdown.budgetFit.toFixed(4)),
        completionRate: Number(item.breakdown.completionRate.toFixed(4)),
      },
      rankReason: item.rankReason,
      guaranteedResponse:
        item.partnerTier &&
        (brief.matchingMode === 'partner_direct' ||
          brief.urgent ||
          !item.fromInterest),
      fromInterest: item.fromInterest,
    })),
  );
  await repo.markBriefRanked(briefId, fallbackUsed);
  await notifications.notifyTop3Match({
    briefId,
    professionalIds: top.map((item) => item.professionalId),
  });
}

/**
 * After a top-3 professional declines or expires: drop them from the
 * surfaced set, pull the next-best interested pro(s) not already shown,
 * and re-rank 1–3. Never exposes the full pool.
 */
export async function backfillAfterDecline(
  briefId: string,
  declinedProfessionalId: string,
): Promise<void> {
  const brief = await repo.getBriefForMatching(briefId);
  if (!brief?.categoryId || !brief.rankedAt) return;

  const surfaced = await repo.listSurfacedCandidates(briefId);
  const previousIds = surfaced.map((s) => s.professionalId);
  const remainingIds = previousIds.filter(
    (id) => id !== declinedProfessionalId,
  );

  const interestedIds = await repo.listInterestedProIds(briefId);
  const terminal = new Set(await repo.listTerminalEngagementProIds(briefId));
  terminal.add(declinedProfessionalId);

  const fromInterest = new Set(interestedIds);
  const fillCandidates = interestedIds.filter(
    (id) => !remainingIds.includes(id) && !terminal.has(id),
  );

  const need = Math.max(0, 3 - remainingIds.length);
  let fillIds: string[] = [];
  if (need > 0 && fillCandidates.length > 0) {
    const fillPool = await repo.listProsByIds(fillCandidates);
    const fillCaptions = await repo.listPortfolioCaptions(
      fillPool.map((p) => p.userId),
    );
    const scoredFill = scorePool(fillPool, brief, fillCaptions, fromInterest);
    fillIds = rankTopCandidates(scoredFill, need).map((s) => s.professionalId);
  }

  const poolIds = [...remainingIds, ...fillIds];
  if (poolIds.length === 0) {
    await repo.replaceSurfacedCandidates(briefId, []);
    return;
  }

  const pool = await repo.listProsByIds(poolIds);
  const captions = await repo.listPortfolioCaptions(pool.map((p) => p.userId));
  const scored = scorePool(pool, brief, captions, fromInterest);
  const top = rankTopCandidates(scored, 3);

  await repo.replaceSurfacedCandidates(
    briefId,
    top.map((item, i) => ({
      professionalId: item.professionalId,
      rank: i + 1,
      score: Number(item.score.toFixed(4)),
      scoreBreakdown: {
        skillOverlap: Number(item.breakdown.skillOverlap.toFixed(4)),
        portfolioRelevance: Number(item.breakdown.portfolioRelevance.toFixed(4)),
        budgetFit: Number(item.breakdown.budgetFit.toFixed(4)),
        completionRate: Number(item.breakdown.completionRate.toFixed(4)),
      },
      rankReason: item.rankReason,
      guaranteedResponse: false,
      fromInterest: item.fromInterest,
    })),
  );
  await notifications.notifyTop3Match({
    briefId,
    professionalIds: top.map((item) => item.professionalId),
    previousProfessionalIds: previousIds,
  });
}

async function maybeEarlyClose(briefId: string): Promise<void> {
  const brief = await repo.getBriefForMatching(briefId);
  if (!brief || brief.rankedAt) return;
  if (brief.matchingMode === 'partner_direct') {
    await resolveBriefMatching(briefId);
    return;
  }
  const count = await repo.countInterests(briefId);
  const closesAt = brief.interestClosesAt
    ? new Date(brief.interestClosesAt).getTime()
    : null;
  const windowClosed = closesAt !== null && Date.now() >= closesAt;
  if (count >= 3 || windowClosed || config.demoSeedInterests) {
    await resolveBriefMatching(briefId);
  }
}

export async function expressInterest(
  briefId: string,
  professionalId: string,
): Promise<BriefInterestResponse> {
  const pro = await repo.getProfessionalProfileRow(professionalId);
  if (!pro) {
    throw new AppError(403, 'FORBIDDEN', 'Approved professional required');
  }
  const brief = await repo.getBriefForMatching(briefId);
  if (!brief) {
    throw new AppError(404, 'BRIEF_NOT_FOUND', 'Brief not found');
  }
  if (brief.status !== 'submitted' || brief.matchingMode !== 'open_pool') {
    throw new AppError(409, 'BRIEF_NOT_OPEN', 'Brief is not open for interest');
  }
  if (brief.rankedAt) {
    throw new AppError(409, 'BRIEF_ALREADY_RANKED', 'Matching already closed');
  }
  if (brief.categoryId !== pro.categoryId) {
    throw new AppError(
      400,
      'CATEGORY_MISMATCH',
      'Brief is not in your category',
    );
  }

  const already = await repo.hasInterest(briefId, professionalId);
  if (!already) {
    const active = await repo.countActiveInterests(professionalId);
    if (active >= ACTIVE_INTEREST_CAP) {
      throw new AppError(
        409,
        'INTEREST_CAP',
        `Active interest limit is ${ACTIVE_INTEREST_CAP}`,
      );
    }
    await repo.insertInterest(briefId, professionalId);
  }

  await maybeEarlyClose(briefId);

  const activeCount = await repo.countActiveInterests(professionalId);
  return BriefInterestResponseSchema.parse({
    briefId,
    professionalId,
    interested: true,
    activeCount,
    remaining: Math.max(0, ACTIVE_INTEREST_CAP - activeCount),
    cap: ACTIVE_INTEREST_CAP,
  });
}

export async function withdrawInterest(
  briefId: string,
  professionalId: string,
): Promise<BriefInterestResponse> {
  await repo.deleteInterest(briefId, professionalId);
  const activeCount = await repo.countActiveInterests(professionalId);
  return BriefInterestResponseSchema.parse({
    briefId,
    professionalId,
    interested: false,
    activeCount,
    remaining: Math.max(0, ACTIVE_INTEREST_CAP - activeCount),
    cap: ACTIVE_INTEREST_CAP,
  });
}

export async function getMyInterest(
  briefId: string,
  professionalId: string,
): Promise<BriefInterestResponse> {
  const interested = await repo.hasInterest(briefId, professionalId);
  const activeCount = await repo.countActiveInterests(professionalId);
  return BriefInterestResponseSchema.parse({
    briefId,
    professionalId,
    interested,
    activeCount,
    remaining: Math.max(0, ACTIVE_INTEREST_CAP - activeCount),
    cap: ACTIVE_INTEREST_CAP,
  });
}

export async function getFeed(
  professionalId: string,
): Promise<MatchingFeedResponse> {
  const pro = await repo.getProfessionalProfileRow(professionalId);
  if (!pro) {
    throw new AppError(403, 'FORBIDDEN', 'Approved professional required');
  }
  const items = await repo.listOpenFeedForCategory(
    pro.categoryId,
    professionalId,
  );
  const activeCount = await repo.countActiveInterests(professionalId);
  return MatchingFeedResponseSchema.parse({
    items: items.map((item) => ({
      briefId: item.briefId,
      title: item.title,
      description: item.description,
      categorySlug: item.categorySlug,
      language: item.language,
      budgetMinMmk: item.budgetMinMmk,
      budgetMaxMmk: item.budgetMaxMmk,
      deadline: item.deadline,
      interestClosesAt: item.interestClosesAt,
      requirements: item.requirements,
      alreadyInterested: item.alreadyInterested,
      skillOverlapHint: Number(
        skillOverlapScore(item.requirements, pro.skills).toFixed(4),
      ),
    })),
    activeInterestCount: activeCount,
    remaining: Math.max(0, ACTIVE_INTEREST_CAP - activeCount),
    cap: ACTIVE_INTEREST_CAP,
  });
}

async function hydrateCandidates(
  briefId: string,
  language: TextLanguage | null,
  interestedCount: number,
  fallbackUsed: boolean,
  matchingMode: 'open_pool' | 'partner_direct' | null,
  interestClosesAt: string | null,
): Promise<MatchingCandidatesResponse> {
  const surfaced = await repo.listSurfacedCandidates(briefId);
  const pros = await repo.listProsByIds(surfaced.map((s) => s.professionalId));
  const byId = new Map(pros.map((p) => [p.userId, p]));
  let thumbs = new Map<
    string,
    Array<{
      id: string;
      caption: string | null;
      externalUrl: string | null;
      storagePath: string | null;
    }>
  >();
  try {
    thumbs = await repo.listPortfolioThumbs(
      surfaced.map((s) => s.professionalId),
      3,
    );
  } catch (err) {
    console.error('listPortfolioThumbs failed; continuing without thumbs', err);
  }

  const candidates = surfaced.flatMap((s) => {
    const pro = byId.get(s.professionalId);
    if (!pro) return [];
    return [
      {
        professionalId: pro.userId,
        displayName: pro.displayName,
        avatarUrl: pro.avatarUrl,
        headlineMy: pro.headlineMy,
        headlineEn: pro.headlineEn,
        skills: pro.skills,
        rank: s.rank,
        score: s.score,
        scoreBreakdown: s.scoreBreakdown,
        rankReason: s.rankReason,
        guaranteedResponse: s.guaranteedResponse,
        // List path is LLM-free. Explanations come from the separate endpoint.
        explanation: null,
        reputation: {
          completedCount: pro.completedCount,
          declinedCount: pro.declinedCount,
          uniqueClients: pro.uniqueClients,
          completionRatePct: pro.completionRatePct,
          medianResponseMins: pro.medianResponseMins,
        },
        portfolio: (thumbs.get(pro.userId) ?? []).map((p) => ({
          id: p.id,
          caption: p.caption,
          externalUrl: p.externalUrl,
          storagePath: p.storagePath,
        })),
      },
    ];
  });

  return MatchingCandidatesResponseSchema.parse({
    briefId,
    language,
    status: 'ready',
    interestedCount,
    showInterestCount: interestedCount > 4,
    fallbackUsed,
    matchingMode,
    interestClosesAt,
    candidates,
  });
}

/**
 * Client-facing candidates. Lazily closes the window when due.
 * Never returns more than 3. Never exposes the full interested pool.
 */
export async function getCandidates(
  briefId: string,
  actorId: string,
): Promise<MatchingCandidatesResponse> {
  const brief = await repo.getBriefForMatching(briefId);
  if (!brief) {
    throw new AppError(404, 'BRIEF_NOT_FOUND', 'Brief not found');
  }
  if (brief.clientId !== actorId) {
    throw new AppError(403, 'FORBIDDEN', 'Not allowed to access this brief');
  }
  if (!brief.categoryId) {
    throw new AppError(
      400,
      'BRIEF_NOT_READY',
      'Brief needs a category before matching',
    );
  }

  if (!brief.rankedAt) {
    await maybeEarlyClose(briefId);
  }

  const fresh = await repo.getBriefForMatching(briefId);
  if (!fresh) {
    throw new AppError(404, 'BRIEF_NOT_FOUND', 'Brief not found');
  }

  const interestedCount = await repo.countInterests(briefId);

  if (!fresh.rankedAt) {
    return MatchingCandidatesResponseSchema.parse({
      briefId: fresh.id,
      language: fresh.language,
      status: 'waiting',
      interestedCount,
      showInterestCount: interestedCount > 4,
      fallbackUsed: false,
      matchingMode: fresh.matchingMode,
      interestClosesAt: fresh.interestClosesAt,
      candidates: [],
    });
  }

  return hydrateCandidates(
    briefId,
    fresh.language,
    interestedCount,
    fresh.fallbackUsed,
    fresh.matchingMode,
    fresh.interestClosesAt,
  );
}

export async function getAdminMetrics(): Promise<AdminMetricsResponse> {
  const m = await repo.adminMatchingMetrics();
  const fallbackRate =
    m.briefsRanked === 0 ? 0 : m.briefsWithFallback / m.briefsRanked;
  return AdminMetricsResponseSchema.parse({
    briefsRanked: m.briefsRanked,
    briefsWithFallback: m.briefsWithFallback,
    fallbackRate: Number(fallbackRate.toFixed(4)),
    briefsUrgent: m.briefsUrgent,
    openPoolBriefs: m.openPoolBriefs,
  });
}

// Re-export score helpers for tests
export {
  budgetFitScore,
  rankTopCandidates,
  skillOverlapScore,
} from './matching.score.js';
