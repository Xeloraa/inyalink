import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as repo from './notifications.repo.js';
import * as service from './notifications.service.js';

vi.mock('./notifications.repo.js', () => ({
  insertNotification: vi.fn(),
  insertMany: vi.fn(),
  listForUser: vi.fn(),
  countUnread: vi.fn(),
  getOwned: vi.fn(),
  markRead: vi.fn(),
  getBriefTitle: vi.fn(),
  getBriefClient: vi.fn(),
  getProfessionalDisplayName: vi.fn(),
}));

vi.mock('@inyalink/burmese', () => ({
  normalizeToUnicode: (text: string) => text,
}));

const USER_ID = 'a0000000-0000-4000-8000-000000000001';
const CLIENT_ID = 'b0000000-0000-4000-8000-000000000001';
const BRIEF_ID = 'c0000000-0000-4000-8000-000000000001';
const ENG_ID = 'e0000000-0000-4000-8000-000000000001';
const NOTIF_ID = 'f0000000-0000-4000-8000-000000000001';

function row(
  overrides: Partial<repo.NotificationRow> = {},
): repo.NotificationRow {
  return {
    id: NOTIF_ID,
    userId: USER_ID,
    type: 'match_top3',
    href: '/app/briefs',
    briefId: BRIEF_ID,
    engagementId: null,
    meta: { briefTitle: 'Cafe logo' },
    readAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('notifications.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hrefFor maps each type to a screen', () => {
    expect(service.hrefFor('match_top3')).toBe('/app/briefs');
    expect(service.hrefFor('engagement_proposed')).toBe('/app/briefs');
    expect(service.hrefFor('engagement_accepted', { briefId: BRIEF_ID })).toBe(
      `/?briefId=${BRIEF_ID}`,
    );
    expect(service.hrefFor('application_approved')).toBe(
      '/professionals/me/edit',
    );
    expect(service.hrefFor('application_rejected')).toBe(
      '/professionals/join',
    );
  });

  it('lists notifications with unread count', async () => {
    vi.mocked(repo.listForUser).mockResolvedValue([row()]);
    vi.mocked(repo.countUnread).mockResolvedValue(1);

    const result = await service.listNotifications(USER_ID);

    expect(result.unreadCount).toBe(1);
    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0]?.type).toBe('match_top3');
  });

  it('marks a notification read', async () => {
    vi.mocked(repo.markRead).mockResolvedValue(
      row({ readAt: new Date().toISOString() }),
    );

    const result = await service.markNotificationRead(NOTIF_ID, USER_ID);

    expect(result.readAt).toBeTruthy();
    expect(repo.markRead).toHaveBeenCalledWith(NOTIF_ID, USER_ID);
  });

  it('returns 404 when marking unknown notification', async () => {
    vi.mocked(repo.markRead).mockResolvedValue(null);

    await expect(
      service.markNotificationRead(NOTIF_ID, USER_ID),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });

  it('notifyTop3Match skips previously surfaced pros', async () => {
    vi.mocked(repo.getBriefTitle).mockResolvedValue('Cafe logo');
    vi.mocked(repo.insertMany).mockResolvedValue(undefined);

    await service.notifyTop3Match({
      briefId: BRIEF_ID,
      professionalIds: [USER_ID, CLIENT_ID],
      previousProfessionalIds: [USER_ID],
    });

    expect(repo.insertMany).toHaveBeenCalledWith(
      expect.objectContaining({
        userIds: [CLIENT_ID],
        type: 'match_top3',
        briefId: BRIEF_ID,
      }),
    );
  });

  it('notifyEngagementAccepted notifies the brief client', async () => {
    vi.mocked(repo.getBriefClient).mockResolvedValue({
      clientId: CLIENT_ID,
      title: 'Cafe logo',
    });
    vi.mocked(repo.getProfessionalDisplayName).mockResolvedValue('Aye');
    vi.mocked(repo.insertNotification).mockResolvedValue(
      row({
        userId: CLIENT_ID,
        type: 'engagement_accepted',
        href: `/?briefId=${BRIEF_ID}`,
        engagementId: ENG_ID,
        meta: { briefTitle: 'Cafe logo', professionalName: 'Aye' },
      }),
    );

    await service.notifyEngagementAccepted({
      briefId: BRIEF_ID,
      engagementId: ENG_ID,
      professionalId: USER_ID,
    });

    expect(repo.insertNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: CLIENT_ID,
        type: 'engagement_accepted',
        engagementId: ENG_ID,
      }),
    );
  });

  it('notifyApplicationReviewed creates approved/rejected rows', async () => {
    vi.mocked(repo.insertNotification).mockResolvedValue(
      row({ type: 'application_approved', href: '/professionals/me/edit' }),
    );

    await service.notifyApplicationReviewed({
      professionalId: USER_ID,
      approved: true,
    });

    expect(repo.insertNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        type: 'application_approved',
        href: '/professionals/me/edit',
      }),
    );
  });
});
