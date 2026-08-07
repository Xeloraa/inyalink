import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as repo from './professionals.repo.js';
import * as service from './professionals.service.js';

vi.mock('./professionals.repo.js', () => ({
  listApprovedProfiles: vi.fn(),
  listSkillFacets: vi.fn(),
  listCategories: vi.fn(),
  getCategoryBySlug: vi.fn(),
  getApprovedProfileById: vi.fn(),
  getProfileByUserId: vi.fn(),
  listPortfolio: vi.fn(),
  insertApplication: vi.fn(),
  upsertApplicantProfile: vi.fn(),
  updateProfessional: vi.fn(),
  updateDisplayName: vi.fn(),
  addPortfolioItem: vi.fn(),
  deletePortfolioItem: vi.fn(),
  countPortfolioItems: vi.fn(),
}));

vi.mock('@inyalink/burmese', () => ({
  normalizeToUnicode: (text: string) => text,
}));

vi.mock('../../lib/config.js', () => ({
  config: { demoMode: true },
}));

function makeRow(
  overrides: Partial<repo.ProfessionalProfileRow> = {},
): repo.ProfessionalProfileRow {
  return {
    userId: 'a0000000-0000-4000-8000-000000000001',
    displayName: 'မင်းထက် · Min Thet',
    avatarUrl: '/images/avatars/pro01.jpg',
    headlineMy: 'လိုဂို',
    headlineEn: 'Logo and brand design',
    bioMy: 'ကိုယ်ရေးအကျဉ်း',
    bioEn: 'Logo systems for small businesses.',
    skills: ['logo', 'branding'],
    status: 'approved',
    acceptingWork: true,
    typicalTurnaroundDays: 5,
    minBudgetMmk: 150000,
    categoryId: 'c0000000-0000-4000-8000-000000000001',
    categorySlug: 'graphic-design',
    categoryNameMy: 'ဂရပ်ဖစ်',
    categoryNameEn: 'Graphic Design',
    completedCount: 4,
    declinedCount: 0,
    uniqueClients: 3,
    completionRatePct: 100,
    medianResponseMins: 30,
    ...overrides,
  };
}

