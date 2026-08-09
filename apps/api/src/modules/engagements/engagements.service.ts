import { normalizeToUnicode } from '@inyalink/burmese';
import {
  ENGAGEMENT_RESPOND_HOURS,
  EngagementInboxResponseSchema,
  EngagementListResponseSchema,
  EngagementSchema,
  type CreateEngagementInput,
  type DeclineEngagementInput,
  type Engagement,
  type EngagementInboxItem,
  type EngagementInboxResponse,
  type EngagementListResponse,
} from '@inyalink/shared';
import { AppError } from '../../middleware/errors.js';
import { backfillAfterDecline } from '../matching/matching.service.js';
import * as notifications from '../notifications/notifications.service.js';
import * as repo from './engagements.repo.js';

const EXPIRED_REASON = 'No response within 24 hours';

function secondsRemaining(respondBy: string | null): number | null {
  if (!respondBy) return null;
  const ms = new Date(respondBy).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return 0;
  return Math.floor(ms / 1000);
}

function toEngagement(row: repo.EngagementRow): Engagement {
  return EngagementSchema.parse({
    id: row.id,
    briefId: row.briefId,
    professionalId: row.professionalId,
    status: row.status,
    matchReason: row.matchReason,
    declineReason: row.declineReason,
    proposedAt: row.proposedAt,
    respondBy: row.respondBy,
    acceptedAt: row.acceptedAt,
    secondsRemaining:
      row.status === 'proposed' ? secondsRemaining(row.respondBy) : null,
  });
}

async function softDeclineExpired(row: repo.EngagementRow): Promise<void> {
  const updated = await repo.markDeclined(row.id, EXPIRED_REASON);
  if (!updated) return;
  await notifications.notifyEngagementDeclined({
    briefId: row.briefId,
    engagementId: row.id,
    professionalId: row.professionalId,
  });
  await backfillAfterDecline(row.briefId, row.professionalId);
}

/** Soft-decline any proposed engagement past respond_by, then backfill. */
export async function processExpiredForProfessional(
  professionalId: string,
): Promise<void> {
  const expired = await repo.listExpiredProposed(professionalId);
  for (const row of expired) {
    await softDeclineExpired(row);
  }
}

export async function createEngagement(
  input: CreateEngagementInput,
  clientId: string,
): Promise<Engagement> {
  const brief = await repo.getBriefOwner(input.briefId);
  if (!brief) {
    throw new AppError(404, 'BRIEF_NOT_FOUND', 'Brief not found');
  }
  if (brief.clientId !== clientId) {
    throw new AppError(403, 'FORBIDDEN', 'Not allowed to propose on this brief');
  }
  if (brief.status !== 'submitted' && brief.status !== 'matched') {
    throw new AppError(409, 'BRIEF_NOT_OPEN', 'Brief is not open for proposals');
  }

  const inTop3 = await repo.isSurfacedCandidate(
    input.briefId,
    input.professionalId,
  );
  if (!inTop3) {
    throw new AppError(
      400,
      'NOT_A_CANDIDATE',
      'Professional is not in the top-3 matches',
    );
  }

  const existing = (await repo.listByBrief(input.briefId)).find(
    (e) => e.professionalId === input.professionalId,
  );
  if (existing) {
    if (existing.status === 'proposed' || existing.status === 'accepted') {
      return toEngagement(existing);
    }
    throw new AppError(
      409,
      'ALREADY_ENGAGED',
      'An engagement already exists for this professional',
    );
  }

  const rankReason = await repo.getCandidateRankReason(
    input.briefId,
    input.professionalId,
  );
  const respondBy = new Date(
    Date.now() + ENGAGEMENT_RESPOND_HOURS * 60 * 60 * 1000,
  );

  const row = await repo.insertProposed({
    briefId: input.briefId,
    professionalId: input.professionalId,
    matchReason: rankReason,
    respondBy,
  });

  await notifications.notifyEngagementProposed({
    professionalId: row.professionalId,
    briefId: row.briefId,
    engagementId: row.id,
  });

  return toEngagement(row);
}

