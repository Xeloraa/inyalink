import {
  detectResponseLocale,
  normalizeToUnicode,
} from '@inyalink/burmese';
import {
  classifyInputShape,
  ConverseBriefResponseSchema,
  GenerateRoadmapResponseSchema,
  signalsDontKnow,
  type ConverseBriefInput,
  type ConverseBriefResponse,
  type GenerateRoadmapInput,
  type GenerateRoadmapResponse,
  type UiLocale,
} from '@inyalink/shared';
import {
  isDemoConverseOpening,
  isDemoRoadmapGoal,
  lookupConverseDemoFallback,
  lookupRoadmapDemoFallback,
  openingUserMessage,
} from '../../ai/demo-fallback/cache.js';
import { generateRoadmap } from '../../ai/features/generateRoadmap.js';
import { structureBrief } from '../../ai/features/structureBrief.js';
import { aiApiKeyPresent, config } from '../../lib/config.js';
import { AppError } from '../../middleware/errors.js';
import * as repo from './ai.repo.js';

/** Response language from the most recent user message (not the UI toggle). */
function converseResponseLocale(
  messages: ConverseBriefInput['messages'],
): UiLocale {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m?.role === 'user') return detectResponseLocale(m.content);
  }
  return 'my';
}

function latestUserContent(
  messages: ConverseBriefInput['messages'],
): string | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m?.role === 'user') return m.content;
  }
  return null;
}

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

