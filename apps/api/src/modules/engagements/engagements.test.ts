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
  getEngagementAccess: vi.fn(),
  listMessagesByEngagement: vi.fn(),
  insertMessage: vi.fn(),
  listThreadsForUser: vi.fn(),
  isApprovedProfessional: vi.fn(),
  findLiveEngagement: vi.fn(),
  insertDirectEngagement: vi.fn(),
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
const OTHER_ID = 'd0000000-0000-4000-8000-000000000001';
const MSG_ID = 'f0000000-0000-4000-8000-000000000001';

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

function accessRow(
  overrides: Partial<repo.EngagementAccessRow> = {},
): repo.EngagementAccessRow {
  return {
    id: ENG_ID,
    status: 'accepted',
    professionalId: PRO_ID,
    clientId: CLIENT_ID,
    briefId: BRIEF_ID,
    briefTitle: 'Cafe logo',
    briefDescription: 'Need a logo for my cafe',
    briefLanguage: 'en',
    ...overrides,
  };
}

function messageRow(
  overrides: Partial<repo.MessageRow> = {},
): repo.MessageRow {
  return {
    id: MSG_ID,
    engagementId: ENG_ID,
    senderId: CLIENT_ID,
    body: 'Hello',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

describe('engagements.service messages', () => {
  beforeEach(() => {
    vi.mocked(repo.getEngagementAccess).mockReset();
    vi.mocked(repo.listMessagesByEngagement).mockReset();
    vi.mocked(repo.insertMessage).mockReset();
    vi.mocked(repo.listThreadsForUser).mockReset();
  });

  it('canSendMessages allows accepted and later active states only', () => {
    const allowed = ['accepted', 'in_progress', 'delivered', 'disputed'] as const;
    const blocked = ['proposed', 'declined', 'confirmed', 'cancelled'] as const;
    for (const status of allowed) {
      expect(service.canSendMessages(status)).toBe(true);
    }
    for (const status of blocked) {
      expect(service.canSendMessages(status)).toBe(false);
    }
  });

  it('lists thread for either participant with pinned brief', async () => {
    vi.mocked(repo.getEngagementAccess).mockResolvedValue(accessRow());
    vi.mocked(repo.listMessagesByEngagement).mockResolvedValue([messageRow()]);

    const result = await service.listThread(ENG_ID, CLIENT_ID);

    expect(result.brief.title).toBe('Cafe logo');
    expect(result.messages).toHaveLength(1);
    expect(result.canSend).toBe(true);
  });

  it('forbids non-participants from listing or sending', async () => {
    vi.mocked(repo.getEngagementAccess).mockResolvedValue(accessRow());

    await expect(
      service.listThread(ENG_ID, OTHER_ID),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 });
    await expect(
      service.sendMessage(ENG_ID, OTHER_ID, { body: 'Hi' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 });
  });

  it('sends a message when the engagement is active', async () => {
    vi.mocked(repo.getEngagementAccess).mockResolvedValue(accessRow());
    vi.mocked(repo.insertMessage).mockResolvedValue(
      messageRow({ body: 'Saw kha', senderId: PRO_ID }),
    );

    const result = await service.sendMessage(ENG_ID, PRO_ID, {
      body: '  Saw kha  ',
    });

    expect(result.body).toBe('Saw kha');
    expect(repo.insertMessage).toHaveBeenCalledWith({
      engagementId: ENG_ID,
      senderId: PRO_ID,
      body: 'Saw kha',
    });
  });

  it('rejects sending on a non-active engagement', async () => {
    vi.mocked(repo.getEngagementAccess).mockResolvedValue(
      accessRow({ status: 'proposed' }),
    );

    await expect(
      service.sendMessage(ENG_ID, CLIENT_ID, { body: 'Hi' }),
    ).rejects.toMatchObject({ code: 'ENGAGEMENT_NOT_ACTIVE', statusCode: 409 });
    expect(repo.insertMessage).not.toHaveBeenCalled();
  });

  it('404s when the engagement does not exist', async () => {
    vi.mocked(repo.getEngagementAccess).mockResolvedValue(null);

    await expect(
      service.listThread(ENG_ID, CLIENT_ID),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });

  it('lists open threads for the current user', async () => {
    vi.mocked(repo.listThreadsForUser).mockResolvedValue([
      {
        engagementId: ENG_ID,
        status: 'accepted',
        briefId: BRIEF_ID,
        briefTitle: 'Cafe logo',
        counterpartName: 'Aye',
        lastMessageAt: new Date().toISOString(),
      },
    ]);

    const result = await service.listThreads(CLIENT_ID);

    expect(result.threads).toHaveLength(1);
    expect(result.threads[0]?.engagementId).toBe(ENG_ID);
  });
});

describe('engagements.service direct conversations', () => {
  beforeEach(() => {
    vi.mocked(repo.isApprovedProfessional).mockReset();
    vi.mocked(repo.findLiveEngagement).mockReset();
    vi.mocked(repo.insertDirectEngagement).mockReset();
  });

  it('rejects messaging a professional who is not approved', async () => {
    vi.mocked(repo.isApprovedProfessional).mockResolvedValue(false);

    await expect(
      service.startDirectConversation(CLIENT_ID, { professionalId: PRO_ID }),
    ).rejects.toMatchObject({
      code: 'PROFESSIONAL_NOT_FOUND',
      statusCode: 404,
    });
    expect(repo.insertDirectEngagement).not.toHaveBeenCalled();
  });

  it('reuses an existing live engagement instead of creating a duplicate', async () => {
    vi.mocked(repo.isApprovedProfessional).mockResolvedValue(true);
    vi.mocked(repo.findLiveEngagement).mockResolvedValue(
      proposedRow({ status: 'accepted' }),
    );

    const result = await service.startDirectConversation(CLIENT_ID, {
      professionalId: PRO_ID,
    });

    expect(result.id).toBe(ENG_ID);
    expect(repo.insertDirectEngagement).not.toHaveBeenCalled();
  });

  it('creates a new accepted engagement when none exists yet', async () => {
    vi.mocked(repo.isApprovedProfessional).mockResolvedValue(true);
    vi.mocked(repo.findLiveEngagement).mockResolvedValue(null);
    vi.mocked(repo.insertDirectEngagement).mockResolvedValue(
      proposedRow({ status: 'accepted', acceptedAt: new Date().toISOString() }),
    );

    const result = await service.startDirectConversation(CLIENT_ID, {
      professionalId: PRO_ID,
    });

    expect(result.status).toBe('accepted');
    expect(repo.insertDirectEngagement).toHaveBeenCalledWith({
      clientId: CLIENT_ID,
      professionalId: PRO_ID,
    });
  });
});
