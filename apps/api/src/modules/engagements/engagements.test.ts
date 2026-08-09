import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as matchingService from '../matching/matching.service.js';
import * as repo from './engagements.repo.js';
import * as service from './engagements.service.js';

vi.mock('./engagements.repo.js', () => ({
  isSurfacedCandidate: vi.fn(),
  getBriefOwner: vi.fn(),
  insertProposed: vi.fn(),
  getById: vi.fn(),
  listByBrief: vi.fn(),
  listProposedInbox: vi.fn(),
  listExpiredProposed: vi.fn(),
  markAccepted: vi.fn(),
  markDeclined: vi.fn(),
  markBriefMatched: vi.fn(),
  getCandidateRankReason: vi.fn(),
}));

vi.mock('../matching/matching.service.js', () => ({
  backfillAfterDecline: vi.fn(async () => undefined),
}));

vi.mock('../notifications/notifications.service.js', () => ({
  notifyEngagementProposed: vi.fn(async () => undefined),
  notifyEngagementAccepted: vi.fn(async () => undefined),
  notifyEngagementDeclined: vi.fn(async () => undefined),
}));

vi.mock('@inyalink/burmese', () => ({
  normalizeToUnicode: (text: string) => text,
}));

const BRIEF_ID = 'c0000000-0000-4000-8000-000000000001';
const CLIENT_ID = 'b0000000-0000-4000-8000-000000000001';
const PRO_ID = 'a0000000-0000-4000-8000-000000000001';
const ENG_ID = 'e0000000-0000-4000-8000-000000000001';

function proposedRow(
  overrides: Partial<repo.EngagementRow> = {},
): repo.EngagementRow {
  const respondBy = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  return {
    id: ENG_ID,
    briefId: BRIEF_ID,
    professionalId: PRO_ID,
    status: 'proposed',
    matchReason: 'Strong skill overlap.',
    declineReason: null,
    proposedAt: new Date().toISOString(),
    respondBy,
    acceptedAt: null,
    ...overrides,
  };
}

describe('engagements.service', () => {
  beforeEach(() => {
    vi.mocked(repo.isSurfacedCandidate).mockReset();
    vi.mocked(repo.getBriefOwner).mockReset();
    vi.mocked(repo.insertProposed).mockReset();
    vi.mocked(repo.getById).mockReset();
    vi.mocked(repo.listByBrief).mockReset();
    vi.mocked(repo.listProposedInbox).mockReset();
    vi.mocked(repo.listExpiredProposed).mockReset().mockResolvedValue([]);
    vi.mocked(repo.markAccepted).mockReset();
    vi.mocked(repo.markDeclined).mockReset();
    vi.mocked(repo.markBriefMatched).mockReset();
    vi.mocked(repo.getCandidateRankReason).mockReset();
    vi.mocked(matchingService.backfillAfterDecline).mockReset();
  });

  it('creates a proposed engagement with a 24h respond_by for a top-3 pro', async () => {
    vi.mocked(repo.getBriefOwner).mockResolvedValue({
      clientId: CLIENT_ID,
      status: 'submitted',
    });
    vi.mocked(repo.isSurfacedCandidate).mockResolvedValue(true);
    vi.mocked(repo.listByBrief).mockResolvedValue([]);
    vi.mocked(repo.getCandidateRankReason).mockResolvedValue(
      'Strong skill overlap.',
    );
    const respondBy = new Date(Date.now() + 24 * 60 * 60 * 1000);
    vi.mocked(repo.insertProposed).mockResolvedValue(
      proposedRow({ respondBy: respondBy.toISOString() }),
    );

    const result = await service.createEngagement(
      { briefId: BRIEF_ID, professionalId: PRO_ID },
      CLIENT_ID,
    );

    expect(result.status).toBe('proposed');
    expect(result.respondBy).toBeTruthy();
    expect(repo.insertProposed).toHaveBeenCalledWith(
      expect.objectContaining({
        briefId: BRIEF_ID,
        professionalId: PRO_ID,
      }),
    );
  });

  it('rejects propose when the professional is not in the top-3', async () => {
    vi.mocked(repo.getBriefOwner).mockResolvedValue({
      clientId: CLIENT_ID,
      status: 'submitted',
    });
    vi.mocked(repo.isSurfacedCandidate).mockResolvedValue(false);

    await expect(
      service.createEngagement(
        { briefId: BRIEF_ID, professionalId: PRO_ID },
        CLIENT_ID,
      ),
    ).rejects.toMatchObject({ code: 'NOT_A_CANDIDATE', statusCode: 400 });
  });

  it('accepts within the window and marks the brief matched', async () => {
    vi.mocked(repo.getById).mockResolvedValue(proposedRow());
    vi.mocked(repo.markAccepted).mockResolvedValue(
      proposedRow({
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
      }),
    );

    const result = await service.acceptEngagement(ENG_ID, PRO_ID);
    expect(result.status).toBe('accepted');
    expect(repo.markBriefMatched).toHaveBeenCalledWith(BRIEF_ID);
  });

  it('declines with a reason and triggers backfill', async () => {
    vi.mocked(repo.getById).mockResolvedValue(proposedRow());
    vi.mocked(repo.markDeclined).mockResolvedValue(
      proposedRow({
        status: 'declined',
        declineReason: 'Schedule conflict this week',
      }),
    );

    const result = await service.declineEngagement(ENG_ID, PRO_ID, {
      reason: 'Schedule conflict this week',
    });

    expect(result.status).toBe('declined');
    expect(matchingService.backfillAfterDecline).toHaveBeenCalledWith(
      BRIEF_ID,
      PRO_ID,
    );
  });

  it('soft-declines expired proposals when loading the inbox', async () => {
    const expired = proposedRow({
      respondBy: new Date(Date.now() - 60_000).toISOString(),
    });
    vi.mocked(repo.listExpiredProposed).mockResolvedValue([expired]);
    vi.mocked(repo.markDeclined).mockResolvedValue({
      ...expired,
      status: 'declined',
      declineReason: 'No response within 24 hours',
    });
    vi.mocked(repo.listProposedInbox).mockResolvedValue([]);

    await service.listInbox(PRO_ID);

    expect(repo.markDeclined).toHaveBeenCalled();
    expect(matchingService.backfillAfterDecline).toHaveBeenCalledWith(
      BRIEF_ID,
      PRO_ID,
    );
  });
});