function normalizeConverseInput(input: ConverseBriefInput): ConverseBriefInput {
  return {
    briefDraft: input.briefDraft,
    locale: input.locale,
    messages: input.messages.map((m) => ({
      role: m.role,
      content: normalizeToUnicode(m.content),
    })),
  };
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

function logAiRequestStart(
  feature: 'structure_brief' | 'roadmap',
  detail: Record<string, unknown> = {},
): void {
  // Plain stdout — Railway deploy logs; do not use a leveled logger here.
  console.log('[ai] request start', {
    feature,
    provider: config.aiProvider || '(unset)',
    apiKeyPresent: aiApiKeyPresent(),
    fallbackEnabled: config.demoAiFallback,
    demoMode: config.demoMode,
    nodeEnv: process.env['NODE_ENV'] ?? '(unset)',
    ...detail,
  });
}

async function serveConverseFallback(
  messages: ConverseBriefInput['messages'],
  locale: ConverseBriefInput['locale'],
  providerErrorKind: string,
): Promise<ConverseBriefResponse | null> {
  if (!config.demoAiFallback) {
    console.log('[demo-only] AI fallback cache skipped (DEMO_AI_FALLBACK=false)', {
      feature: 'structure_brief',
      providerErrorKind,
    });
    return null;
  }

  console.log('[demo-only] AI provider failed; checking fallback cache', {
    feature: 'structure_brief',
    providerErrorKind,
    locale,
  });
  const cached = lookupConverseDemoFallback(messages, locale);
  if (!cached) return null;

  console.log('[demo-only] AI fallback cache firing', {
    feature: 'structure_brief',
    providerErrorKind,
    complete: cached.complete,
    hasNextQuestion: Boolean(cached.nextQuestion),
  });
  await logAiCall({
    feature: 'structure_brief',
    provider: 'demo-fallback',
    model: 'demo-fixture',
    succeeded: true,
    errorKind: `demo_fallback:${providerErrorKind}`,
  });
  return cached;
}

async function serveRoadmapFallback(
  goal: string,
  locale: UiLocale,
  userId: string,
  providerErrorKind: string,
): Promise<GenerateRoadmapResponse | null> {
  if (!config.demoAiFallback) {
    console.log('[demo-only] AI fallback cache skipped (DEMO_AI_FALLBACK=false)', {
      feature: 'roadmap',
      providerErrorKind,
    });
    return null;
  }

  console.log('[demo-only] AI provider failed; checking fallback cache', {
    feature: 'roadmap',
    providerErrorKind,
    locale,
  });
  const cached = lookupRoadmapDemoFallback(goal, locale);
  if (!cached) return null;

  console.log('[demo-only] AI fallback cache firing', {
    feature: 'roadmap',
    providerErrorKind,
  });
  await logAiCall({
    feature: 'roadmap',
    provider: 'demo-fallback',
    model: 'demo-fixture',
    succeeded: true,
    errorKind: `demo_fallback:${providerErrorKind}`,
  });
  const { id } = await repo.insertRoadmap({
    userId,
    goalText: goal,
    language: cached.language ?? locale,
    steps: cached.steps ?? [],
  });
  return GenerateRoadmapResponseSchema.parse({
    ...cached,
    id,
  });
}

export async function converseBrief(
  input: ConverseBriefInput,
): Promise<ConverseBriefResponse> {
  const normalized = normalizeConverseInput(input);
  const responseLocale = converseResponseLocale(normalized.messages);
  const opening = openingUserMessage(normalized.messages);
  const latestUser = latestUserContent(normalized.messages);
  const userCount = normalized.messages.filter((m) => m.role === 'user').length;
  const assistantCount = normalized.messages.filter(
    (m) => m.role === 'assistant',
  ).length;
  const openingShape = opening ? classifyInputShape(opening) : 'ambiguous';

  console.log('[classify]', {
    opening,
    openingShape,
    latestUser,
    dontKnow: latestUser ? signalsDontKnow(latestUser) : false,
    userCount,
    assistantCount,
    responseLocale,
  });

  // Goal-shaped openings belong on the roadmap — never invent a service brief.
  if (assistantCount === 0 && userCount === 1 && openingShape === 'goal') {
    console.log('[classify] redirect → roadmap (goal-shaped opening)');
    return ConverseBriefResponseSchema.parse({
      redirectTo: 'roadmap',
      briefDraft: normalized.briefDraft ?? {},
      complete: false,
    });
  }

  // User declined / has no idea — stop probing and hand off to Guided Plan.
  if (latestUser && signalsDontKnow(latestUser) && userCount >= 2) {
    console.log('[classify] redirect → roadmap (dont-know)');
    return ConverseBriefResponseSchema.parse({
      redirectTo: 'roadmap',
      briefDraft: normalized.briefDraft ?? {},
      complete: false,
    });
  }

  const seedOpening = isDemoConverseOpening(normalized.messages);

  logAiRequestStart('structure_brief', {
    seedOpening,
    responseLocale,
    userMessageCount: userCount,
    openingShape,
  });

  // Provider fully unavailable — still complete seeded demos from cache.
  if (!config.aiProvider) {
    const cached = await serveConverseFallback(
      normalized.messages,
      responseLocale,
      'AI_NOT_CONFIGURED',
    );
    if (cached) return cached;
    throw new AppError(503, 'AI_NOT_CONFIGURED', 'AI provider is not configured');
  }

  // Seeded demos: skip 429 Retry-After so fallback runs before the client times out.
  const retryRateLimit = !(config.demoAiFallback && seedOpening);

  let raw;
  try {
    raw = await structureBrief({
      messages: normalized.messages,
      briefDraft: normalized.briefDraft,
      locale: responseLocale,
      maxQuestions: config.aiMaxTurns,
      model: resolveModel(),
      log: logAiCall,
      retryRateLimit,
    });
  } catch (err) {
    const cached = await serveConverseFallback(
      normalized.messages,
      responseLocale,
      'AI_UNAVAILABLE',
    );
    if (cached) return cached;
    throw err;
  }

  if (raw.providerFailed) {
    const cached = await serveConverseFallback(
      normalized.messages,
      responseLocale,
      raw.providerErrorKind ?? 'unknown',
    );
    if (cached) return cached;
  }

  return ConverseBriefResponseSchema.parse(raw);
}

export async function createRoadmap(
  input: GenerateRoadmapInput,
  userId: string,
): Promise<GenerateRoadmapResponse> {
  const goal = normalizeToUnicode(input.goal.trim());
  if (!goal) {
    throw new AppError(400, 'VALIDATION_ERROR', 'goal is required');
  }

  const seedGoal = isDemoRoadmapGoal(goal);
  logAiRequestStart('roadmap', {
    seedGoal,
    locale: input.locale,
  });

  if (!config.aiProvider) {
    const cached = await serveRoadmapFallback(
      goal,
      input.locale,
      userId,
      'AI_NOT_CONFIGURED',
    );
    if (cached) return cached;
    throw new AppError(503, 'AI_NOT_CONFIGURED', 'AI provider is not configured');
  }

  const categorySlugs = await repo.listActiveCategorySlugs();
  const retryRateLimit = !(config.demoAiFallback && seedGoal);
  const result = await generateRoadmap({
    goal,
    categorySlugs,
    locale: input.locale,
    model: resolveModel(),
    log: logAiCall,
    retryRateLimit,
  });

  if (!result.ok) {
    const cached = await serveRoadmapFallback(
      goal,
      input.locale,
      userId,
      result.errorKind,
    );
    if (cached) return cached;

    if (result.retryable) {
      return GenerateRoadmapResponseSchema.parse({
        retryable: true,
        notice:
          result.notice ??
          'One moment — the assistant is busy. Please try again.',
      });
    }
    throw new AppError(
      502,
      'AI_ROADMAP_FAILED',
      'Could not generate a roadmap. Please try again.',
    );
  }

  const { id } = await repo.insertRoadmap({
    userId,
    goalText: goal,
    language: result.language,
    steps: result.steps,
  });

  return GenerateRoadmapResponseSchema.parse({
    id,
    language: result.language,
    steps: result.steps,
    disclaimer: result.disclaimer,
  });
}
