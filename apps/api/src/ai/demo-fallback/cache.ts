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
    .trim()
    .toLowerCase();
}

// \p{M} (combining marks) is essential here, not optional: Burmese vowel
// signs and medial consonants are Marks, not Letters, in Unicode. Without
// it, a syllable like "လိုချင်ပါတယ်" fragments into single-character
// tokens at every vowel sign / medial boundary — silently turning keyword
// matching for the entire Burmese corpus into character-soup.
const TOKEN_PATTERN = /[\p{L}\p{M}\p{N}]+/gu;

/**
 * Grammatical filler that says nothing about *topic* — "i", "need", "a",
 * "လိုချင်ပါတယ်" (a generic "I want/need ___") appear in nearly every
 * fixture regardless of what it's about, so letting them count toward a
 * keyword-overlap match makes almost any two inputs "match" on filler
 * alone. Deliberately short: only words confirmed near-universal across
 * the actual fixture corpus (see .tmp-verify diagnostics during
 * development), not a general-purpose stopword list.
 */
const STOPWORDS = new Set([
  'i', 'me', 'my', 'you', 'your', 'a', 'an', 'the', 'to', 'of', 'in', 'on',
  'at', 'for', 'and', 'or', 'is', 'it', 'am', 'are', 'be', 'do', 'have',
  'has', 'want', 'need', 'please', 'hi', 'hello', 'there', 'with', 'this',
  'that', 'can', 'could', 'would', 'about', 'some',
  'လိုချင်ပါတယ်', 'လိုပါတယ်', 'ချင်ပါတယ်',
]);

/** Significant words in a string, normalized, lowercased, filler removed. */
function tokenize(text: string): string[] {
  const words = normalizeDemoInput(text).match(TOKEN_PATTERN) ?? [];
  return words.filter((w) => !STOPWORDS.has(w));
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

function keywordSet(fixture: { matchInput: string; aliases?: string[] }): Set<string> {
  return new Set(fixtureAliases(fixture).flatMap((alias) => tokenize(alias)));
}

/**
 * Inverse document frequency over one fixture corpus: a word shared by many
 * fixtures counts for little; a word only a couple of fixtures use ("cafe",
 * "tiktok", "packaging") counts for a lot. Purely for ranking/tie-breaking
 * between candidates that already cleared MIN_KEYWORD_MATCHES real (non-
 * filler) words — see tokenize's STOPWORDS for why raw frequency alone
 * isn't a safe gate. Computed once at module load.
 */
function buildIdf<T>(
  fixtures: T[],
  keywordsByFixture: Map<T, Set<string>>,
): Map<string, number> {
  const documentFrequency = new Map<string, number>();
  for (const fixture of fixtures) {
    for (const word of keywordsByFixture.get(fixture)!) {
      documentFrequency.set(word, (documentFrequency.get(word) ?? 0) + 1);
    }
  }
  const total = fixtures.length;
  const idf = new Map<string, number>();
  for (const [word, count] of documentFrequency) {
    idf.set(word, Math.log((total + 1) / (count + 1)) + 1);
  }
  return idf;
}

const converseKeywords = new Map(
  converseFixtures.map((f) => [f, keywordSet(f)] as const),
);
const roadmapKeywords = new Map(
  roadmapFixtures.map((f) => [f, keywordSet(f)] as const),
);
const converseIdf = buildIdf(converseFixtures, converseKeywords);
const roadmapIdf = buildIdf(roadmapFixtures, roadmapKeywords);

/** One shared word is too weak a signal — require at least two, or all of a fixture's own keywords if it has fewer. Filler words never reach this count at all (tokenize strips them). */
const MIN_KEYWORD_MATCHES = 2;

/**
 * Fuzzy fallback for when nothing matches exactly: score every fixture in
 * `pool` by IDF-weighted keyword overlap against `inputTokens` and return
 * the best one, provided it clears MIN_KEYWORD_MATCHES.
 *
 * Ranked by score × coverage-ratio, not raw score alone: raw score lets a
 * long fixture that only partially overlaps (2 of its 6 keywords, both
 * happening to be somewhat rare) outrank a short fixture the input fully
 * matches (2 of its 2 keywords) whenever the partial match's two words are
 * individually rarer. E.g. "I need a website for my coffee shop" sharing
 * {coffee, shop} with a 4-keyword cafe/logo fixture must not beat sharing
 * {website, shop} — all of it — with a 2-keyword website fixture. Coverage
 * ratio is what tells those apart; raw score alone can't.
 */
function findBestKeywordMatch<T>(
  inputTokens: Set<string>,
  pool: T[],
  keywordsByFixture: Map<T, Set<string>>,
  idf: Map<string, number>,
): T | null {
  let best: T | null = null;
  let bestRank = 0;

  for (const fixture of pool) {
    const keywords = keywordsByFixture.get(fixture)!;
    if (keywords.size === 0) continue;

    let score = 0;
    let matchCount = 0;
    for (const word of keywords) {
      if (inputTokens.has(word)) {
        score += idf.get(word) ?? 1;
        matchCount += 1;
      }
    }

    const required = Math.min(MIN_KEYWORD_MATCHES, keywords.size);
    if (matchCount < required) continue;

    const ratio = matchCount / keywords.size;
    const rank = score * ratio;
    if (rank > bestRank) {
      best = fixture;
      bestRank = rank;
    }
  }

  return best;
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

  // Fuzzy fallback: keyword overlap when nothing matched exactly.
  const inputTokens = new Set(tokenize(normalizedOpening));
  if (inputTokens.size === 0) return null;
  return (
    findBestKeywordMatch(inputTokens, pool, converseKeywords, converseIdf) ??
    findBestKeywordMatch(inputTokens, converseFixtures, converseKeywords, converseIdf)
  );
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

  // Fuzzy fallback: keyword overlap when nothing matched exactly.
  const inputTokens = new Set(tokenize(normalizedGoal));
  if (inputTokens.size === 0) return null;
  return (
    findBestKeywordMatch(inputTokens, pool, roadmapKeywords, roadmapIdf) ??
    findBestKeywordMatch(inputTokens, roadmapFixtures, roadmapKeywords, roadmapIdf)
  );
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
 * Serve the next cached converse turn for a seeded opening — but only the
 * very first assistant turn (`asked === 0`). Every question past that one
 * is scripted to confirm specific budget/deadline/etc. values as if the
 * user had just given them, indexed purely by turn count — not by what the
 * user actually typed. A provider failure on a later turn used to still
 * advance that script, so the reply could confirm figures the user never
 * said (e.g. inventing a deadline). Past the opening we no longer know the
 * script still matches the real conversation, so a later failure gets the
 * generic retry notice instead of a canned — and potentially fabricated —
 * confirmation.
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

  if (asked > 0) {
    logFallback('miss', 'structure_brief', {
      normalizedInput: opening,
      locale,
      assistantQuestionsAsked: asked,
      userMessageCount: userCount,
      reason: 'past_opening_turn',
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

  // asked === 0 is guaranteed here (the asked > 0 check above already
  // returned), so this is always the fixture's opening question — never a
  // later one that would assert values the user hasn't actually given yet.
  const draftSource = fixture.draftsAfterUserTurn[0] ?? {};
  const nextQuestion = questions[0]!;
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
    nextQuestionIndex: 0,
    complete: false,
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
