import { describe, expect, it } from 'vitest';
import {
  PROFESSIONAL_COMPLETENESS_FIELDS,
  computeProfessionalCompleteness,
  completenessInputFromProfile,
  type ProfessionalCompletenessInput,
} from './professionalCompleteness.js';

const empty: ProfessionalCompletenessInput = {
  displayName: '',
  categorySlug: null,
  categoryOtherText: null,
  skills: [],
  portfolioCount: 0,
  workLinksCount: 0,
  headlineMy: null,
  headlineEn: null,
  bioMy: null,
  bioEn: null,
  acceptingWork: false,
  typicalTurnaroundDays: null,
  minBudgetMmk: null,
};

const full: ProfessionalCompletenessInput = {
  displayName: 'Aye Aye',
  categorySlug: 'graphic-design',
  skills: ['logo'],
  portfolioCount: 2,
  workLinksCount: 1,
  headlineMy: 'လိုဂို ပညာရှင်',
  headlineEn: 'Logo designer',
  bioMy: 'မြန်မာ စာကြောင်း အလုံအလောက် ရှိသော အကြောင်းအရာ စာသား ဖြစ်သည်။',
  bioEn: 'Enough English bio text for the minimum length check here.',
  acceptingWork: true,
  typicalTurnaroundDays: 5,
  minBudgetMmk: 100_000,
};

describe('computeProfessionalCompleteness', () => {
  it('orders missing fields by matching impact', () => {
    const result = computeProfessionalCompleteness(empty);
    expect(result.missing.map((m) => m.key)).toEqual([
      ...PROFESSIONAL_COMPLETENESS_FIELDS,
    ]);
    expect(result.percent).toBe(0);
  });

  it('puts skills and portfolio before budget and copy fields', () => {
    const result = computeProfessionalCompleteness({
      ...empty,
      displayName: 'Aye',
      categorySlug: 'photography',
      acceptingWork: true,
      typicalTurnaroundDays: 3,
      minBudgetMmk: 50_000,
      headlineMy: 'ဓာတ်ပုံ',
      headlineEn: 'Photo',
      bioMy: 'မြန်မာ စာကြောင်း အလုံအလောက် ရှိသော အကြောင်းအရာ စာသား ဖြစ်သည်။',
      bioEn: 'Enough English bio text for the minimum length check here.',
    });
    expect(result.missing.map((m) => m.key)).toEqual([
      'skills',
      'portfolio',
      'workLinks',
    ]);
  });

  it('requires categoryOtherText when slug is other', () => {
    const missingOther = computeProfessionalCompleteness({
      ...full,
      categorySlug: 'other',
      categoryOtherText: '',
    });
    expect(missingOther.missing.some((m) => m.key === 'category')).toBe(true);

    const withOther = computeProfessionalCompleteness({
      ...full,
      categorySlug: 'other',
      categoryOtherText: 'Custom craft',
    });
    expect(withOther.missing.some((m) => m.key === 'category')).toBe(false);
  });

  it('returns 100% when every weighted field is filled', () => {
    const result = computeProfessionalCompleteness(full);
    expect(result.percent).toBe(100);
    expect(result.missing).toEqual([]);
  });

  it('maps anchors for edit-page focus targets', () => {
    const result = computeProfessionalCompleteness({
      ...full,
      skills: [],
      portfolioCount: 0,
    });
    expect(result.missing).toEqual([
      { key: 'skills', anchor: 'skills' },
      { key: 'portfolio', anchor: 'portfolio' },
    ]);
  });
});

describe('completenessInputFromProfile', () => {
  it('reads counts and stats from a profile-shaped object', () => {
    const input = completenessInputFromProfile({
      displayName: 'Aye Aye',
      category: { slug: 'illustration' },
      categoryOtherText: null,
      skills: ['procreate'],
      portfolio: [{ id: '1' }],
      workLinks: [],
      headlineMy: null,
      headlineEn: 'Illustrator',
      bioMy: null,
      bioEn: null,
      acceptingWork: true,
      stats: { typicalTurnaroundDays: 7, minBudgetMmk: null },
    });
    const result = computeProfessionalCompleteness(input);
    expect(result.missing.map((m) => m.key)).toContain('workLinks');
    expect(result.missing.map((m) => m.key)).toContain('minBudget');
    expect(result.missing.map((m) => m.key)).not.toContain('skills');
    expect(result.missing.map((m) => m.key)).not.toContain('portfolio');
  });
});
