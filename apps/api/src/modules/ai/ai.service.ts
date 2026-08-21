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
  type CustomerSourceBranch,
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
import { problemDiagnosisTurn } from '../../ai/diagnosis.js';
import { generateRoadmap } from '../../ai/features/generateRoadmap.js';
import { encodedProblemRoadmap } from '../../ai/problemPlans.js';
import { structureBrief } from '../../ai/features/structureBrief.js';
import { stepHireTurn } from '../../ai/stepHire.js';
import { aiApiKeyPresent, config } from '../../lib/config.js';
import { AppError } from '../../middleware/errors.js';
import * as repo from './ai.repo.js';

/**
 * Off-topic openings (dating, homework, trivia, …) always get essentially
 * the same decline-and-redirect — verified against real model output before
 * this was written (see git history / PR notes). Answering them costs a
 * full provider call for text that never varies with the input, so this
 * skips the model entirely, same as the goal→roadmap redirect below.
 * A few variants avoid the reply looking identical on every off-topic ask.
 */
const UNRELATED_REPLIES: Record<UiLocale, string[]> = {
  // Variant 1 matches apps/web's converse.unrelatedRedirect (used for
  // off-topic follow-ups mid-conversation) so the opening-turn case reads
  // the same as the rest of the app, not a second invented phrasing.
  my: [
    'ဒါက ဒီမှာ ကူညီပေးတဲ့ အပိုင်းမဟုတ်ပါဘူး။ logo၊ website၊ photography၊ social media ငှားမယ်၊ ဒါမှမဟုတ် ဆိုင်ဖွင့်မယ့် plan လိုချင်ရင် လုပ်နေတာ ပြောပေးပါ။',
    'ဒါကတော့ ဒီမှာ ကူညီပေးနိုင်တဲ့ အကြောင်းအရာ မဟုတ်ပါဘူး။ logo၊ website၊ ဓာတ်ပုံ၊ (သို့) social media အတွက် အကူအညီလိုချင်ရင် ပြောပြပါ။',
  ],
  en: [
    "That's outside what I help with here. If you're hiring for logo, website, photography, or social media — or planning a shop launch — say what you're working on.",
    "That's not something I can help with here. If you need a logo, website, photos, or social media help for your business, tell me what you're working on.",
  ],
};

function pickUnrelatedReply(locale: UiLocale): string {
  const options = UNRELATED_REPLIES[locale];
  return options[Math.floor(Math.random() * options.length)] ?? options[0]!;
}

/**
 * Provider down AND no fixture matched (exact or fuzzy) — the true
 * worst case. Better than the empty `{needs_human_review: true}` draft
 * this used to fall through to: tells the user something, in their
 * language, and invites another try rather than looking broken.
 */
const GENERIC_RETRY_NOTICE: Record<UiLocale, string> = {
  en: "One moment — I couldn't quite match that. Could you try rephrasing what you need?",
  my: 'ခဏစောင့်ပါ — ရှင်းရှင်း နားမလည်လိုက်ပါဘူး။ တခြားစကားလုံးတွေနဲ့ ပြန်ပြောပြပေးနိုင်ပါသလား။',
};

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
    nodeEnv: process.env['NODE_ENV'] ?? '(unset)',
    ...detail,
  });
}

