/**
 * Match explanations — LLM only. Failures return explanation: null.
 * Never used by GET /candidates (that path must stay LLM-free).
 */
import {
  MatchExplanationResponseSchema,
  type MatchExplanationResponse,
  type UiLocale,
} from '@inyalink/shared';
import { explainMatch } from '../../ai/features/explainMatch.js';
import { config } from '../../lib/config.js';
import { AppError } from '../../middleware/errors.js';
import * as repo from './matching.repo.js';

function resolveModel(): string {
  switch (config.aiProvider) {
    case 'groq':
      return process.env['GROQ_MODEL'] ?? 'openai/gpt-oss-120b';
    case 'openai':
      return process.env['OPENAI_MODEL'] ?? 'gpt-4o-mini';
    case 'gemini':
      return process.env['GEMINI_MODEL'] ?? 'gemini-2.0-flash';
    default:
      return 'unknown';
  }
}

async function logAiCall(
  row: Parameters<typeof repo.insertAiCall>[0],
): Promise<void> {
  try {
    await repo.insertAiCall(row);
  } catch (err) {
    console.error('ai_calls insert failed', err);
  }
}

export async function getCandidateExplanation(
  briefId: string,
  professionalId: string,
  locale: UiLocale = 'my',
  actorId: string,
): Promise<MatchExplanationResponse> {
  const brief = await repo.getBriefForMatching(briefId);
  if (!brief) {
    throw new AppError(404, 'BRIEF_NOT_FOUND', 'Brief not found');
  }
  if (brief.clientId !== actorId) {
    throw new AppError(403, 'FORBIDDEN', 'Not allowed to access this brief');
  }
  if (!brief.categoryId) {
    throw new AppError(
      400,
      'BRIEF_NOT_READY',
      'Brief needs a category before matching',
    );
  }

  const pro = await repo.getApprovedProById(professionalId);
  if (!pro) {
    throw new AppError(404, 'PROFESSIONAL_NOT_FOUND', 'Professional not found');
  }
  if (pro.categoryId !== brief.categoryId) {
    throw new AppError(
      400,
      'CATEGORY_MISMATCH',
      'Professional is not in this brief’s category',
    );
  }

  let explained;
  try {
    explained = await explainMatch({
      briefId: brief.id,
      brief: {
        title: brief.title,
        description: brief.description,
        requirements: brief.requirements,
        budgetMinMmk: brief.budgetMinMmk,
        budgetMaxMmk: brief.budgetMaxMmk,
        language: brief.language,
      },
      professional: {
        displayName: pro.displayName,
        headlineMy: pro.headlineMy,
        headlineEn: pro.headlineEn,
        skills: pro.skills,
        minBudgetMmk: pro.minBudgetMmk,
        typicalTurnaroundDays: pro.typicalTurnaroundDays,
        completionRatePct: pro.completionRatePct,
        completedCount: pro.completedCount,
      },
      locale,
      model: resolveModel(),
      log: logAiCall,
    });
  } catch (err) {
    // Explanation must never fail the professional list (separate endpoint).
    console.error('getCandidateExplanation AI failure', err);
    return MatchExplanationResponseSchema.parse({
      briefId: brief.id,
      professionalId: pro.userId,
      explanation: null,
      retryable: true,
      notice: 'One moment — the assistant is busy. Please try again.',
    });
  }

  if (!explained.ok) {
    return MatchExplanationResponseSchema.parse({
      briefId: brief.id,
      professionalId: pro.userId,
      explanation: null,
      retryable: explained.retryable,
      notice: explained.retryable
        ? 'One moment — the assistant is busy. Please try again.'
        : undefined,
    });
  }

  try {
    await repo.updateCandidateExplanation(
      brief.id,
      pro.userId,
      explained.explanation,
    );
  } catch (err) {
    console.error('updateCandidateExplanation failed', err);
  }

  return MatchExplanationResponseSchema.parse({
    briefId: brief.id,
    professionalId: pro.userId,
    explanation: explained.explanation,
  });
}