export async function listInbox(
  professionalId: string,
): Promise<EngagementInboxResponse> {
  await processExpiredForProfessional(professionalId);
  const rows = await repo.listProposedInbox(professionalId);
  const items: EngagementInboxItem[] = rows.map((row) => ({
    ...toEngagement(row),
    briefTitle: row.briefTitle,
    briefDescription: row.briefDescription,
    briefLanguage: row.briefLanguage,
    budgetMinMmk: row.budgetMinMmk,
    budgetMaxMmk: row.budgetMaxMmk,
    deadline: row.deadline,
    categorySlug: row.categorySlug,
  }));
  return EngagementInboxResponseSchema.parse({ items });
}

export async function listForBrief(
  briefId: string,
  actorId: string,
): Promise<EngagementListResponse> {
  const brief = await repo.getBriefOwner(briefId);
  if (!brief) {
    throw new AppError(404, 'BRIEF_NOT_FOUND', 'Brief not found');
  }
  if (brief.clientId !== actorId) {
    throw new AppError(403, 'FORBIDDEN', 'Not allowed to view these engagements');
  }

  // Expire any overdue proposals on this brief so the client sees backfill.
  const all = await repo.listByBrief(briefId);
  for (const row of all) {
    if (
      row.status === 'proposed' &&
      row.respondBy &&
      new Date(row.respondBy).getTime() < Date.now()
    ) {
      await softDeclineExpired(row);
    }
  }

  const fresh = await repo.listByBrief(briefId);
  return EngagementListResponseSchema.parse({
    engagements: fresh.map(toEngagement),
  });
}

export async function acceptEngagement(
  id: string,
  professionalId: string,
): Promise<Engagement> {
  await processExpiredForProfessional(professionalId);

  const row = await repo.getById(id);
  if (!row) {
    throw new AppError(404, 'NOT_FOUND', 'Engagement not found');
  }
  if (row.professionalId !== professionalId) {
    throw new AppError(403, 'FORBIDDEN', 'Not your engagement');
  }
  if (row.status !== 'proposed') {
    throw new AppError(409, 'NOT_PROPOSED', 'Engagement is not awaiting response');
  }
  if (row.respondBy && new Date(row.respondBy).getTime() < Date.now()) {
    await softDeclineExpired(row);
    throw new AppError(409, 'EXPIRED', 'Response window has closed');
  }

  const updated = await repo.markAccepted(id);
  if (!updated) {
    throw new AppError(409, 'NOT_PROPOSED', 'Engagement is not awaiting response');
  }
  await repo.markBriefMatched(updated.briefId);
  await notifications.notifyEngagementAccepted({
    briefId: updated.briefId,
    engagementId: updated.id,
    professionalId: updated.professionalId,
  });
  return toEngagement(updated);
}

export async function declineEngagement(
  id: string,
  professionalId: string,
  input: DeclineEngagementInput,
): Promise<Engagement> {
  await processExpiredForProfessional(professionalId);

  const row = await repo.getById(id);
  if (!row) {
    throw new AppError(404, 'NOT_FOUND', 'Engagement not found');
  }
  if (row.professionalId !== professionalId) {
    throw new AppError(403, 'FORBIDDEN', 'Not your engagement');
  }
  if (row.status !== 'proposed') {
    throw new AppError(409, 'NOT_PROPOSED', 'Engagement is not awaiting response');
  }
  if (row.respondBy && new Date(row.respondBy).getTime() < Date.now()) {
    await softDeclineExpired(row);
    throw new AppError(409, 'EXPIRED', 'Response window has closed');
  }

  const reason = normalizeToUnicode(input.reason.trim());
  const updated = await repo.markDeclined(id, reason);
  if (!updated) {
    throw new AppError(409, 'NOT_PROPOSED', 'Engagement is not awaiting response');
  }

  await notifications.notifyEngagementDeclined({
    briefId: updated.briefId,
    engagementId: updated.id,
    professionalId: updated.professionalId,
  });
  await backfillAfterDecline(updated.briefId, updated.professionalId);
  return toEngagement(updated);
}
