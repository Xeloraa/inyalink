/**
 * DEMO ONLY — static AI response cache for pitch / local demos when Groq
 * (or any provider) rate-limits or errors.
 *
 * Converse: match on the conversation's *opening* user message (aliases
 * include landing chips). On any failed turn, serve the next question in
 * the cached sequence by how many assistant questions were already asked.
 * After the last question is answered, return finalBrief with complete=true.
 *
 * Roadmap: exact-match goal aliases → static steps.
 *
 * Never treat these as live model output. Remove or gate behind a flag
 * before production.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeToUnicode } from '@inyalink/burmese';
import {
  ConverseBriefResponseSchema,
  GenerateRoadmapResponseSchema,
  type BriefDraft,
  type ConverseBriefResponse,
  type GenerateRoadmapResponse,
  type UiLocale,
} from '@inyalink/shared';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

/** Exact demo seeds — must match landing / script openings after normalize. */
export const DEMO_ROADMAP_INPUT = 'ကော်ဖီဆိုင် ဖွင့်ချင်ပါတယ်';
export const DEMO_CONVERSE_INPUT = 'ကော်ဖီဆိုင်အတွက် logo လိုချင်ပါတယ်';

/** Landing chip texts that should also hit the same fixtures. */
export const DEMO_ROADMAP_ALIASES = [
  DEMO_ROADMAP_INPUT,
  'ကော်ဖီဆိုင် ဖွင့်ချင်ပါတယ်။ ဘာတွေ လိုအပ်မလဲ?',
] as const;

export const DEMO_CONVERSE_ALIASES = [
  DEMO_CONVERSE_INPUT,
  'ကော်ဖီဆိုင် လိုဂို လိုချင်ပါတယ်',
] as const;

type RoadmapFixture = {
  demoOnly: true;
  matchInput: string;
  language: 'my' | 'en';
  disclaimer: string;
  steps: GenerateRoadmapResponse['steps'];
};

type ConverseFixture = {
  demoOnly: true;
  matchInput: string;
  /** Ordered clarifying questions. Index = assistant questions already asked. */
  questions: string[];
  /** Progressive draft after each user turn (same length as questions). */
  draftsAfterUserTurn: Record<string, unknown>[];
  /** Complete brief after the last answer. */
  finalBrief: Record<string, unknown>;
};

function loadJson<T>(name: string): T {
  const raw = readFileSync(join(fixturesDir, name), 'utf8');
  return JSON.parse(raw) as T;
}

const roadmapByLocale: Record<UiLocale, RoadmapFixture> = {
  my: loadJson('roadmap-cafe-open.my.json'),
  en: loadJson('roadmap-cafe-open.en.json'),
};

const converseByLocale: Record<UiLocale, ConverseFixture> = {
  my: loadJson('converse-cafe-logo.my.json'),
  en: loadJson('converse-cafe-logo.en.json'),
};

export function normalizeDemoInput(text: string): string {
  return normalizeToUnicode(text)
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[?？.。!！]+$/u, '')
    .trim();
}

function omitNulls(draft: Record<string, unknown>): BriefDraft {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(draft)) {
    if (value !== null && value !== undefined) {
      out[key] = value;
    }
  }
  return out as BriefDraft;
}

function logFallback(
  event: 'check' | 'miss' | 'hit',
  feature: 'structure_brief' | 'roadmap',
  detail: Record<string, unknown>,
): void {
  const prefix =
    event === 'hit'
      ? '[demo-only] AI fallback cache hit'
      : event === 'miss'
        ? '[demo-only] AI fallback cache miss'
        : '[demo-only] AI fallback cache check';
  console.log(prefix, { feature, event, ...detail });
}

function matchesAlias(
  normalized: string,
  aliases: readonly string[],
): string | null {
  for (const alias of aliases) {
    if (normalized === normalizeDemoInput(alias)) return alias;
  }
  return null;
}

/**
 * Loose match for mid-script demo replies. Requires substantial overlap —
 * "cafe vex" must not match "Inya Cafe".
 */
