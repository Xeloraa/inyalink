import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '@inyalink/shared';

const complete = vi.fn();

vi.mock('../../ai/providers/index.js', () => ({
  getProvider: () => ({
    name: 'mock',
    complete,
  }),
}));

import { generateRoadmap } from '../../ai/features/generateRoadmap.js';
import { structureBrief } from '../../ai/features/structureBrief.js';

const successTurn = {
  ok: true as const,
  data: {
    nextQuestion: 'ဘတ်ဂျက် ဘယ်လောက်လောက် ထားမလဲ။',
    briefDraft: {
      language: 'my' as const,
      category: 'graphic-design',
      title: null,
      description: 'ကော်ဖီဆိုင် logo',
      requirements: null,
      budget_min_mmk: null,
      budget_max_mmk: null,
      deadline: null,
      reference_links: null,
      ai_confidence: null,
      needs_human_review: null,
    },
    complete: false,
  },
  usage: { tokensIn: 10, tokensOut: 20 },
  latencyMs: 5,
};

const roadmapSuccess = {
  ok: true as const,
  data: {
    language: 'my' as const,
    disclaimer:
      'ဤလမ်းညွှန်သည် စီမံကိန်းနှင့် ကုန်ကျစရိတ် ခန့်မှန်းချက်သာဖြစ်ပြီး ဥပဒေ/အခွန် အကြံဉာဏ် မဟုတ်ပါ။',
    steps: [
      {
        order: 1,
        title: 'အမှတ်တံဆိပ်နှင့် လိုဂို',
        why: 'ဆိုင်ကို လူသိများအောင် ပထမဆုံး ပုံရိပ် တည်ဆောက်ရန်',
        category_slug: 'graphic-design',
        est_min_mmk: 150_000,
        est_max_mmk: 500_000,
      },
      {
        order: 2,
        title: 'ဆိုင်ဓာတ်ပုံ',
        why: 'မီနူးနှင့် ဆိုရှယ်မီဒီယာအတွက် ပုံများ လိုအပ်သည်',
        category_slug: 'photography',
        est_min_mmk: 200_000,
        est_max_mmk: 800_000,
      },
      {
        order: 3,
        title: 'ဝက်ဘ်စာမျက်နှာ',
        why: 'ဖောက်သည်များ ရှာဖွေနိုင်ရန်',
        category_slug: 'web-development',
        est_min_mmk: 500_000,
        est_max_mmk: 2_000_000,
      },
      {
        order: 4,
        title: 'မှတ်ပုံတင် အကူအညီ ငှားရန်',
        why: 'လိုအပ်သော စာရွက်စာတမ်းများကို သင့်လျော်သော ပညာရှင်နှင့် ဆောင်ရွက်ရန်',
        category_slug: 'graphic-design',
        est_min_mmk: 100_000,
        est_max_mmk: 400_000,
      },
    ],
  },
  usage: { tokensIn: 40, tokensOut: 80 },
  latencyMs: 12,
};

