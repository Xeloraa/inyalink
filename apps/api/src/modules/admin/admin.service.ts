import { normalizeToUnicode } from '@inyalink/burmese';
import {
  AdminAssignBriefResponseSchema,
  AdminBriefsListResponseSchema,
  AdminDashboardResponseSchema,
  AdminEngagementsListResponseSchema,
  AdminOpsMetricsResponseSchema,
  AdminPendingProfessionalsResponseSchema,
  AdminPatchEngagementStatusResponseSchema,
  AdminReviewProfessionalResponseSchema,
  ENGAGEMENT_RESPOND_HOURS,
  type AdminAssignBriefInput,
  type AdminAssignBriefResponse,
  type AdminBriefsListQuery,
  type AdminBriefsListResponse,
  type AdminDashboardResponse,
  type AdminEngagementsListQuery,
  type AdminEngagementsListResponse,
  type AdminOpsMetricsResponse,
  type AdminPatchEngagementStatusInput,
  type AdminPatchEngagementStatusResponse,
  type AdminPendingProfessionalsResponse,
  type AdminReviewProfessionalInput,
  type AdminReviewProfessionalResponse,
  type BriefStatus,
  type EngagementStatus,
} from '@inyalink/shared';
import { AppError } from '../../middleware/errors.js';
import * as notifications from '../notifications/notifications.service.js';
import * as repo from './admin.repo.js';

function rate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.min(1, Math.max(0, numerator / denominator));
}

function hoursSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return 0;
  return ms / (1000 * 60 * 60);
}

function stallInfo(row: repo.EngagementListRow): {
  stalled: boolean;
  stallReason: 'past_respond_by' | 'in_progress_over_30d' | null;
  hoursInState: number;
} {
  const hoursInState = hoursSince(row.updatedAt);
  if (
    row.status === 'proposed' &&
    row.respondBy &&
    new Date(row.respondBy).getTime() < Date.now()
  ) {
    return { stalled: true, stallReason: 'past_respond_by', hoursInState };
  }
  if (row.status === 'in_progress') {
    const start = row.acceptedAt ?? row.updatedAt;
    const hours = hoursSince(start);
    if (hours > 30 * 24) {
      return {
        stalled: true,
        stallReason: 'in_progress_over_30d',
        hoursInState: hours,
      };
    }
  }
  return { stalled: false, stallReason: null, hoursInState };
}

export async function getDashboard(): Promise<AdminDashboardResponse> {
  const [pending, open, active, aiCost, fallback] = await Promise.all([
    repo.countPendingProfessionals(),
    repo.countOpenBriefs(),
    repo.countActiveEngagements(),
    repo.sumAiCostThisWeek(),
    repo.fallbackStats(),
  ]);
  return AdminDashboardResponseSchema.parse({
    pendingProfessionals: pending,
    openBriefs: open,
    activeEngagements: active,
    fallbackRate: rate(fallback.briefsWithFallback, fallback.briefsRanked),
    aiCostUsdThisWeek: aiCost,
  });
}

export async function listPendingProfessionals(): Promise<AdminPendingProfessionalsResponse> {
  const pending = await repo.listPendingProfessionals();
  const ids = pending.map((p) => p.userId);
  const [portfolioMap, workLinkMap] = await Promise.all([
    repo.listPortfolioForPros(ids),
    repo.listWorkLinksForPros(ids),
  ]);
  return AdminPendingProfessionalsResponseSchema.parse({
    items: pending.map((p) => ({
      userId: p.userId,
      displayName: p.displayName,
      categorySlug: p.categorySlug,
      categoryNameEn: p.categoryNameEn,
      categoryNameMy: p.categoryNameMy,
      categoryOtherText: p.categoryOtherText,
      skills: p.skills,
      bioMy: p.bioMy,
      bioEn: p.bioEn,
      headlineMy: p.headlineMy,
      headlineEn: p.headlineEn,
      cvUrl: p.cvUrl,
      reviewNote: p.reviewNote,
      createdAt: p.createdAt,
      portfolio: (portfolioMap.get(p.userId) ?? []).map((item) => ({
        id: item.id,
        caption: item.caption,
        externalUrl: item.externalUrl,
        storagePath: item.storagePath,
        sort: item.sort,
      })),
      workLinks: (workLinkMap.get(p.userId) ?? []).map((link) => ({
        id: link.id,
        platform: link.platform,
        url: link.url,
        label: link.label,
        sort: link.sort,
        verifiedAt: link.verifiedAt,
      })),
    })),
  });
}

