import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./admin.repo.js', () => ({
  countPendingProfessionals: vi.fn(),
  countOpenBriefs: vi.fn(),
  countActiveEngagements: vi.fn(),
  sumAiCostThisWeek: vi.fn(),
  fallbackStats: vi.fn(),
  listPendingProfessionals: vi.fn(),
  listPortfolioForPros: vi.fn(),
  listWorkLinksForPros: vi.fn(),
  getProfessionalStatus: vi.fn(),
  reviewProfessional: vi.fn(),
  insertAuditLog: vi.fn(),
  listBriefs: vi.fn(),
  listSurfacedForBriefs: vi.fn(),
  getBriefForAssign: vi.fn(),
  isApprovedProfessional: vi.fn(),
  findEngagement: vi.fn(),
  insertAdminAssignment: vi.fn(),
  markBriefMatched: vi.fn(),
  listEngagements: vi.fn(),
  getEngagementById: vi.fn(),
  patchEngagementStatus: vi.fn(),
  opsMetricsCounts: vi.fn(),
}));

vi.mock('../notifications/notifications.service.js', () => ({
  notifyApplicationReviewed: vi.fn(async () => undefined),
  notifyEngagementProposed: vi.fn(async () => undefined),
}));

import * as repo from './admin.repo.js';
import {
  _test,
  assignBrief,
  getDashboard,
  getOpsMetrics,
  listEngagements,
  reviewProfessional,
} from './admin.service.js';

describe('admin.service helpers', () => {
  it('computes rate safely', () => {
    expect(_test.rate(1, 4)).toBe(0.25);
    expect(_test.rate(1, 0)).toBe(0);
  });

  it('flags proposed past respond_by as stalled', () => {
    const info = _test.stallInfo({
      id: 'e0000000-0000-4000-8000-000000000001',
      briefId: 'f0000000-0000-4000-8000-000000000001',
      briefTitle: 'Logo',
      professionalId: 'a0000000-0000-4000-8000-000000000001',
      professionalDisplayName: 'Pro',
      clientId: 'b0000000-0000-4000-8000-000000000001',
      clientDisplayName: 'Client',
      status: 'proposed',
      proposedAt: new Date(Date.now() - 48 * 3600_000).toISOString(),
      respondBy: new Date(Date.now() - 3600_000).toISOString(),
      updatedAt: new Date(Date.now() - 48 * 3600_000).toISOString(),
      acceptedAt: null,
    });
    expect(info.stalled).toBe(true);
    expect(info.stallReason).toBe('past_respond_by');
  });

  it('flags in_progress over 30 days as stalled', () => {
    const old = new Date(Date.now() - 40 * 24 * 3600_000).toISOString();
    const info = _test.stallInfo({
      id: 'e0000000-0000-4000-8000-000000000002',
      briefId: 'f0000000-0000-4000-8000-000000000002',
      briefTitle: 'Site',
      professionalId: 'a0000000-0000-4000-8000-000000000001',
      professionalDisplayName: 'Pro',
      clientId: 'b0000000-0000-4000-8000-000000000001',
      clientDisplayName: 'Client',
      status: 'in_progress',
      proposedAt: old,
      respondBy: null,
      updatedAt: old,
      acceptedAt: old,
    });
    expect(info.stalled).toBe(true);
    expect(info.stallReason).toBe('in_progress_over_30d');
  });
});

