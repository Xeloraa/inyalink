import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./briefs.repo.js', () => ({
  findCategoryIdBySlug: vi.fn(),
  insertBrief: vi.fn(),
  getBriefById: vi.fn(),
  updateBrief: vi.fn(),
}));

vi.mock('../matching/matching.service.js', () => ({
  resolveBriefMatching: vi.fn(async () => undefined),
}));

vi.mock('@inyalink/burmese', () => ({
  normalizeToUnicode: (text: string) => text,
}));

import * as repo from './briefs.repo.js';
import { createBrief, getBrief, updateBrief } from './briefs.service.js';

const clientId = 'b0000000-0000-4000-8000-000000000001';
const briefId = '11111111-1111-4111-8111-111111111111';
const categoryId = '22222222-2222-4222-8222-222222222222';

function row(partial: Partial<Awaited<ReturnType<typeof repo.getBriefById>>> = {}) {
  return {
    id: briefId,
    clientId,
    status: 'draft' as const,
    source: 'ai_chat' as const,
    rawInput: 'ကော်ဖီဆိုင် logo',
    language: 'my' as const,
    categoryId,
    categorySlug: 'graphic-design',
    title: 'Cafe logo',
    description: 'Need a logo',
    requirements: ['logo'],
    budgetMinMmk: 100_000,
    budgetMaxMmk: 300_000,
    deadline: null,
    referenceLinks: [],
    aiConfidence: 0.8,
    needsHumanReview: false,
    roadmapId: null,
    urgent: false,
    interestOpensAt: null,
    interestClosesAt: null,
    matchingMode: null,
    fallbackUsed: false,
    rankedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('briefs.service', () => {
  beforeEach(() => {
    vi.mocked(repo.findCategoryIdBySlug).mockReset();
    vi.mocked(repo.insertBrief).mockReset();
    vi.mocked(repo.getBriefById).mockReset();
    vi.mocked(repo.updateBrief).mockReset();
  });

  it('creates a brief for the authenticated client and resolves category slug', async () => {
    vi.mocked(repo.findCategoryIdBySlug).mockResolvedValue(categoryId);
    vi.mocked(repo.insertBrief).mockResolvedValue(row());

    const result = await createBrief(
      {
        source: 'ai_chat',
        raw_input: 'ကော်ဖီဆိုင် logo',
        draft: {
          language: 'my',
          category: 'graphic-design',
          title: 'Cafe logo',
          description: 'Need a logo',
          requirements: ['logo'],
          budget_min_mmk: 100_000,
          budget_max_mmk: 300_000,
        },
      },
      clientId,
    );

    expect(repo.findCategoryIdBySlug).toHaveBeenCalledWith('graphic-design');
    expect(repo.insertBrief).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId,
        categoryId,
        title: 'Cafe logo',
      }),
    );
    expect(result.id).toBe(briefId);
    expect(result.category_slug).toBe('graphic-design');
  });

  it('rejects unknown category slugs', async () => {
    vi.mocked(repo.findCategoryIdBySlug).mockResolvedValue(null);

    await expect(
      createBrief(
        {
          source: 'form',
          draft: { category: 'nope', description: 'x' },
        },
        clientId,
      ),
    ).rejects.toMatchObject({ code: 'CATEGORY_NOT_FOUND' });
  });

  it('forbids access to another client brief', async () => {
    vi.mocked(repo.getBriefById).mockResolvedValue(
      row({ clientId: 'b0000000-0000-4000-8000-000000000002' }),
    );

    await expect(getBrief(briefId, clientId)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('updates draft fields while status is draft', async () => {
    vi.mocked(repo.getBriefById).mockResolvedValue(row());
    vi.mocked(repo.updateBrief).mockResolvedValue(
      row({ title: 'Updated title' }),
    );

    const result = await updateBrief(
      briefId,
      {
        draft: { title: 'Updated title' },
      },
      clientId,
    );

    expect(repo.updateBrief).toHaveBeenCalledWith(
      briefId,
      expect.objectContaining({ title: 'Updated title' }),
    );
    expect(result.title).toBe('Updated title');
  });
});
