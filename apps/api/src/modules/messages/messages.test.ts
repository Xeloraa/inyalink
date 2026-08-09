import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EngagementStatus } from '@inyalink/shared';
import * as repo from './messages.repo.js';
import * as service from './messages.service.js';

vi.mock('./messages.repo.js', () => ({
  getEngagementAccess: vi.fn(),
  listByEngagement: vi.fn(),
  insertMessage: vi.fn(),
  listThreadsForUser: vi.fn(),
}));

vi.mock('@inyalink/burmese', () => ({
  normalizeToUnicode: (text: string) => text,
}));

const ENG_ID = 'e0000000-0000-4000-8000-000000000001';
const BRIEF_ID = 'c0000000-0000-4000-8000-000000000001';
const CLIENT_ID = 'b0000000-0000-4000-8000-000000000001';
const PRO_ID = 'a0000000-0000-4000-8000-000000000001';
const OTHER_ID = 'd0000000-0000-4000-8000-000000000001';
const MSG_ID = 'f0000000-0000-4000-8000-000000000001';

function access(
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

describe('messages.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('canSendMessages allows accepted and later active states only', () => {
    const allowed: EngagementStatus[] = [
      'accepted',
      'in_progress',
      'delivered',
      'disputed',
    ];
    const blocked: EngagementStatus[] = [
      'proposed',
      'declined',
      'confirmed',
      'cancelled',
    ];
    for (const status of allowed) {
      expect(service.canSendMessages(status)).toBe(true);
    }
    for (const status of blocked) {
      expect(service.canSendMessages(status)).toBe(false);
    }
  });

  it('lists thread for client participant with pinned brief', async () => {
    vi.mocked(repo.getEngagementAccess).mockResolvedValue(access());
    vi.mocked(repo.listByEngagement).mockResolvedValue([messageRow()]);

    const result = await service.listThread(ENG_ID, CLIENT_ID);

    expect(result.engagementId).toBe(ENG_ID);
    expect(result.brief.title).toBe('Cafe logo');
    expect(result.messages).toHaveLength(1);
    expect(result.canSend).toBe(true);
  });

  it('lists thread for professional participant', async () => {
    vi.mocked(repo.getEngagementAccess).mockResolvedValue(access());
    vi.mocked(repo.listByEngagement).mockResolvedValue([]);

    const result = await service.listThread(ENG_ID, PRO_ID);

    expect(result.canSend).toBe(true);
    expect(result.messages).toEqual([]);
  });

  it('forbids non-participants from listing', async () => {
    vi.mocked(repo.getEngagementAccess).mockResolvedValue(access());

    await expect(service.listThread(ENG_ID, OTHER_ID)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  });

  it('returns 404 when engagement is missing', async () => {
    vi.mocked(repo.getEngagementAccess).mockResolvedValue(null);

    await expect(service.listThread(ENG_ID, CLIENT_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      statusCode: 404,
    });
  });

  it('sends a message when engagement is accepted', async () => {
    vi.mocked(repo.getEngagementAccess).mockResolvedValue(access());
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

  it('rejects send on proposed engagement', async () => {
    vi.mocked(repo.getEngagementAccess).mockResolvedValue(
      access({ status: 'proposed' }),
    );

    await expect(
      service.sendMessage(ENG_ID, CLIENT_ID, { body: 'Hi' }),
    ).rejects.toMatchObject({
      code: 'ENGAGEMENT_NOT_ACTIVE',
      statusCode: 409,
    });
    expect(repo.insertMessage).not.toHaveBeenCalled();
  });

  it('rejects send on declined engagement', async () => {
    vi.mocked(repo.getEngagementAccess).mockResolvedValue(
      access({ status: 'declined' }),
    );

    await expect(
      service.sendMessage(ENG_ID, PRO_ID, { body: 'Hi' }),
    ).rejects.toMatchObject({
      code: 'ENGAGEMENT_NOT_ACTIVE',
      statusCode: 409,
    });
  });

  it('forbids non-participants from sending', async () => {
    vi.mocked(repo.getEngagementAccess).mockResolvedValue(access());

    await expect(
      service.sendMessage(ENG_ID, OTHER_ID, { body: 'Hi' }),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      statusCode: 403,
    });
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