describe('admin.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds dashboard counts', async () => {
    vi.mocked(repo.countPendingProfessionals).mockResolvedValue(3);
    vi.mocked(repo.countOpenBriefs).mockResolvedValue(5);
    vi.mocked(repo.countActiveEngagements).mockResolvedValue(2);
    vi.mocked(repo.sumAiCostThisWeek).mockResolvedValue(1.25);
    vi.mocked(repo.fallbackStats).mockResolvedValue({
      briefsRanked: 10,
      briefsWithFallback: 2,
    });

    const dash = await getDashboard();
    expect(dash.pendingProfessionals).toBe(3);
    expect(dash.fallbackRate).toBe(0.2);
    expect(dash.aiCostUsdThisWeek).toBe(1.25);
  });

  it('reviews a professional and writes audit_log', async () => {
    vi.mocked(repo.getProfessionalStatus).mockResolvedValue('pending');
    vi.mocked(repo.reviewProfessional).mockResolvedValue({
      userId: 'a0000000-0000-4000-8000-000000000001',
      status: 'approved',
      reviewNote: null,
    });
    vi.mocked(repo.insertAuditLog).mockResolvedValue();

    const result = await reviewProfessional(
      'a0000000-0000-4000-8000-000000000001',
      { action: 'approve' },
      'c0000000-0000-4000-8000-000000000001',
    );

    expect(result.status).toBe('approved');
    expect(repo.insertAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'professional.approve',
        entityType: 'professional',
      }),
    );
  });

  it('rejects review without reason', async () => {
    vi.mocked(repo.getProfessionalStatus).mockResolvedValue('pending');
    await expect(
      reviewProfessional(
        'a0000000-0000-4000-8000-000000000001',
        { action: 'reject' },
        'c0000000-0000-4000-8000-000000000001',
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', statusCode: 400 });
  });

  it('assigns a brief with audit', async () => {
    vi.mocked(repo.getBriefForAssign).mockResolvedValue({
      id: 'f0000000-0000-4000-8000-000000000001',
      status: 'submitted',
      clientId: 'b0000000-0000-4000-8000-000000000001',
    });
    vi.mocked(repo.isApprovedProfessional).mockResolvedValue(true);
    vi.mocked(repo.findEngagement).mockResolvedValue(null);
    vi.mocked(repo.insertAdminAssignment).mockResolvedValue({
      id: 'e0000000-0000-4000-8000-000000000001',
      status: 'proposed',
    });
    vi.mocked(repo.markBriefMatched).mockResolvedValue();
    vi.mocked(repo.insertAuditLog).mockResolvedValue();

    const result = await assignBrief(
      'f0000000-0000-4000-8000-000000000001',
      { professionalId: 'a0000000-0000-4000-8000-000000000001' },
      'c0000000-0000-4000-8000-000000000001',
    );

    expect(result.engagementId).toBe('e0000000-0000-4000-8000-000000000001');
    expect(repo.insertAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'brief.assign' }),
    );
  });

  it('lists engagements with stall flags', async () => {
    vi.mocked(repo.listEngagements).mockResolvedValue([
      {
        id: 'e0000000-0000-4000-8000-000000000001',
        briefId: 'f0000000-0000-4000-8000-000000000001',
        briefTitle: 'Logo',
        professionalId: 'a0000000-0000-4000-8000-000000000001',
        professionalDisplayName: 'Pro',
        clientId: 'b0000000-0000-4000-8000-000000000001',
        clientDisplayName: 'Client',
        status: 'proposed',
        proposedAt: new Date(Date.now() - 48 * 3600_000).toISOString(),
        respondBy: new Date(Date.now() - 3600_000).toISOString(),
        updatedAt: new Date(Date.now() - 48 * 3600_000).toISOString(),
        acceptedAt: null,
      },
    ]);

    const list = await listEngagements({});
    expect(list.items[0]?.stalled).toBe(true);
    expect(list.items[0]?.stallReason).toBe('past_respond_by');
  });

  it('computes ops metrics including repeat rate', async () => {
    vi.mocked(repo.opsMetricsCounts).mockResolvedValue({
      briefsCreated: 10,
      briefsMatched: 5,
      engagementsStarted: 8,
      engagementsConfirmed: 4,
      clientsWithConfirmed: 4,
      clientsWithRepeatConfirmed: 1,
    });
    vi.mocked(repo.sumAiCostThisWeek).mockResolvedValue(0.5);
    vi.mocked(repo.fallbackStats).mockResolvedValue({
      briefsRanked: 10,
      briefsWithFallback: 1,
    });

    const m = await getOpsMetrics();
    expect(m.matchRate).toBe(0.5);
    expect(m.completionRate).toBe(0.5);
    expect(m.clientRepeatRate).toBe(0.25);
    expect(m.fallbackRate).toBe(0.1);
  });
});
