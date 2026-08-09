import { describe, expect, it, vi } from 'vitest';
import {
  DEMO_CONVERSE_ALIASES,
  DEMO_CONVERSE_INPUT,
  DEMO_ROADMAP_ALIASES,
  DEMO_ROADMAP_INPUT,
  demoFixtureCounts,
  lookupConverseDemoFallback,
  lookupRoadmapDemoFallback,
} from '../../ai/demo-fallback/cache.js';

describe('demo AI fallback cache', () => {
  it('loads ~25 fixtures covering demo openings', () => {
    const counts = demoFixtureCounts();
    expect(counts.total).toBeGreaterThanOrEqual(20);
    expect(counts.converse).toBeGreaterThanOrEqual(10);
    expect(counts.roadmap).toBeGreaterThanOrEqual(6);
    expect(DEMO_CONVERSE_ALIASES.length).toBeGreaterThanOrEqual(10);
    expect(DEMO_ROADMAP_ALIASES.length).toBeGreaterThanOrEqual(6);
  });

  it('serves the cafe-open roadmap for the exact demo goal', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const result = lookupRoadmapDemoFallback(DEMO_ROADMAP_INPUT, 'my');
    expect(result).not.toBeNull();
    expect(result?.steps?.length).toBeGreaterThanOrEqual(4);
    expect(result?.disclaimer).toBeTruthy();
    expect(result?.language).toBe('my');
    expect(log).toHaveBeenCalledWith(
      '[demo-only] AI fallback cache hit',
      expect.objectContaining({ feature: 'roadmap', event: 'hit', demoOnly: true }),
    );
    log.mockRestore();
  });

  it('serves roadmap for the landing plan chip', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const chip = 'ကော်ဖီဆိုင် ဖွင့်ချင်ပါတယ်။ ဘာတွေ လိုအပ်မလဲ?';
    expect(lookupRoadmapDemoFallback(chip, 'my')).not.toBeNull();
    expect(log).toHaveBeenCalledWith(
      '[demo-only] AI fallback cache hit',
      expect.objectContaining({ feature: 'roadmap', event: 'hit' }),
    );
    log.mockRestore();
  });

  it('serves roadmap for English goal openings', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    expect(
      lookupRoadmapDemoFallback('I want to open a cafe', 'en'),
    ).not.toBeNull();
    expect(
      lookupRoadmapDemoFallback("my shop isn't getting customers", 'en'),
    ).not.toBeNull();
    expect(
      lookupRoadmapDemoFallback("I don't know where to start", 'en'),
    ).not.toBeNull();
    log.mockRestore();
  });

  it('ignores non-demo roadmap goals and logs miss', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    expect(lookupRoadmapDemoFallback('open a bakery in Mars', 'my')).toBeNull();
    expect(log).toHaveBeenCalledWith(
      '[demo-only] AI fallback cache miss',
      expect.objectContaining({
        feature: 'roadmap',
        event: 'miss',
        reason: 'input_not_in_aliases',
      }),
    );
    log.mockRestore();
  });

  it('advances the cached question sequence by assistant turns already asked', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const q1 = lookupConverseDemoFallback(
      [{ role: 'user', content: DEMO_CONVERSE_INPUT }],
      'my',
    );
    expect(q1?.complete).toBe(false);
    expect(q1?.nextQuestion).toBeTruthy();
    expect(q1?.briefDraft.category).toBeTruthy();

    const q2 = lookupConverseDemoFallback(
      [
        { role: 'user', content: DEMO_CONVERSE_INPUT },
        { role: 'assistant', content: q1!.nextQuestion! },
        { role: 'user', content: 'Inya Cafe' },
      ],
      'my',
    );
    expect(q2?.complete).toBe(false);
    expect(q2?.nextQuestion).toBeTruthy();

    const q3 = lookupConverseDemoFallback(
      [
        { role: 'user', content: DEMO_CONVERSE_INPUT },
        { role: 'assistant', content: 'q1' },
        { role: 'user', content: 'Inya Cafe' },
        { role: 'assistant', content: 'q2' },
        { role: 'user', content: 'logo ပဲ' },
      ],
      'my',
    );
    expect(q3?.nextQuestion).toBeTruthy();

    const q4 = lookupConverseDemoFallback(
      [
        { role: 'user', content: DEMO_CONVERSE_INPUT },
        { role: 'assistant', content: 'q1' },
        { role: 'user', content: 'Inya Cafe' },
        { role: 'assistant', content: 'q2' },
        { role: 'user', content: 'logo ပဲ' },
        { role: 'assistant', content: 'q3' },
        { role: 'user', content: 'minimalist' },
      ],
      'my',
    );
    expect(q4?.nextQuestion).toBeTruthy();

    const done = lookupConverseDemoFallback(
      [
        { role: 'user', content: DEMO_CONVERSE_INPUT },
        { role: 'assistant', content: 'q1' },
        { role: 'user', content: 'Inya Cafe' },
        { role: 'assistant', content: 'q2' },
        { role: 'user', content: 'logo ပဲ' },
        { role: 'assistant', content: 'q3' },
        { role: 'user', content: 'minimalist' },
        { role: 'assistant', content: 'q4' },
        { role: 'user', content: '2026-09-30' },
      ],
      'my',
    );
    expect(done?.complete).toBe(true);
    expect(done?.nextQuestion).toBeUndefined();
    expect(log).toHaveBeenCalledWith(
      '[demo-only] AI fallback cache hit',
      expect.objectContaining({ complete: true }),
    );
    log.mockRestore();
  });

  it('serves converse for the landing quick-hire chip mid-sequence', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const chip = DEMO_CONVERSE_ALIASES.find((a) => a.includes('လိုဂို'))!;
    const mid = lookupConverseDemoFallback(
      [
        { role: 'user', content: chip },
        { role: 'assistant', content: 'first question' },
        { role: 'user', content: 'Inya Cafe' },
      ],
      'my',
    );
    expect(mid?.complete).toBe(false);
    expect(mid?.nextQuestion).toBeTruthy();
    expect(log).toHaveBeenCalledWith(
      '[demo-only] AI fallback cache hit',
      expect.objectContaining({
        nextQuestionIndex: 1,
      }),
    );
    log.mockRestore();
  });

  it('still advances mid-conversation when the latest reply is free-form', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const mid = lookupConverseDemoFallback(
      [
        { role: 'user', content: DEMO_CONVERSE_INPUT },
        { role: 'assistant', content: 'first question' },
        { role: 'user', content: 'cafe vex' },
      ],
      'en',
    );
    expect(mid).not.toBeNull();
    expect(mid?.complete).toBe(false);
    expect(mid?.nextQuestion).toBeTruthy();
    expect(log).toHaveBeenCalledWith(
      '[demo-only] AI fallback cache hit',
      expect.objectContaining({
        feature: 'structure_brief',
        nextQuestionIndex: 1,
      }),
    );
    log.mockRestore();
  });

  it('serves converse for website / photo / price demo openings', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    expect(
      lookupConverseDemoFallback(
        [{ role: 'user', content: 'I need a website for my shop' }],
        'en',
      )?.nextQuestion,
    ).toBeTruthy();
    expect(
      lookupConverseDemoFallback(
        [{ role: 'user', content: 'I need photography for my shop' }],
        'en',
      )?.nextQuestion,
    ).toBeTruthy();
    expect(
      lookupConverseDemoFallback(
        [{ role: 'user', content: 'how much does a logo cost' }],
        'en',
      )?.nextQuestion,
    ).toBeTruthy();
    expect(
      lookupConverseDemoFallback(
        [{ role: 'user', content: 'ဆိုင်အတွက် website လိုချင်ပါတယ်' }],
        'my',
      )?.nextQuestion,
    ).toBeTruthy();
    log.mockRestore();
  });

  it('ignores converse openings that are not a demo seed', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    expect(
      lookupConverseDemoFallback(
        [{ role: 'user', content: 'teleport my shop to the moon' }],
        'en',
      ),
    ).toBeNull();
    expect(log).toHaveBeenCalledWith(
      '[demo-only] AI fallback cache miss',
      expect.objectContaining({
        feature: 'structure_brief',
        event: 'miss',
      }),
    );
    log.mockRestore();
  });
});
