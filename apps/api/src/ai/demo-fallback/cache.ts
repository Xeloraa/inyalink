/**
 * DEMO ONLY — static AI response cache for pitch / local demos when Groq
 * (or any provider) rate-limits or errors.
 *
 * Converse: match on the conversation's *opening* user message (aliases
 * include landing chips and common demo prompts). On any failed turn —
 * opening or mid-conversation — serve the next question in the cached
 * sequence by how many assistant questions were already asked. After the
 * last question is answered, return finalBrief with complete=true.
 *
 * Roadmap: exact-match goal aliases → static steps.
 *
 * Never treat these as live model output. Remove or gate behind a flag
 * before production.
 */
import { readdirSync, readFileSync } from 'node:fs';
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

type RoadmapFixture = {
  demoOnly: true;
  kind?: 'roadmap';
  matchInput: string;
  aliases?: string[];
  language: 'my' | 'en';
  disclaimer: string;
  steps: GenerateRoadmapResponse['steps'];
};

type ConverseFixture = {
  demoOnly: true;
  kind?: 'converse';
  matchInput: string;
  aliases?: string[];
  locale: 'my' | 'en';
  /** Ordered clarifying questions. Index = assistant questions already asked. */
  questions: string[];
  /** Progressive draft after each user turn (same length as questions). */
  draftsAfterUserTurn: Record<string, unknown>[];
  /** Complete brief after the last answer. */
  finalBrief: Record<string, unknown>;
};

type LoadedConverse = ConverseFixture & { file: string };
type LoadedRoadmap = RoadmapFixture & { file: string };

function loadJson<T>(name: string): T {
  const raw = readFileSync(join(fixturesDir, name), 'utf8');
  return JSON.parse(raw) as T;
}

function isConverseFixture(raw: unknown): raw is ConverseFixture {
  if (!raw || typeof raw !== 'object') return false;
  const o = raw as Record<string, unknown>;
  return (
    o['demoOnly'] === true &&
    typeof o['matchInput'] === 'string' &&
    Array.isArray(o['questions']) &&
    Array.isArray(o['draftsAfterUserTurn']) &&
    o['finalBrief'] !== undefined
  );
}

function isRoadmapFixture(raw: unknown): raw is RoadmapFixture {
  if (!raw || typeof raw !== 'object') return false;
  const o = raw as Record<string, unknown>;
  return (
    o['demoOnly'] === true &&
    typeof o['matchInput'] === 'string' &&
    Array.isArray(o['steps']) &&
    typeof o['disclaimer'] === 'string' &&
    !Array.isArray(o['questions'])
  );
}

function loadAllFixtures(): {
  converse: LoadedConverse[];
  roadmap: LoadedRoadmap[];
} {
  const files = readdirSync(fixturesDir).filter((f) => f.endsWith('.json'));
  const converse: LoadedConverse[] = [];
  const roadmap: LoadedRoadmap[] = [];

  for (const file of files) {
    const raw: unknown = loadJson(file);
    if (file.startsWith('converse-') || isConverseFixture(raw)) {
      if (!isConverseFixture(raw)) {
        throw new Error(`Invalid converse fixture: ${file}`);
      }
      converse.push({ ...raw, file });
      continue;
    }
    if (file.startsWith('roadmap-') || isRoadmapFixture(raw)) {
      if (!isRoadmapFixture(raw)) {
        throw new Error(`Invalid roadmap fixture: ${file}`);
      }
      roadmap.push({ ...raw, file });
    }
  }

  return { converse, roadmap };
}

const { converse: converseFixtures, roadmap: roadmapFixtures } =
  loadAllFixtures();

/** All converse openings + aliases (for tests / isDemo checks). */
export const DEMO_CONVERSE_ALIASES: readonly string[] = Object.freeze(
  Array.from(
    new Set(
      converseFixtures.flatMap((f) => [f.matchInput, ...(f.aliases ?? [])]),
    ),
  ),
);

