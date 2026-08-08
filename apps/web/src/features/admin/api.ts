import type {
  AdminAssignBriefInput,
  AdminAssignBriefResponse,
  AdminBriefsListResponse,
  AdminDashboardResponse,
  AdminEngagementsListResponse,
  AdminOpsMetricsResponse,
  AdminPatchEngagementStatusInput,
  AdminPatchEngagementStatusResponse,
  AdminPendingProfessionalsResponse,
  AdminReviewProfessionalInput,
  AdminReviewProfessionalResponse,
  BriefStatus,
  EngagementStatus,
} from '@inyalink/shared';
import { apiFetch } from '../../lib/apiClient';

export function fetchAdminDashboard() {
  return apiFetch<AdminDashboardResponse>('/api/v1/admin/dashboard');
}

export function fetchAdminPendingProfessionals() {
  return apiFetch<AdminPendingProfessionalsResponse>(
    '/api/v1/admin/professionals/pending',
  );
}

export function reviewAdminProfessional(
  id: string,
  body: AdminReviewProfessionalInput,
) {
  return apiFetch<AdminReviewProfessionalResponse>(
    `/api/v1/admin/professionals/${encodeURIComponent(id)}/review`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export function fetchAdminBriefs(status?: BriefStatus) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiFetch<AdminBriefsListResponse>(`/api/v1/admin/briefs${q}`);
}

export function assignAdminBrief(briefId: string, body: AdminAssignBriefInput) {
  return apiFetch<AdminAssignBriefResponse>(
    `/api/v1/admin/briefs/${encodeURIComponent(briefId)}/assign`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export function fetchAdminEngagements(status?: EngagementStatus) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiFetch<AdminEngagementsListResponse>(
    `/api/v1/admin/engagements${q}`,
  );
}

export function patchAdminEngagementStatus(
  id: string,
  body: AdminPatchEngagementStatusInput,
) {
  return apiFetch<AdminPatchEngagementStatusResponse>(
    `/api/v1/admin/engagements/${encodeURIComponent(id)}/status`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
}

export function fetchAdminMetrics() {
  return apiFetch<AdminOpsMetricsResponse>('/api/v1/admin/metrics');
}