export function closelyMatchesDemoReply(
  raw: string,
  aliases: readonly string[],
): string | null {
  const normalized = normalizeDemoInput(raw).toLowerCase();
  if (!normalized) return null;

  for (const alias of aliases) {
    const a = normalizeDemoInput(alias).toLowerCase();
    if (!a) continue;
    if (normalized === a) return alias;

    // Alias appears inside the user reply ("Minimalist, brown…" → minimalist).
    if (a.length >= 4 && normalized.includes(a)) return alias;

    // User reply is a short form of the alias ("inya" → "inya cafe").
    if (
      normalized.length >= 4 &&
      a.includes(normalized) &&
      normalized.length / a.length >= 0.5
    ) {
      return alias;
    }
  }
  return null;
}

/**
 * Fixture replies assumed before serving questions[asked].
 * Index = assistant questions already asked (same as nextQuestionIndex).
 * asked=0 has no prior reply beyond the opening alias.
 */
export const DEMO_CONVERSE_REPLY_ALIASES: Readonly<
  Record<number, readonly string[]>
> = {
  1: [
    'Inya Cafe',
    'inya cafe',
    'Inya',
    'အင်းယား',
    'အင်းယား ကဖေး',
    'အင်းယားကဖေး',
  ],
  2: [
    'logo',
    'logo ပဲ',
    'just the logo',
    'logo for now',
    'လိုဂို',
    'logo တစ်ခုတည်း',
    'လောလောဆယ် logo',
  ],
  3: [
    'minimal',
    'minimalist',
    'modern',
    'traditional',
    'ရိုးရှင်း',
    'ခေတ်မီ',
    'ရိုးရာ',
  ],
  4: [
    '300000',
    '500000',
    '300000-500000',
    '2026-09-30',
    '300,000',
    '၅သိန်း',
    '၃သိန်း',
  ],
};

/** Opening user message for converse matching (first user turn). */
export function openingUserMessage(
  messages: Array<{ role: string; content: string }>,
): string | null {
  const first = messages.find((m) => m.role === 'user');
  return first ? normalizeDemoInput(first.content) : null;
}

/** How many assistant questions have already been asked in this transcript. */
export function assistantQuestionCount(
  messages: Array<{ role: string; content: string }>,
): number {
  return messages.filter((m) => m.role === 'assistant').length;
}

export function lookupRoadmapDemoFallback(
  goal: string,
  locale: UiLocale,
): GenerateRoadmapResponse | null {
  const normalized = normalizeDemoInput(goal);
  logFallback('check', 'roadmap', {
    normalizedInput: normalized,
    locale,
    aliases: DEMO_ROADMAP_ALIASES,
  });

  const matchedAlias = matchesAlias(normalized, DEMO_ROADMAP_ALIASES);
  if (!matchedAlias) {
    logFallback('miss', 'roadmap', {
      normalizedInput: normalized,
      locale,
      reason: 'input_not_in_aliases',
    });
    return null;
  }

  const fixture = roadmapByLocale[locale] ?? roadmapByLocale.my;
  const parsed = GenerateRoadmapResponseSchema.parse({
    language: fixture.language,
    steps: fixture.steps,
    disclaimer: fixture.disclaimer,
  });
  logFallback('hit', 'roadmap', {
    matchInput: matchedAlias,
    normalizedInput: normalized,
    locale,
    demoOnly: true,
  });
  return parsed;
}

/**
 * Serve the next cached converse turn for a seeded opening.
 * Index = assistant questions already in `messages` (0 on first call).
 * When that index is past the question list, return finalBrief + complete.
 */
