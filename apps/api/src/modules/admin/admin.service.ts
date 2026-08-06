import type { AdminMetricsResponse } from '@inyalink/shared';
import * as matchingService from '../matching/matching.service.js';

export function getMetrics(): Promise<AdminMetricsResponse> {
  return matchingService.getAdminMetrics();
}
