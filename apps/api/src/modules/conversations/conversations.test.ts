import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./conversations.repo.js', () => ({
  listConversations: vi.fn(),
  getConversation: vi.fn(),
  insertConversation: vi.fn(),
  replaceConversation: vi.fn(),
}));

vi.mock('@inyalink/burmese', () => ({
  normalizeToUnicode: (text: string) => text,
}));

import * as repo from './conversations.repo.js';
import {
  createConversation,
  getConversation,
  listConversations,
  updateConversation,
} from './conversations.service.js';

const userId = 'b0000000-0000-4000-8000-000000000001';
const otherId = 'b0000000-0000-4000-8000-000000000002';
const convId = '11111111-1111-4111-8111-111111111111';

function detail(
  partial: Partial<Awaited<ReturnType<typeof repo.getConversation>>> = {},
) {
  return {
    id: convId,
    title: 'ကော်ဖီဆိုင် logo',
    path: 'quick' as const,
    briefDraft: { title: 'Cafe logo' },
    complete: false,
    messages: [
      { role: 'user' as const, content: 'ကော်ဖီဆိုင်အတွက် logo လိုချင်ပါတယ်' },
      { role: 'assistant' as const, content: 'Budget ဘယ်လောက်လောက် ထားမလဲ။' },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...partial,
  };
}

describe('conversations.service', () => {
  beforeEach(() => {
    vi.mocked(repo.listConversations).mockReset();
    vi.mocked(repo.getConversation).mockReset();
    vi.mocked(repo.insertConversation).mockReset();
    vi.mocked(repo.replaceConversation).mockReset();
  });

  it('lists conversations for the authenticated user', async () => {
    vi.mocked(repo.listConversations).mockResolvedValue([
      {
        id: convId,
        title: 'Cafe logo',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
    ]);

    const result = await listConversations(userId);
    expect(repo.listConversations).toHaveBeenCalledWith(userId);
    expect(result.conversations).toHaveLength(1);
    expect(result.conversations[0]?.title).toBe('Cafe logo');
  });

  it('creates a conversation titled from the opening user message', async () => {
    vi.mocked(repo.insertConversation).mockResolvedValue(detail());

    const result = await createConversation(
      {
        messages: [
          { role: 'user', content: 'ကော်ဖီဆိုင်အတွက် logo လိုချင်ပါတယ်' },
        ],
        path: 'quick',
      },
      userId,
    );

    expect(repo.insertConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        title: 'ကော်ဖီဆိုင်အတွက် logo လိုချင်ပါတယ်',
        path: 'quick',
      }),
    );
    expect(result.id).toBe(convId);
  });

  it('forbids reading another user conversation', async () => {
    vi.mocked(repo.getConversation).mockResolvedValue(null);

    await expect(getConversation(convId, otherId)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('updates an owned conversation snapshot', async () => {
    vi.mocked(repo.replaceConversation).mockResolvedValue(
      detail({ complete: true }),
    );

    const result = await updateConversation(
      convId,
      {
        messages: [
          { role: 'user', content: 'ကော်ဖီဆိုင်အတွက် logo လိုချင်ပါတယ်' },
          { role: 'assistant', content: 'Done.' },
        ],
        complete: true,
        path: 'quick',
      },
      userId,
    );

    expect(repo.replaceConversation).toHaveBeenCalledWith(
      convId,
      userId,
      expect.objectContaining({ complete: true }),
    );
    expect(result.complete).toBe(true);
  });
});
