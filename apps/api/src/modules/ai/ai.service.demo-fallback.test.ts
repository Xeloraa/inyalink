import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEMO_CONVERSE_ALIASES,
  DEMO_CONVERSE_INPUT,
  DEMO_ROADMAP_INPUT,
} from '../../ai/demo-fallback/cache.js';

const complete = vi.fn();
const insertRoadmap = vi.fn();
const insertAiCall = vi.fn();
const listActiveCategorySlugs = vi.fn();

vi.mock('../../ai/providers/index.js', () => ({
  getProvider: () => ({
    name: 'mock',
    complete,
  }),
}));

vi.mock('./ai.repo.js', () => ({
  insertAiCall: (...args: unknown[]) => insertAiCall(...args),
  insertRoadmap: (...args: unknown[]) => insertRoadmap(...args),
  listActiveCategorySlugs: (...args: unknown[]) =>
    listActiveCategorySlugs(...args),
}));

vi.mock('../../lib/config.js', () => ({
  config: {
    aiProvider: 'groq',
    aiMaxTurns: 5,
    groqApiKey: 'test',
    demoAiFallback: true,
  },
  aiApiKeyPresent: () => true,
}));

import { converseBrief, createRoadmap } from './ai.service.js';
import { config } from '../../lib/config.js';