describe('structureBrief', () => {
  beforeEach(() => {
    complete.mockReset();
    complete.mockResolvedValue(successTurn);
  });

  it('returns a clarifying question and merged draft', async () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'ကော်ဖီဆိုင် logo လိုချင်ပါတယ်' },
    ];
    const log = vi.fn(async () => undefined);

    const result = await structureBrief({
      messages,
      locale: 'my',
      maxQuestions: 5,
      model: 'mock-model',
      log,
    });

    expect(result.complete).toBe(false);
    expect(result.nextQuestion).toContain('ဘတ်ဂျက်');
    expect(result.briefDraft.category).toBe('graphic-design');
    expect(result.briefDraft.language).toBe('my');
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ feature: 'structure_brief', succeeded: true }),
    );
  });

  it('forces briefDraft.language to the first-message language, not the UI locale', async () => {
    complete.mockResolvedValueOnce({
      ...successTurn,
      data: {
        ...successTurn.data,
        nextQuestion: 'What is your budget range?',
        briefDraft: {
          ...successTurn.data.briefDraft,
          language: 'en' as const,
        },
      },
    });

    const result = await structureBrief({
      messages: [{ role: 'user', content: 'ကော်ဖီဆိုင် logo လိုချင်ပါတယ်' }],
      // UI toggle is English — questions must still follow Burmese opening.
      locale: 'en',
      maxQuestions: 5,
      model: 'mock-model',
      log: vi.fn(async () => undefined),
    });

    expect(result.briefDraft.language).toBe('my');
    expect(complete).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringMatching(/`my`|language.*my/i),
      }),
    );
  });

  it('forces review when question budget is exhausted and draft incomplete', async () => {
    complete.mockResolvedValueOnce({
      ok: true,
      data: {
        nextQuestion: null,
        briefDraft: {
          language: null,
          category: 'graphic-design',
          title: null,
          description: 'logo',
          requirements: null,
          budget_min_mmk: null,
          budget_max_mmk: null,
          deadline: null,
          reference_links: null,
          ai_confidence: null,
          needs_human_review: null,
        },
        complete: false,
      },
      usage: { tokensIn: 1, tokensOut: 1 },
      latencyMs: 1,
    });

    const messages: ChatMessage[] = [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'q1' },
      { role: 'user', content: 'a1' },
      { role: 'assistant', content: 'q2' },
      { role: 'user', content: 'a2' },
      { role: 'assistant', content: 'q3' },
      { role: 'user', content: 'a3' },
      { role: 'assistant', content: 'q4' },
      { role: 'user', content: 'a4' },
      { role: 'assistant', content: 'q5' },
      { role: 'user', content: 'a5' },
    ];

    const result = await structureBrief({
      messages,
      locale: 'my',
      maxQuestions: 5,
      model: 'mock-model',
      log: vi.fn(async () => undefined),
    });

    expect(result.nextQuestion).toBeUndefined();
    expect(result.complete).toBe(false);
    expect(result.briefDraft.needs_human_review).toBe(true);
  });

  it('on rate limit keeps draft state and returns a retryable notice', async () => {
    complete.mockResolvedValueOnce({
      ok: false,
      error: {
        code: 'AI_RATE_LIMIT',
        message: 'The AI service is busy. Please try again shortly.',
      },
    });

    const prior = {
      category: 'graphic-design',
      description: 'Inya Cafe logo',
      budget_min_mmk: 300_000,
    };
    const result = await structureBrief({
      messages: [{ role: 'user', content: 'ဘတ်ဂျက်က ၃ သိန်းပါ' }],
      briefDraft: prior,
      locale: 'my',
      maxQuestions: 5,
      model: 'mock-model',
      log: vi.fn(async () => undefined),
    });

    expect(result).toEqual({
      briefDraft: prior,
      complete: false,
      retryable: true,
      notice: 'One moment — the assistant is busy. Please try again.',
      providerFailed: true,
      providerErrorKind: 'AI_RATE_LIMIT',
    });
    expect(result.briefDraft.needs_human_review).toBeUndefined();
    expect(result.nextQuestion).toBeUndefined();
  });
});

describe('generateRoadmap', () => {
  beforeEach(() => {
    complete.mockReset();
    complete.mockResolvedValue(roadmapSuccess);
  });

  it('returns sequenced steps with disclaimer and logs success', async () => {
    const log = vi.fn(async () => undefined);
    const result = await generateRoadmap({
      goal: 'ကော်ဖီဆိုင် ဖွင့်ချင်ပါတယ်',
      categorySlugs: [
        'graphic-design',
        'photography',
        'web-development',
        'social-media-marketing',
      ],
      locale: 'my',
      model: 'mock-model',
      log,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.language).toBe('my');
    expect(result.steps).toHaveLength(4);
    expect(result.steps[0]?.order).toBe(1);
    expect(result.disclaimer).toContain('ဥပဒေ');
    expect(result.remappedSlugs).toEqual([]);
    expect(result.usage).toEqual({ tokensIn: 40, tokensOut: 80 });
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ feature: 'roadmap', succeeded: true }),
    );
  });

  it('rewrites unknown category_slug to the fallback', async () => {
    complete.mockResolvedValueOnce({
      ...roadmapSuccess,
      data: {
        ...roadmapSuccess.data,
        steps: roadmapSuccess.data.steps.map((s, i) =>
          i === 0 ? { ...s, category_slug: 'not-a-real-slug' } : s,
        ),
      },
    });

    const result = await generateRoadmap({
      goal: 'open a cafe',
      categorySlugs: ['graphic-design', 'photography'],
      locale: 'en',
      model: 'mock-model',
      log: vi.fn(async () => undefined),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.language).toBe('en');
    expect(result.steps[0]?.category_slug).toBe('graphic-design');
    expect(result.remappedSlugs).toEqual([
      { order: 1, from: 'not-a-real-slug', to: 'graphic-design' },
      { order: 3, from: 'web-development', to: 'graphic-design' },
    ]);
  });

  it('on rate limit returns retryable notice without throwing', async () => {
    complete.mockResolvedValueOnce({
      ok: false,
      error: {
        code: 'AI_RATE_LIMIT',
        message: 'The AI service is busy. Please try again shortly.',
      },
    });

    const log = vi.fn(async () => undefined);
    const result = await generateRoadmap({
      goal: 'ကော်ဖီဆိုင် ဖွင့်ချင်ပါတယ်',
      categorySlugs: ['graphic-design'],
      locale: 'my',
      model: 'mock-model',
      log,
    });

    expect(result).toEqual({
      ok: false,
      retryable: true,
      errorKind: 'AI_RATE_LIMIT',
      notice: 'One moment — the assistant is busy. Please try again.',
    });
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        feature: 'roadmap',
        succeeded: false,
        errorKind: 'AI_RATE_LIMIT',
      }),
    );
  });
});
