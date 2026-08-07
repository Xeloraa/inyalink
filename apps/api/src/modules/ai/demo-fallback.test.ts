import { describe, expect, it, vi } from 'vitest';
import {
  DEMO_CONVERSE_ALIASES,
  DEMO_CONVERSE_INPUT,
  DEMO_ROADMAP_ALIASES,
  DEMO_ROADMAP_INPUT,
  lookupConverseDemoFallback,
  lookupRoadmapDemoFallback,
} from '../../ai/demo-fallback/cache.js';

describe('demo AI fallback cache', () => {
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
    const chip = DEMO_ROADMAP_ALIASES[1]!;
    expect(lookupRoadmapDemoFallback(chip, 'my')).not.toBeNull();
    expect(log).toHaveBeenCalledWith(
      '[demo-only] AI fallback cache hit',
      expect.objectContaining({ matchInput: chip }),
    );
    log.mockRestore();
  });

  it('ignores non-demo roadmap goals and logs miss', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    expect(lookupRoadmapDemoFallback('open a bakery', 'my')).toBeNull();
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
    expect(q1?.nextQuestion).toContain('နာမည်');
    expect(q1?.briefDraft.category).toBe('graphic-design');

    const q2 = lookupConverseDemoFallback(
      [
        { role: 'user', content: DEMO_CONVERSE_INPUT },
        { role: 'assistant', content: q1!.nextQuestion! },
        { role: 'user', content: 'Inya Cafe' },
      ],
      'my',
    );
    expect(q2?.complete).toBe(false);
    expect(q2?.nextQuestion).toMatch(/signage|coffee cup|packaging|logo/i);

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
    expect(q3?.nextQuestion).toMatch(/style|minimal|source/i);
    expect(q3?.nextQuestion).not.toMatch(/အရောင်|colour|color/i);

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
    expect(q4?.nextQuestion).toMatch(/budget|deadline|ဘယ်တော့/i);

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
    expect(done?.briefDraft.budget_min_mmk).toBe(300_000);
    expect(done?.briefDraft.deadline).toBe('2026-09-30');
    expect(log).toHaveBeenCalledWith(
      '[demo-only] AI fallback cache hit',
      expect.objectContaining({ complete: true }),
    );
    log.mockRestore();
  });

  it('serves converse for the landing quick-hire chip mid-sequence', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const chip = DEMO_CONVERSE_ALIASES[1]!;
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
        matchInput: chip,
        nextQuestionIndex: 1,
      }),
    );
    log.mockRestore();
  });

  it('does not advance the script when the latest reply is not a fixture match', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    expect(
      lookupConverseDemoFallback(
        [
          { role: 'user', content: DEMO_CONVERSE_INPUT },
          { role: 'assistant', content: 'first question' },
          { role: 'user', content: 'cafe vex' },
        ],
        'en',
      ),
    ).toBeNull();
    expect(log).toHaveBeenCalledWith(
      '[demo-only] AI fallback cache miss',
      expect.objectContaining({
        feature: 'structure_brief',
        event: 'miss',
        reason: 'latest_reply_not_close_to_fixture',
        latestUser: 'cafe vex',
      }),
    );
    log.mockRestore();
  });

  it('ignores converse openings that are not the demo seed', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    expect(
      lookupConverseDemoFallback(
        [{ role: 'user', content: 'photography for my shop' }],
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