export async function reviewProfessional(
  professionalId: string,
  input: AdminReviewProfessionalInput,
  actorId: string,
): Promise<AdminReviewProfessionalResponse> {
  const current = await repo.getProfessionalStatus(professionalId);
  if (!current) {
    throw new AppError(404, 'NOT_FOUND', 'Professional not found');
  }
  if (current !== 'pending') {
    throw new AppError(409, 'NOT_PENDING', 'Application is not pending review');
  }

  const reason = input.reason
    ? normalizeToUnicode(input.reason.trim()).slice(0, 500)
    : null;

  if (
    (input.action === 'reject' || input.action === 'request_info') &&
    !reason
  ) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      input.action === 'reject'
        ? 'Reason required to reject'
        : 'Note required when requesting more info',
    );
  }

  let status: 'pending' | 'approved' | 'rejected';
  let reviewNote: string | null;
  if (input.action === 'approve') {
    status = 'approved';
    reviewNote = reason;
  } else if (input.action === 'reject') {
    status = 'rejected';
    reviewNote = reason;
  } else {
    status = 'pending';
    reviewNote = reason;
  }

  const updated = await repo.reviewProfessional({
    userId: professionalId,
    status,
    reviewNote,
    reviewedBy: actorId,
  });

  await repo.insertAuditLog({
    actorId,
    action: `professional.${input.action}`,
    entityType: 'professional',
    entityId: professionalId,
    metadata: { status: updated.status, reason: reviewNote },
  });

  if (input.action === 'approve' || input.action === 'reject') {
    await notifications.notifyApplicationReviewed({
      professionalId,
      approved: input.action === 'approve',
    });
  }

  return AdminReviewProfessionalResponseSchema.parse(updated);
}

export async function listBriefs(
  query: AdminBriefsListQuery,
): Promise<AdminBriefsListResponse> {
  const briefs = await repo.listBriefs(query.status as BriefStatus | undefined);
  const surfacedMap = await repo.listSurfacedForBriefs(briefs.map((b) => b.id));
  return AdminBriefsListResponseSchema.parse({
    items: briefs.map((b) => ({
      id: b.id,
      status: b.status,
      title: b.title,
      categorySlug: b.categorySlug,
      clientId: b.clientId,
      clientDisplayName: b.clientDisplayName,
      interestCount: b.interestCount,
      fallbackUsed: b.fallbackUsed,
      createdAt: b.createdAt,
      rankedAt: b.rankedAt,
      surfaced: (surfacedMap.get(b.id) ?? []).map((s) => ({
        professionalId: s.professionalId,
        displayName: s.displayName,
        rank: s.rank,
        score: s.score,
        fromInterest: s.fromInterest,
        guaranteedResponse: s.guaranteedResponse,
      })),
    })),
  });
}