async function serveConverseFallback(
  messages: ConverseBriefInput['messages'],
  locale: ConverseBriefInput['locale'],
  providerErrorKind: string,
  briefDraft: ConverseBriefResponse['briefDraft'] = {},
): Promise<ConverseBriefResponse | null> {
  if (!config.demoAiFallback) {
    console.log('[demo-only] AI fallback cache skipped (DEMO_AI_FALLBACK=false)', {
      feature: 'structure_brief',
      providerErrorKind,
    });
    return null;
  }

  const opening = openingUserMessage(messages);
  const latestUser = latestUserContent(messages);
  const asked = messages.filter((m) => m.role === 'assistant').length;

  console.log('[demo-only] AI provider failed; checking fallback cache', {
    feature: 'structure_brief',
    providerErrorKind,
    locale,
    opening,
    latestUser,
    assistantQuestionsAsked: asked,
  });
  const cached = lookupConverseDemoFallback(messages, locale);
  if (!cached) {
    console.log('[demo-only] AI fallback cache miss — serving generic retry notice', {
      feature: 'structure_brief',
      providerErrorKind,
      locale,
      opening,
      latestUser,
      assistantQuestionsAsked: asked,
    });
    return ConverseBriefResponseSchema.parse({
      briefDraft,
      complete: false,
      retryable: true,
      notice: GENERIC_RETRY_NOTICE[locale],
    });
  }

  console.log('[demo-only] AI fallback cache firing', {
    feature: 'structure_brief',
    providerErrorKind,
    locale,
    opening,
    latestUser,
    assistantQuestionsAsked: asked,
    complete: cached.complete,
    hasNextQuestion: Boolean(cached.nextQuestion),
    nextQuestionPreview: cached.nextQuestion?.slice(0, 80) ?? null,
    demoOnly: true,
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

async function persistRoadmap(
  cached: GenerateRoadmapResponse,
  goal: string,
  locale: UiLocale,
  userId: string | null,
): Promise<GenerateRoadmapResponse> {
  if (!userId) {
    return GenerateRoadmapResponseSchema.parse(cached);
  }
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

async function serveEncodedProblemPlan(
  goal: string,
  source: Exclude<CustomerSourceBranch, 'regulars'>,
  userId: string | null,
): Promise<GenerateRoadmapResponse> {
  const locale = detectResponseLocale(goal);
  const plan = encodedProblemRoadmap(source, locale);
  console.log('[classify] encoded problem roadmap', {
    source,
    locale,
    firstTitle: plan.steps[0]?.title,
  });
  await logAiCall({
    feature: 'roadmap',
    provider: 'encoded-plan',
    model: 'problem-branch',
    succeeded: true,
    errorKind: `problem_branch:${source}`,
  });
  return persistRoadmap(plan, goal, locale, userId);
}

async function serveRoadmapFallback(
  goal: string,
  locale: UiLocale,
  userId: string | null,
  providerErrorKind: string,
  customerSource?: CustomerSourceBranch,
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
  const cached = lookupRoadmapDemoFallback(goal, locale, customerSource);
  if (!cached) {
    console.log('[demo-only] AI fallback cache miss — serving generic retry notice', {
      feature: 'roadmap',
      providerErrorKind,
      locale,
    });
    return GenerateRoadmapResponseSchema.parse({
      retryable: true,
      notice: GENERIC_RETRY_NOTICE[locale],
    });
  }

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

  return persistRoadmap(cached, goal, locale, userId);
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
  const seededHire = Boolean(normalized.briefDraft?.category);

  console.log('[classify]', {
    opening,
    openingShape,
    latestUser,
    dontKnow: latestUser ? signalsDontKnow(latestUser) : false,
    userCount,
    assistantCount,
    responseLocale,
    seededHire,
  });

  // Goal-shaped openings belong on the roadmap — never invent a service brief.
  // Seeded step-hires already have a category and must stay in converse.
  if (
    !seededHire &&
    assistantCount === 0 &&
    userCount === 1 &&
    openingShape === 'goal'
  ) {
    console.log('[classify] redirect → roadmap (goal-shaped opening)');
    return ConverseBriefResponseSchema.parse({
      redirectTo: 'roadmap',
      briefDraft: normalized.briefDraft ?? {},
      complete: false,
    });
  }

  // Off-topic openings never need the model — same canned decline every time.
  if (assistantCount === 0 && userCount === 1 && openingShape === 'unrelated') {
    console.log('[classify] canned decline (unrelated opening) — no provider call');
    return ConverseBriefResponseSchema.parse({
      nextQuestion: pickUnrelatedReply(responseLocale),
      briefDraft: normalized.briefDraft ?? {},
      complete: false,
    });
  }

  // Seeded step-hires this deterministic script covers: name → style →
  // budget/deadline, same "never leave it to the model" approach as the
  // problem diagnosis below, and for the same reason — a scripted reply
  // that confirms what the user gave must never invent a figure. Runs
  // unconditionally (not just as a provider-failure fallback), so this
  // specific flow has no dependency on the AI provider at all. Other
  // seeded hires (not one of the handled opening titles) fall through.
  if (seededHire) {
    const hired = stepHireTurn(
      normalized.messages,
      responseLocale,
      normalized.briefDraft ?? {},
    );
    if (hired) {
      console.log('[classify] deterministic step-hire turn', {
        hasQuestion: Boolean(hired.nextQuestion),
        complete: Boolean(hired.complete),
      });
      return ConverseBriefResponseSchema.parse({
        nextQuestion: hired.nextQuestion,
        complete: hired.complete ?? false,
        briefDraft: hired.briefDraft,
      });
    }
  }

  // Problem-shaped openings: diagnostic questions, then an encoded branch.
  // Runs before the dont-know handoff so "I don't know" on a diagnostic
  // question becomes the social-presence plan, not a generic launch plan.
  if (!seededHire && openingShape === 'problem') {
    const diagnosed = problemDiagnosisTurn(
      normalized.messages,
      responseLocale,
    );
    if (diagnosed) {
      console.log('[classify] problem diagnosis', {
        redirectTo: diagnosed.redirectTo ?? null,
        customerSource: diagnosed.customerSource ?? null,
        hasQuestion: Boolean(diagnosed.nextQuestion),
      });
      return ConverseBriefResponseSchema.parse({
        nextQuestion: diagnosed.nextQuestion,
        briefDraft: normalized.briefDraft ?? {},
        complete: false,
        redirectTo: diagnosed.redirectTo,
        customerSource: diagnosed.customerSource,
      });
    }
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
      normalized.briefDraft ?? {},
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
      normalized.briefDraft ?? {},
    );
    if (cached) return cached;
    throw err;
  }

  if (raw.providerFailed) {
    const cached = await serveConverseFallback(
      normalized.messages,
      responseLocale,
      raw.providerErrorKind ?? 'unknown',
      raw.briefDraft ?? normalized.briefDraft ?? {},
    );
    if (cached) return cached;
  }

  return ConverseBriefResponseSchema.parse(raw);
}

export async function createRoadmap(
  input: GenerateRoadmapInput,
  userId: string | null,
): Promise<GenerateRoadmapResponse> {
  const goal = normalizeToUnicode(input.goal.trim());
  if (!goal) {
    throw new AppError(400, 'VALIDATION_ERROR', 'goal is required');
  }

  const responseLocale = detectResponseLocale(goal);
  const source = input.customerSource;
  const seedGoal = isDemoRoadmapGoal(goal);
  logAiRequestStart('roadmap', {
    seedGoal,
    locale: responseLocale,
    customerSource: source ?? null,
  });

  if (source === 'regulars') {
    return GenerateRoadmapResponseSchema.parse({
      retryable: false,
      notice:
        responseLocale === 'my'
          ? 'Regulars ပြန်မလာတာ ဘာကြောင့်လဲ ဆိုတာ ဒီမှာ မပြောနိုင်ပါဘူး။ visibility ကူညီပေးစေချင်ရင် ပြောပါ။'
          : "I can't tell why regulars stopped coming. If you want help with visibility for new people, say so in the chat.",
    });
  }

  if (source === 'online' || source === 'walkins' || source === 'unsure') {
    return serveEncodedProblemPlan(goal, source, userId);
  }

  if (classifyInputShape(goal) === 'problem') {
    return serveEncodedProblemPlan(goal, 'unsure', userId);
  }

  if (!config.aiProvider) {
    const cached = await serveRoadmapFallback(
      goal,
      responseLocale,
      userId,
      'AI_NOT_CONFIGURED',
      source,
    );
    if (cached) return cached;
    throw new AppError(503, 'AI_NOT_CONFIGURED', 'AI provider is not configured');
  }

  const categorySlugs = await repo.listActiveCategorySlugs();
  const retryRateLimit = !(config.demoAiFallback && seedGoal);
  const result = await generateRoadmap({
    goal,
    categorySlugs,
    locale: responseLocale,
    model: resolveModel(),
    log: logAiCall,
    retryRateLimit,
  });

  if (!result.ok) {
    const cached = await serveRoadmapFallback(
      goal,
      responseLocale,
      userId,
      result.errorKind,
      source,
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

  return persistRoadmap(
    {
      language: result.language,
      steps: result.steps,
      disclaimer: result.disclaimer,
    },
    goal,
    result.language,
    userId,
  );
}