export function lookupConverseDemoFallback(
  messages: Array<{ role: string; content: string }>,
  locale: UiLocale,
): ConverseBriefResponse | null {
  const opening = openingUserMessage(messages);
  const asked = assistantQuestionCount(messages);
  const userCount = messages.filter((m) => m.role === 'user').length;

  logFallback('check', 'structure_brief', {
    normalizedInput: opening,
    locale,
    assistantQuestionsAsked: asked,
    userMessageCount: userCount,
    aliases: DEMO_CONVERSE_ALIASES,
  });

  if (!opening) {
    logFallback('miss', 'structure_brief', {
      normalizedInput: null,
      locale,
      reason: 'no_user_opening',
    });
    return null;
  }

  const matchedAlias = matchesAlias(opening, DEMO_CONVERSE_ALIASES);
  if (!matchedAlias) {
    logFallback('miss', 'structure_brief', {
      normalizedInput: opening,
      locale,
      assistantQuestionsAsked: asked,
      userMessageCount: userCount,
      reason: 'input_not_in_aliases',
    });
    return null;
  }

  // Mid-script turns assume specific replies (e.g. cafe name = "Inya Cafe").
  // Do not advance the canned script when the latest message doesn't match.
  if (asked >= 1) {
    const latest =
      [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    const expected = DEMO_CONVERSE_REPLY_ALIASES[asked];
    if (!expected) {
      logFallback('miss', 'structure_brief', {
        normalizedInput: opening,
        latestUser: normalizeDemoInput(latest),
        locale,
        assistantQuestionsAsked: asked,
        reason: 'no_expected_replies_for_turn',
      });
      return null;
    }
    const matchedReply = closelyMatchesDemoReply(latest, expected);
    if (!matchedReply) {
      logFallback('miss', 'structure_brief', {
        normalizedInput: opening,
        latestUser: normalizeDemoInput(latest),
        locale,
        assistantQuestionsAsked: asked,
        expectedReplies: expected,
        reason: 'latest_reply_not_close_to_fixture',
      });
      return null;
    }
    logFallback('check', 'structure_brief', {
      normalizedInput: opening,
      latestUser: normalizeDemoInput(latest),
      matchedReply,
      locale,
      assistantQuestionsAsked: asked,
      note: 'mid_script_reply_matched',
    });
  }

  const fixture = converseByLocale[locale] ?? converseByLocale.my;
  const questions = fixture.questions;
  if (!Array.isArray(questions) || questions.length === 0) {
    logFallback('miss', 'structure_brief', {
      normalizedInput: opening,
      locale,
      reason: 'empty_question_sequence',
    });
    return null;
  }

  // Still have a cached question to ask.
  if (asked < questions.length) {
    const draftSource =
      fixture.draftsAfterUserTurn[Math.max(0, userCount - 1)] ??
      fixture.draftsAfterUserTurn[asked] ??
      {};
    const nextQuestion = questions[asked]!;
    const response = ConverseBriefResponseSchema.parse({
      nextQuestion,
      complete: false,
      briefDraft: {
        ...omitNulls(draftSource),
        language: locale,
      },
    });

    logFallback('hit', 'structure_brief', {
      matchInput: matchedAlias,
      normalizedInput: opening,
      locale,
      assistantQuestionsAsked: asked,
      userMessageCount: userCount,
      nextQuestionIndex: asked,
      complete: false,
      demoOnly: true,
    });
    return response;
  }

  // All questions answered → finished brief.
  const response = ConverseBriefResponseSchema.parse({
    complete: true,
    briefDraft: {
      ...omitNulls(fixture.finalBrief),
      language: locale,
    },
  });

  logFallback('hit', 'structure_brief', {
    matchInput: matchedAlias,
    normalizedInput: opening,
    locale,
    assistantQuestionsAsked: asked,
    userMessageCount: userCount,
    complete: true,
    demoOnly: true,
  });
  return response;
}

/** True when the opening message is a seeded demo converse prompt. */
export function isDemoConverseOpening(
  messages: Array<{ role: string; content: string }>,
): boolean {
  const opening = openingUserMessage(messages);
  return opening !== null && matchesAlias(opening, DEMO_CONVERSE_ALIASES) !== null;
}

/** True when the goal matches a seeded demo roadmap prompt. */
export function isDemoRoadmapGoal(goal: string): boolean {
  return matchesAlias(normalizeDemoInput(goal), DEMO_ROADMAP_ALIASES) !== null;
}
