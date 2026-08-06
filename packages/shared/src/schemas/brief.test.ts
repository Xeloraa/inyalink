import { describe, expect, it } from 'vitest';
import { BriefDraftSchema, isBriefDraftComplete } from './brief.js';

describe('isBriefDraftComplete', () => {
  it('requires category, description, and budget or deadline', () => {
    expect(
      isBriefDraftComplete({
        category: 'graphic-design',
        description: 'Logo for a cafe',
      }),
    ).toBe(false);

    expect(
      isBriefDraftComplete({
        category: 'graphic-design',
        description: 'Logo for a cafe',
        budget_max_mmk: 500_000,
      }),
    ).toBe(true);

    expect(
      isBriefDraftComplete({
        category: 'graphic-design',
        description: 'Logo for a cafe',
        deadline: '2026-09-01',
      }),
    ).toBe(true);
  });

  it('parses a valid draft', () => {
    const draft = BriefDraftSchema.parse({
      category: 'graphic-design',
      description: 'ကော်ဖီဆိုင် logo',
      language: 'mixed',
    });
    expect(draft.language).toBe('mixed');
  });
});