/** All roadmap goals + aliases. */
export const DEMO_ROADMAP_ALIASES: readonly string[] = Object.freeze(
  Array.from(
    new Set(
      roadmapFixtures.flatMap((f) => [f.matchInput, ...(f.aliases ?? [])]),
    ),
  ),
);

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

function fixtureAliases(fixture: {
  matchInput: string;
  aliases?: string[];
}): string[] {
  return [fixture.matchInput, ...(fixture.aliases ?? [])];
}

function findConverseFixture(
  normalizedOpening: string,
  locale: UiLocale,
): LoadedConverse | null {
  const localeMatches = converseFixtures.filter((f) => f.locale === locale);
  const pool =
    localeMatches.length > 0 ? localeMatches : converseFixtures.filter((f) => f.locale === 'my');

  for (const fixture of pool) {
    for (const alias of fixtureAliases(fixture)) {
      if (normalizedOpening === normalizeDemoInput(alias)) return fixture;
    }
  }

  // Cross-locale: same opening text may only exist in the other locale file.
  for (const fixture of converseFixtures) {
    for (const alias of fixtureAliases(fixture)) {
      if (normalizedOpening === normalizeDemoInput(alias)) return fixture;
    }
  }
  return null;
}

function findRoadmapFixture(
  normalizedGoal: string,
  locale: UiLocale,
): LoadedRoadmap | null {
  const localeMatches = roadmapFixtures.filter((f) => f.language === locale);
  const pool =
    localeMatches.length > 0 ? localeMatches : roadmapFixtures.filter((f) => f.language === 'my');

  for (const fixture of pool) {
    for (const alias of fixtureAliases(fixture)) {
      if (normalizedGoal === normalizeDemoInput(alias)) return fixture;
    }
  }

  for (const fixture of roadmapFixtures) {
    for (const alias of fixtureAliases(fixture)) {
      if (normalizedGoal === normalizeDemoInput(alias)) return fixture;
    }
  }
  return null;
}

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
    fixtureCount: roadmapFixtures.length,
  });

  const fixture = findRoadmapFixture(normalized, locale);
  if (!fixture) {
    logFallback('miss', 'roadmap', {
      normalizedInput: normalized,
      locale,
      reason: 'input_not_in_aliases',
    });
    return null;
  }

  const parsed = GenerateRoadmapResponseSchema.parse({
    language: fixture.language,
    steps: fixture.steps,
    disclaimer: fixture.disclaimer,
  });
  logFallback('hit', 'roadmap', {
    matchInput: fixture.matchInput,
    file: fixture.file,
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
 *
 * Follow-up turns match on opening only — free-form mid-script replies still
 * advance the canned sequence so rate limits mid-conversation never stall.
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
    fixtureCount: converseFixtures.length,
  });

  if (!opening) {
    logFallback('miss', 'structure_brief', {
      normalizedInput: null,
      locale,
      reason: 'no_user_opening',
    });
    return null;
  }

  const fixture = findConverseFixture(opening, locale);
  if (!fixture) {
    logFallback('miss', 'structure_brief', {
      normalizedInput: opening,
      locale,
      assistantQuestionsAsked: asked,
      userMessageCount: userCount,
      reason: 'input_not_in_aliases',
    });
    return null;
  }

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
        language: fixture.locale,
      },
    });

    logFallback('hit', 'structure_brief', {
      matchInput: fixture.matchInput,
      file: fixture.file,
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
      language: fixture.locale,
    },
  });

  logFallback('hit', 'structure_brief', {
    matchInput: fixture.matchInput,
    file: fixture.file,
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
  if (!opening) return false;
  return findConverseFixture(opening, 'my') !== null;
}

/** True when the goal matches a seeded demo roadmap prompt. */
export function isDemoRoadmapGoal(goal: string): boolean {
  return findRoadmapFixture(normalizeDemoInput(goal), 'my') !== null;
}

/** Fixture inventory size (for tests / generator checks). */
export function demoFixtureCounts(): {
  converse: number;
  roadmap: number;
  total: number;
} {
  return {
    converse: converseFixtures.length,
    roadmap: roadmapFixtures.length,
    total: converseFixtures.length + roadmapFixtures.length,
  };
}
