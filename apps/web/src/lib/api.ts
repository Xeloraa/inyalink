import type {
  AuthMeResponse,
  BriefInterestResponse,
  BriefResponse,
  CategoriesResponse,
  CategorySlug,
  ConversationDetail,
  ConversationListResponse,
  ConverseBriefInput,
  ConverseBriefResponse,
  CreateBriefInput,
  GenerateRoadmapResponse,
  LogoutResponse,
  MatchExplanationResponse,
  MatchingCandidatesResponse,
  MatchingFeedResponse,
  PortfolioItem,
  PortfolioUploadItem,
  ProfessionalApplyInput,
  ProfessionalApplyResponse,
  ProfessionalMe,
  ProfessionalProfile,
  ProfessionalSkillsResponse,
  ProfessionalUpdateInput,
  ProfessionalsListResponse,
  ProfessionalsSort,
  SubmitBriefInput,
  UpdateBriefInput,
  UpsertConversationInput,
} from '@inyalink/shared';
import { apiFetch } from './apiClient';

export function converseBrief(body: ConverseBriefInput) {
  return apiFetch<ConverseBriefResponse>('/api/v1/ai/brief/converse', {
    method: 'POST',
    body: JSON.stringify(body),
    timeoutMs: 45_000,
  });
}

export function listConversations() {
  return apiFetch<ConversationListResponse>('/api/v1/conversations');
}

export function getConversation(id: string) {
  return apiFetch<ConversationDetail>(
    `/api/v1/conversations/${encodeURIComponent(id)}`,
  );
}

export function createConversation(body: UpsertConversationInput) {
  return apiFetch<ConversationDetail>('/api/v1/conversations', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateConversation(id: string, body: UpsertConversationInput) {
  return apiFetch<ConversationDetail>(
    `/api/v1/conversations/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    },
  );
}

export function generateRoadmap(goal: string, locale: 'my' | 'en' = 'my') {
  return apiFetch<GenerateRoadmapResponse>('/api/v1/ai/roadmap', {
    method: 'POST',
    body: JSON.stringify({ goal, locale }),
    timeoutMs: 60_000,
  });
}

export function createBrief(body: CreateBriefInput) {
  return apiFetch<BriefResponse>('/api/v1/briefs', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateBrief(id: string, body: UpdateBriefInput) {
  return apiFetch<BriefResponse>(`/api/v1/briefs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function submitBrief(id: string, body: SubmitBriefInput = { urgent: false }) {
  return apiFetch<BriefResponse>(`/api/v1/briefs/${id}/submit`, {
    method: 'POST',
    body: JSON.stringify({ urgent: body.urgent ?? false }),
  });
}

export function getBrief(id: string) {
  return apiFetch<BriefResponse>(`/api/v1/briefs/${id}`);
}

export function getMatchCandidates(briefId: string) {
  return apiFetch<MatchingCandidatesResponse>(
    `/api/v1/matching/candidates?briefId=${encodeURIComponent(briefId)}`,
  );
}

export function getMatchingFeed() {
  return apiFetch<MatchingFeedResponse>('/api/v1/matching/feed');
}

export function expressInterest(briefId: string) {
  return apiFetch<BriefInterestResponse>(
    `/api/v1/matching/briefs/${encodeURIComponent(briefId)}/interest`,
    { method: 'POST' },
  );
}

export function withdrawInterest(briefId: string) {
  return apiFetch<BriefInterestResponse>(
    `/api/v1/matching/briefs/${encodeURIComponent(briefId)}/interest`,
    { method: 'DELETE' },
  );
}

export function getMatchExplanation(
  briefId: string,
  professionalId: string,
  locale: 'my' | 'en' = 'my',
) {
  const qs = new URLSearchParams({
    briefId,
    locale,
  });
  return apiFetch<MatchExplanationResponse>(
    `/api/v1/matching/candidates/${encodeURIComponent(professionalId)}/explanation?${qs.toString()}`,
    { timeoutMs: 45_000 },
  );
}

export function fetchAuthMe() {
  return apiFetch<AuthMeResponse>('/api/v1/auth/me');
}

export function logoutApi() {
  return apiFetch<LogoutResponse>('/api/v1/auth/logout', {
    method: 'POST',
  });
}

export function getProfessional(id: string) {
  return apiFetch<ProfessionalProfile>(
    `/api/v1/professionals/${encodeURIComponent(id)}`,
  );
}

export type ListProfessionalsParams = {
  category?: CategorySlug | CategorySlug[];
  skill?: string[];
  q?: string;
  sort?: ProfessionalsSort;
  minBudget?: number;
  maxBudget?: number;
  acceptingOnly?: boolean;
};

export function listProfessionals(params: ListProfessionalsParams = {}) {
  const qs = new URLSearchParams();
  if (params.category) {
    const cats = Array.isArray(params.category)
      ? params.category
      : [params.category];
    for (const c of cats) qs.append('category', c);
  }
  for (const s of params.skill ?? []) qs.append('skill', s);
  if (params.q) qs.set('q', params.q);
  if (params.sort) qs.set('sort', params.sort);
  if (params.minBudget !== undefined) qs.set('minBudget', String(params.minBudget));
  if (params.maxBudget !== undefined) qs.set('maxBudget', String(params.maxBudget));
  if (params.acceptingOnly) qs.set('acceptingOnly', 'true');
  const query = qs.toString();
  return apiFetch<ProfessionalsListResponse>(
    `/api/v1/professionals${query ? `?${query}` : ''}`,
  );
}

export function getCategories() {
  return apiFetch<CategoriesResponse>('/api/v1/professionals/categories');
}

export function getProfessionalSkills() {
  return apiFetch<ProfessionalSkillsResponse>('/api/v1/professionals/skills');
}

export function applyAsProfessional(body: ProfessionalApplyInput) {
  return apiFetch<ProfessionalApplyResponse>('/api/v1/professionals/apply', {
    method: 'POST',
    body: JSON.stringify(body),
    timeoutMs: 30_000,
  });
}

export function getMyProfessional() {
  return apiFetch<ProfessionalMe>('/api/v1/professionals/me');
}

export function updateMyProfessional(body: ProfessionalUpdateInput) {
  return apiFetch<ProfessionalMe>('/api/v1/professionals/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
    timeoutMs: 30_000,
  });
}

export function addMyPortfolioItem(body: PortfolioUploadItem) {
  return apiFetch<PortfolioItem>('/api/v1/professionals/me/portfolio', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function deleteMyPortfolioItem(itemId: string) {
  return apiFetch<void>(
    `/api/v1/professionals/me/portfolio/${encodeURIComponent(itemId)}`,
    { method: 'DELETE' },
  );
}