export async function assignBrief(
  briefId: string,
  input: AdminAssignBriefInput,
  actorId: string,
): Promise<AdminAssignBriefResponse> {
  const brief = await repo.getBriefForAssign(briefId);
  if (!brief) {
    throw new AppError(404, 'BRIEF_NOT_FOUND', 'Brief not found');
  }
  if (brief.status === 'closed' || brief.status === 'cancelled') {
    throw new AppError(409, 'BRIEF_CLOSED', 'Brief is closed');
  }
  if (brief.status === 'draft') {
    throw new AppError(409, 'BRIEF_DRAFT', 'Submit the brief before assigning');
  }

  const approved = await repo.isApprovedProfessional(input.professionalId);
  if (!approved) {
    throw new AppError(
      400,
      'PRO_NOT_APPROVED',
      'Professional must be approved',
    );
  }

  const existing = await repo.findEngagement(briefId, input.professionalId);
  if (existing) {
    throw new AppError(
      409,
      'ALREADY_ENGAGED',
      'Engagement already exists for this pair',
    );
  }

  const matchReason = normalizeToUnicode(
    (input.matchReason ?? 'Manual admin assignment').trim(),
  ).slice(0, 400);

  const respondBy = new Date(
    Date.now() + ENGAGEMENT_RESPOND_HOURS * 60 * 60 * 1000,
  );

  const engagement = await repo.insertAdminAssignment({
    briefId,
    professionalId: input.professionalId,
    matchReason,
    matchedBy: actorId,
    respondBy,
  });

  await repo.markBriefMatched(briefId);

  await notifications.notifyEngagementProposed({
    professionalId: input.professionalId,
    briefId,
    engagementId: engagement.id,
  });

  await repo.insertAuditLog({
    actorId,
    action: 'brief.assign',
    entityType: 'brief',
    entityId: briefId,
    metadata: {
      engagementId: engagement.id,
      professionalId: input.professionalId,
      matchReason,
    },
  });

  return AdminAssignBriefResponseSchema.parse({
    engagementId: engagement.id,
    briefId,
    professionalId: input.professionalId,
    status: engagement.status,
  });
}

export async function listEngagements(
  query: AdminEngagementsListQuery,
): Promise<AdminEngagementsListResponse> {
  const rows = await repo.listEngagements(
    query.status as EngagementStatus | undefined,
  );
  return AdminEngagementsListResponseSchema.parse({
    items: rows.map((row) => {
      const stall = stallInfo(row);
      return {
        id: row.id,
        briefId: row.briefId,
        briefTitle: row.briefTitle,
        professionalId: row.professionalId,
        professionalDisplayName: row.professionalDisplayName,
        clientId: row.clientId,
        clientDisplayName: row.clientDisplayName,
        status: row.status,
        proposedAt: row.proposedAt,
        respondBy: row.respondBy,
        updatedAt: row.updatedAt,
        hoursInState: Math.round(stall.hoursInState * 10) / 10,
        stalled: stall.stalled,
        stallReason: stall.stallReason,
      };
    }),
  });
}

export async function patchEngagementStatus(
  engagementId: string,
  input: AdminPatchEngagementStatusInput,
  actorId: string,
): Promise<AdminPatchEngagementStatusResponse> {
  const existing = await repo.getEngagementById(engagementId);
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Engagement not found');
  }

  const updated = await repo.patchEngagementStatus({
    id: engagementId,
    status: input.status,
  });

  const note = input.note
    ? normalizeToUnicode(input.note.trim()).slice(0, 500)
    : null;

  await repo.insertAuditLog({
    actorId,
    action: 'engagement.status_change',
    entityType: 'engagement',
    entityId: engagementId,
    metadata: {
      from: existing.status,
      to: updated.status,
      note,
    },
  });

  return AdminPatchEngagementStatusResponseSchema.parse(updated);
}

export async function getOpsMetrics(): Promise<AdminOpsMetricsResponse> {
  const [counts, aiCost, fallback] = await Promise.all([
    repo.opsMetricsCounts(),
    repo.sumAiCostThisWeek(),
    repo.fallbackStats(),
  ]);

  return AdminOpsMetricsResponseSchema.parse({
    briefsCreated: counts.briefsCreated,
    matchRate: rate(counts.briefsMatched, counts.briefsCreated),
    completionRate: rate(
      counts.engagementsConfirmed,
      counts.engagementsStarted,
    ),
    clientRepeatRate: rate(
      counts.clientsWithRepeatConfirmed,
      counts.clientsWithConfirmed,
    ),
    aiCostUsdThisWeek: aiCost,
    fallbackRate: rate(fallback.briefsWithFallback, fallback.briefsRanked),
    briefsRanked: fallback.briefsRanked,
    briefsWithFallback: fallback.briefsWithFallback,
  });
}

/** @deprecated Prefer getOpsMetrics — kept for matching-era callers. */
export async function getMetrics(): Promise<AdminOpsMetricsResponse> {
  return getOpsMetrics();
}

/** Exported for unit tests. */
export const _test = { rate, stallInfo, hoursSince };
