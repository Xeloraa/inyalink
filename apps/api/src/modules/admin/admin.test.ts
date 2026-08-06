import { describe, expect, it, vi } from 'vitest';

vi.mock('../matching/matching.service.js', () => ({
  getAdminMetrics: vi.fn(async () => ({
    briefsRanked: 10,
    briefsWithFallback: 2,
    fallbackRate: 0.2,
    briefsUrgent: 1,
    openPoolBriefs: 3,
  })),
}));

import { getMetrics } from './admin.service.js';

describe('admin.service', () => {
  it('returns fallback rate from matching metrics', async () => {
    const m = await getMetrics();
    expect(m.fallbackRate).toBe(0.2);
    expect(m.briefsWithFallback).toBe(2);
  });
});