describe('ai.service demo fallback', () => {
  beforeEach(() => {
    complete.mockReset();
    insertRoadmap.mockReset();
    insertAiCall.mockReset();
    listActiveCategorySlugs.mockReset();
    listActiveCategorySlugs.mockResolvedValue([
      'graphic-design',
      'photography',
      'web-development',
      'social-media-marketing',
    ]);
    insertRoadmap.mockResolvedValue({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    });
    insertAiCall.mockResolvedValue(undefined);
    (config as { aiProvider: string }).aiProvider = 'groq';
  });

  it('serves converse fixture when the provider rate-limits the demo opening', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    complete.mockResolvedValue({
      ok: false,
      error: { code: 'AI_RATE_LIMIT', message: 'busy' },
    });

    const result = await converseBrief({
      messages: [{ role: 'user', content: DEMO_CONVERSE_INPUT }],
      locale: 'my',
    });

    expect(result.retryable).toBeUndefined();
    expect(result.nextQuestion).toBeTruthy();
    expect(result.briefDraft.category).toBe('graphic-design');
    expect(insertAiCall).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'demo-fallback',
        errorKind: 'demo_fallback:AI_RATE_LIMIT',
      }),
    );
    expect(log).toHaveBeenCalledWith(
      '[demo-only] AI fallback cache firing',
      expect.objectContaining({ feature: 'structure_brief' }),
    );
    log.mockRestore();
  });

  it('asks in Burmese when the opening is Burmese even if UI locale is en', async () => {
    complete.mockResolvedValue({
      ok: false,
      error: { code: 'AI_RATE_LIMIT', message: 'busy' },
    });

    const result = await converseBrief({
      messages: [{ role: 'user', content: DEMO_CONVERSE_INPUT }],
      locale: 'en',
    });

    expect(result.nextQuestion).toMatch(/[\u1000-\u109F]/);
    expect(result.briefDraft.language).toBe('my');
  });

  it('gives a generic retry notice, not a scripted reply, when a later turn rate-limits', async () => {
    // A later-turn provider failure must never fall back to a canned
    // question/confirmation — that fixture text is indexed by turn count,
    // not by what the user actually said, and would risk stating back
    // values (budget, deadline, ...) the user never gave. See the
    // "past_opening_turn" guard in lookupConverseDemoFallback.
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    complete.mockResolvedValue({
      ok: false,
      error: { code: 'AI_RATE_LIMIT', message: 'busy' },
    });

    const result = await converseBrief({
      messages: [
        { role: 'user', content: DEMO_CONVERSE_ALIASES.find((a) => a.includes('လိုဂို'))! },
        { role: 'assistant', content: 'first question from earlier turn' },
        { role: 'user', content: 'Inya Cafe' },
      ],
      locale: 'my',
    });

    expect(result.retryable).toBe(true);
    expect(result.notice).toBeTruthy();
    expect(result.complete).toBe(false);
    expect(log).toHaveBeenCalledWith(
      '[demo-only] AI fallback cache miss',
      expect.objectContaining({ reason: 'past_opening_turn' }),
    );
    log.mockRestore();
  });

  it('gives a generic retry notice mid-conversation even when the reply is free-form', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    complete.mockResolvedValue({
      ok: false,
      error: { code: 'AI_RATE_LIMIT', message: 'busy' },
    });

    const result = await converseBrief({
      messages: [
        { role: 'user', content: DEMO_CONVERSE_INPUT },
        { role: 'assistant', content: 'ဘာနာမည်လဲ?' },
        { role: 'user', content: 'cafe vex' },
      ],
      locale: 'en',
    });

    expect(result.retryable).toBe(true);
    expect(result.notice).toBeTruthy();
    log.mockRestore();
  });

  it('serves only the opening fixture question, then a retry notice for every later turn — never invented budget/deadline values', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    complete.mockResolvedValue({
      ok: false,
      error: { code: 'AI_RATE_LIMIT', message: 'busy' },
    });

    const opening = await converseBrief({
      messages: [{ role: 'user', content: DEMO_CONVERSE_INPUT }],
      locale: 'my',
    });
    expect(opening.retryable).toBeUndefined();
    expect(opening.complete).toBe(false);
    expect(opening.nextQuestion).toBeTruthy();
    expect(opening.briefDraft.category).toBe('graphic-design');

    // The user answers with a bare number the opening fixture never asked
    // about — the reported bug had this produce an invented budget range
    // and a fabricated deadline. It must now just ask the user to retry.
    const afterReply = await converseBrief({
      messages: [
        { role: 'user', content: DEMO_CONVERSE_INPUT },
        { role: 'assistant', content: opening.nextQuestion! },
        { role: 'user', content: '20000' },
      ],
      briefDraft: opening.briefDraft,
      locale: 'my',
    });

    expect(afterReply.retryable).toBe(true);
    expect(afterReply.complete).toBe(false);
    expect(afterReply.briefDraft.budget_min_mmk ?? null).not.toBe(300000);
    expect(afterReply.briefDraft.deadline ?? null).not.toBe('2026-09-30');
    log.mockRestore();
  });

  it('completes seeded converse when AI_PROVIDER is unset', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    (config as { aiProvider: string }).aiProvider = '';

    const result = await converseBrief({
      messages: [{ role: 'user', content: DEMO_CONVERSE_INPUT }],
      locale: 'my',
    });

    expect(result.nextQuestion).toBeTruthy();
    expect(result.briefDraft.category).toBe('graphic-design');
    expect(complete).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      '[ai] request start',
      expect.objectContaining({
        feature: 'structure_brief',
        fallbackEnabled: true,
        seedOpening: true,
      }),
    );
    expect(log).toHaveBeenCalledWith(
      '[demo-only] AI fallback cache firing',
      expect.objectContaining({
        feature: 'structure_brief',
        providerErrorKind: 'AI_NOT_CONFIGURED',
      }),
    );
    log.mockRestore();
  });

  it('declines an unrelated opening without calling the provider', async () => {
    const result = await converseBrief({
      messages: [{ role: 'user', content: 'what is the weather today' }],
      locale: 'en',
    });

    expect(complete).not.toHaveBeenCalled();
    expect(result.complete).toBe(false);
    expect(result.redirectTo).toBeUndefined();
    expect(result.retryable).toBeUndefined();
    expect(result.nextQuestion).toBeTruthy();
    expect(result.briefDraft).toEqual({});
  });

  it('declines a Burmese unrelated opening in Burmese without calling the provider', async () => {
    const result = await converseBrief({
      messages: [{ role: 'user', content: 'ဒီနေ့ ရာသီဥတု ဘယ်လိုရှိလဲ' }],
      locale: 'en',
    });

    expect(complete).not.toHaveBeenCalled();
    expect(result.nextQuestion).toMatch(/[က-႟]/);
  });

  it('does not treat a real service request as unrelated', async () => {
    complete.mockResolvedValue({
      ok: false,
      error: { code: 'AI_RATE_LIMIT', message: 'busy' },
    });

    const result = await converseBrief({
      messages: [{ role: 'user', content: DEMO_CONVERSE_INPUT }],
      locale: 'my',
    });

    // Falls through to the real (mocked) provider path, not the canned decline.
    expect(result.nextQuestion).not.toBe(undefined);
    expect(result.briefDraft.category).toBe('graphic-design');
  });

  it('serves roadmap fixture when generateRoadmap fails for the demo goal', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    complete.mockResolvedValue({
      ok: false,
      error: { code: 'AI_RATE_LIMIT', message: 'busy' },
    });

    const result = await createRoadmap(
      {
        goal: DEMO_ROADMAP_INPUT,
        locale: 'my',
      },
      'b0000000-0000-4000-8000-000000000001',
    );

    expect(result.id).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(result.steps?.length).toBeGreaterThanOrEqual(4);
    expect(result.retryable).toBeUndefined();
    expect(insertRoadmap).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      '[demo-only] AI fallback cache firing',
      expect.objectContaining({ feature: 'roadmap' }),
    );
    log.mockRestore();
  });

  it('serves the roadmap fixture without persisting for an anonymous (null userId) caller', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    complete.mockResolvedValue({
      ok: false,
      error: { code: 'AI_RATE_LIMIT', message: 'busy' },
    });

    const result = await createRoadmap(
      {
        goal: DEMO_ROADMAP_INPUT,
        locale: 'my',
      },
      null,
    );

    expect(result.id).toBeUndefined();
    expect(result.steps?.length).toBeGreaterThanOrEqual(4);
    expect(insertRoadmap).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it('generates a roadmap without persisting when the caller is anonymous', async () => {
    complete.mockResolvedValue({
      ok: true,
      data: {
        language: 'en',
        steps: [
          {
            order: 1,
            title: 'Register the business name',
            why: 'Needed before opening a bank account.',
            category_slug: 'graphic-design',
            est_min_mmk: 10_000,
            est_max_mmk: 20_000,
          },
          {
            order: 2,
            title: 'Design a logo',
            why: 'Needed for signage and packaging.',
            category_slug: 'graphic-design',
            est_min_mmk: 50_000,
            est_max_mmk: 150_000,
          },
          {
            order: 3,
            title: 'Build a simple website',
            why: 'Lets customers find you online.',
            category_slug: 'web-development',
            est_min_mmk: 200_000,
            est_max_mmk: 500_000,
          },
          {
            order: 4,
            title: 'Set up social media',
            why: 'Reach customers where they already are.',
            category_slug: 'social-media-marketing',
            est_min_mmk: 100_000,
            est_max_mmk: 300_000,
          },
        ],
        disclaimer: 'This is a general starting plan, not professional advice.',
      },
      usage: { tokensIn: 120, tokensOut: 240 },
      latencyMs: 900,
    });

    const result = await createRoadmap(
      { goal: 'I want to open a coffee shop', locale: 'en' },
      null,
    );

    expect(result.id).toBeUndefined();
    expect(result.steps?.length).toBeGreaterThanOrEqual(4);
    expect(result.disclaimer).toBeTruthy();
    expect(insertRoadmap).not.toHaveBeenCalled();
  });

  it('serves a generic retry notice, not a blank response, when the provider fails and no fixture matches', async () => {
    complete.mockResolvedValue({
      ok: false,
      error: { code: 'AI_RATE_LIMIT', message: 'busy' },
    });

    const result = await converseBrief({
      messages: [
        {
          role: 'user',
          content: 'I need a bespoke calligraphy commission for a wedding invitation',
        },
      ],
      locale: 'en',
    });

    expect(result.retryable).toBe(true);
    expect(result.notice).toBeTruthy();
    expect(result.notice).toMatch(/rephrasing/i);
    expect(result.briefDraft).toBeDefined();
  });

  it('serves the generic retry notice in Burmese when the response locale is my', async () => {
    complete.mockResolvedValue({
      ok: false,
      error: { code: 'AI_RATE_LIMIT', message: 'busy' },
    });

    const result = await converseBrief({
      messages: [
        {
          role: 'user',
          content: 'ငါးရှုံ့ရုပ်တု ပုံဖော်ခြင်းလုပ်ငန်း တစ်ခု ငှားချင်ပါတယ်',
        },
      ],
      locale: 'my',
    });

    expect(result.retryable).toBe(true);
    expect(result.notice).toBeTruthy();
    expect(result.notice).toMatch(/[က-႟]/);
  });

  it('serves a generic retry notice for roadmap when the provider fails and no fixture matches', async () => {
    complete.mockResolvedValue({
      ok: false,
      error: { code: 'AI_RATE_LIMIT', message: 'busy' },
    });

    const result = await createRoadmap(
      { goal: 'help me plan a deep-sea submarine tour company', locale: 'en' },
      null,
    );

    expect(result.retryable).toBe(true);
    expect(result.notice).toBeTruthy();
    expect(result.notice).toMatch(/rephrasing/i);
    expect(result.steps).toBeUndefined();
    expect(insertRoadmap).not.toHaveBeenCalled();
  });
});