describe('professionals.service', () => {
  beforeEach(() => {
    vi.mocked(repo.listApprovedProfiles).mockReset();
    vi.mocked(repo.listSkillFacets).mockReset();
    vi.mocked(repo.listCategories).mockReset();
    vi.mocked(repo.getApprovedProfileById).mockReset();
    vi.mocked(repo.getProfileByUserId).mockReset();
    vi.mocked(repo.listPortfolio).mockReset();
    vi.mocked(repo.getCategoryBySlug).mockReset();
    vi.mocked(repo.insertApplication).mockReset();
    vi.mocked(repo.upsertApplicantProfile).mockReset();
    vi.mocked(repo.updateProfessional).mockReset();
    vi.mocked(repo.updateDisplayName).mockReset();
    vi.mocked(repo.addPortfolioItem).mockReset();
    vi.mocked(repo.deletePortfolioItem).mockReset();
    vi.mocked(repo.countPortfolioItems).mockReset();
  });

  it('lists professionals with bilingual bios for the directory rows', async () => {
    vi.mocked(repo.listApprovedProfiles).mockResolvedValue([makeRow()]);

    const result = await service.listProfessionals({});
    expect(result.professionals).toHaveLength(1);
    expect(result.professionals[0]?.bioEn).toBe(
      'Logo systems for small businesses.',
    );
    expect(result.professionals[0]?.bioMy).toBe('ကိုယ်ရေးအကျဉ်း');
  });

  it('filters by search text and ranks name matches above bio matches', async () => {
    vi.mocked(repo.listApprovedProfiles).mockResolvedValue([
      makeRow({
        userId: 'a0000000-0000-4000-8000-000000000002',
        displayName: 'Aye Chan',
        headlineEn: 'Poster design',
        bioEn: 'I once shipped a logo for a bakery.',
        skills: ['poster'],
      }),
      makeRow({
        userId: 'a0000000-0000-4000-8000-000000000001',
        displayName: 'Logo Min',
        headlineEn: 'Brand design',
        bioEn: 'Brand kits.',
        skills: ['branding'],
      }),
      makeRow({
        userId: 'a0000000-0000-4000-8000-000000000003',
        displayName: 'Win Htut',
        headlineEn: 'Business websites',
        bioEn: 'Fast marketing sites.',
        skills: ['html'],
      }),
    ]);

    const result = await service.listProfessionals({
      q: 'logo',
      sort: 'relevance',
    });
    expect(result.professionals.map((p) => p.displayName)).toEqual([
      'Logo Min',
      'Aye Chan',
    ]);
  });

  it('keeps professionals offering any selected skill', async () => {
    vi.mocked(repo.listApprovedProfiles).mockResolvedValue([
      makeRow({
        userId: 'a0000000-0000-4000-8000-000000000001',
        skills: ['logo', 'branding'],
      }),
      makeRow({
        userId: 'a0000000-0000-4000-8000-000000000002',
        skills: ['poster'],
      }),
    ]);

    const result = await service.listProfessionals({
      skills: ['Branding', 'html'],
    });
    expect(result.professionals).toHaveLength(1);
    expect(result.professionals[0]?.id).toBe(
      'a0000000-0000-4000-8000-000000000001',
    );
  });

  it('sorts by most completed jobs', async () => {
    vi.mocked(repo.listApprovedProfiles).mockResolvedValue([
      makeRow({
        userId: 'a0000000-0000-4000-8000-000000000001',
        displayName: 'A',
        completedCount: 2,
      }),
      makeRow({
        userId: 'a0000000-0000-4000-8000-000000000002',
        displayName: 'B',
        completedCount: 9,
      }),
    ]);

    const result = await service.listProfessionals({ sort: 'jobs' });
    expect(result.professionals.map((p) => p.displayName)).toEqual(['B', 'A']);
  });

  it('sorts by fastest reply with unknown medians last', async () => {
    vi.mocked(repo.listApprovedProfiles).mockResolvedValue([
      makeRow({
        userId: 'a0000000-0000-4000-8000-000000000001',
        displayName: 'NoData',
        medianResponseMins: null,
      }),
      makeRow({
        userId: 'a0000000-0000-4000-8000-000000000002',
        displayName: 'Slow',
        medianResponseMins: 120,
      }),
      makeRow({
        userId: 'a0000000-0000-4000-8000-000000000003',
        displayName: 'Fast',
        medianResponseMins: 15,
      }),
    ]);

    const result = await service.listProfessionals({ sort: 'reply' });
    expect(result.professionals.map((p) => p.displayName)).toEqual([
      'Fast',
      'Slow',
      'NoData',
    ]);
  });

  it('caps skill facets at twelve', async () => {
    vi.mocked(repo.listSkillFacets).mockResolvedValue(
      Array.from({ length: 20 }, (_, i) => ({
        name: `skill-${i}`,
        count: 20 - i,
      })),
    );

    const result = await service.listSkills();
    expect(result.skills).toHaveLength(12);
    expect(result.skills[0]).toEqual({ name: 'skill-0', count: 20 });
  });

  it('returns public profile with portfolio', async () => {
    vi.mocked(repo.getApprovedProfileById).mockResolvedValue(makeRow());
    vi.mocked(repo.listPortfolio).mockResolvedValue([
      {
        id: 'd0000000-0000-4000-8000-000000000001',
        caption: 'Study',
        externalUrl: '/images/portfolio/01.svg',
        storagePath: null,
        sort: 0,
      },
    ]);

    const profile = await service.getPublicProfile(
      'a0000000-0000-4000-8000-000000000001',
    );
    expect(profile.verified).toBe(true);
    expect(profile.portfolio).toHaveLength(1);
    expect(profile.stats.minBudgetMmk).toBe(150000);
  });

  it('lists categories', async () => {
    vi.mocked(repo.listCategories).mockResolvedValue([
      {
        id: 'c0000000-0000-4000-8000-000000000001',
        slug: 'graphic-design',
        nameMy: 'ဂရပ်ဖစ်',
        nameEn: 'Graphic Design',
      },
    ]);
    const result = await service.listCategories();
    expect(result.categories[0]?.slug).toBe('graphic-design');
  });

  it('auto-approves applications when DEMO_MODE is on', async () => {
    vi.mocked(repo.getProfileByUserId).mockResolvedValue(null);
    vi.mocked(repo.getCategoryBySlug).mockResolvedValue({
      id: 'c0000000-0000-4000-8000-000000000001',
      slug: 'graphic-design',
      nameMy: 'ဂရပ်ဖစ်',
      nameEn: 'Graphic Design',
    });
    vi.mocked(repo.upsertApplicantProfile).mockResolvedValue();
    vi.mocked(repo.insertApplication).mockResolvedValue({
      professionalId: 'a0000000-0000-4000-8000-000000000099',
      status: 'approved',
    });

    const result = await service.applyAsProfessional(
      {
        displayName: 'New Pro',
        categorySlug: 'graphic-design',
        skills: ['logo'],
        headlineMy: 'လိုဂိုဒီဇိုင်း',
        headlineEn: 'Logo design',
        bioMy: 'ကျွန်ုပ်သည် လိုဂိုဒီဇိုင်း လုပ်ပါသည်။ အသေးစား စီးပွားရေးများအတွက်။',
        bioEn: 'I design logos for small businesses across Myanmar.',
        typicalTurnaroundDays: 5,
        minBudgetMmk: 100_000,
        acceptingWork: true,
        portfolio: [{ externalUrl: 'https://example.com/work.jpg' }],
      },
      'a0000000-0000-4000-8000-000000000099',
    );

    expect(result.status).toBe('approved');
    expect(repo.insertApplication).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved' }),
    );
  });

  it('rejects a second apply when already pending or approved', async () => {
    vi.mocked(repo.getCategoryBySlug).mockResolvedValue({
      id: 'c0000000-0000-4000-8000-000000000001',
      slug: 'graphic-design',
      nameMy: 'ဂရပ်ဖစ်',
      nameEn: 'Graphic Design',
    });
    vi.mocked(repo.getProfileByUserId).mockResolvedValue(makeRow());

    await expect(
      service.applyAsProfessional(
        {
          displayName: 'New Pro',
          categorySlug: 'graphic-design',
          skills: ['logo'],
          headlineMy: 'လိုဂိုဒီဇိုင်း',
          headlineEn: 'Logo design',
          bioMy: 'ကျွန်ုပ်သည် လိုဂိုဒီဇိုင်း လုပ်ပါသည်။ အသေးစား စီးပွားရေးများအတွက်။',
          bioEn: 'I design logos for small businesses across Myanmar.',
          typicalTurnaroundDays: 5,
          minBudgetMmk: 100_000,
          acceptingWork: true,
          portfolio: [{ externalUrl: 'https://example.com/work.jpg' }],
        },
        'a0000000-0000-4000-8000-000000000001',
      ),
    ).rejects.toMatchObject({ code: 'ALREADY_APPLIED', statusCode: 409 });
  });

  it('returns own professional profile with status', async () => {
    vi.mocked(repo.getProfileByUserId).mockResolvedValue(makeRow());
    vi.mocked(repo.listPortfolio).mockResolvedValue([]);

    const me = await service.getMyProfessional(
      'a0000000-0000-4000-8000-000000000001',
    );
    expect(me.status).toBe('approved');
    expect(me.displayName).toBe('မင်းထက် · Min Thet');
  });
});
