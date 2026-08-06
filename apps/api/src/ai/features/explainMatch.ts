import type { TextLanguage, UiLocale } from '@inyalink/shared';
import { getProvider } from '../providers/index.js';
import { renderPrompt } from '../prompts/load.js';
import { ExplainMatchModelOutputSchema } from '../schemas.js';
import type { AiCallLogger } from '../telemetry.js';

export type ExplainMatchBrief = {
  title: string | null;
  description: string | null;
  requirements: string[];
  budgetMinMmk: number | null;
  budgetMaxMmk: number | null;
  language: TextLanguage | null;
};

export type ExplainMatchProfessional = {
  displayName: string;
  headlineMy: string | null;
  headlineEn: string | null;
  skills: string[];
  minBudgetMmk: number | null;
  typicalTurnaroundDays: number | null;
  completionRatePct: number | null;
  completedCount: number;
};

export type ExplainMatchArgs = {
  briefId: string;
  brief: ExplainMatchBrief;
  professional: ExplainMatchProfessional;
  /** UI my/en toggle — response language, independent of brief language. */
  locale: UiLocale;
  model: string;
  log: AiCallLogger;
};

export type ExplainMatchResult =
  | { ok: true; explanation: string }
  | {
      ok: false;
      retryable: boolean;
      explanation: null;
      errorKind: string;
    };

/**
 * One-sentence reason this professional fits this brief.
 * On rate limit / provider failure / missing key, returns explanation: null
 * (never throws — matching list must not depend on this).
 *
 * Uses a smaller Groq model + tight max_tokens: one sentence does not need
 * gpt-oss-120b. Override with GROQ_EXPLAIN_MODEL if needed.
 */
const EXPLAIN_MATCH_GROQ_MODEL = 'openai/gpt-oss-20b';
/** Reasoning models still need headroom; keep far below converse/roadmap. */
const EXPLAIN_MATCH_MAX_TOKENS = 768;

export async function explainMatch(
  args: ExplainMatchArgs,
): Promise<ExplainMatchResult> {
  const language = args.locale;
  const started = Date.now();

  let provider;
  try {
    provider = getProvider();
  } catch (err) {
    console.error('explainMatch provider unavailable', err);
    return {
      ok: false,
      retryable: true,
      explanation: null,
      errorKind: 'AI_UNAVAILABLE',
    };
  }

  const model =
    provider.name === 'groq'
      ? (process.env['GROQ_EXPLAIN_MODEL'] ?? EXPLAIN_MATCH_GROQ_MODEL)
      : args.model;
  const prompt = renderPrompt('explain-match', {
    language,
  });
  const input = JSON.stringify({
    brief: args.brief,
    professional: args.professional,
  });

  let result;
  try {
    result = await provider.complete({
      prompt,
      input,
      schema: ExplainMatchModelOutputSchema,
      temperature: 0.2,
      maxTokens: EXPLAIN_MATCH_MAX_TOKENS,
      model,
    });
  } catch (err) {
    console.error('explainMatch model error', err);
    await args.log({
      feature: 'explain_match',
      provider: provider.name,
      model,
      briefId: args.briefId,
      latencyMs: Date.now() - started,
      succeeded: false,
      errorKind: 'AI_UNAVAILABLE',
    });
    return {
      ok: false,
      retryable: true,
      explanation: null,
      errorKind: 'AI_UNAVAILABLE',
    };
  }

  if (!result.ok) {
    await args.log({
      feature: 'explain_match',
      provider: provider.name,
      model,
      briefId: args.briefId,
      latencyMs: Date.now() - started,
      succeeded: false,
      errorKind: result.error.code,
    });
    return {
      ok: false,
      retryable: result.error.code === 'AI_RATE_LIMIT',
      explanation: null,
      errorKind: result.error.code,
    };
  }

  await args.log({
    feature: 'explain_match',
    provider: provider.name,
    model,
    briefId: args.briefId,
    tokensIn: result.usage.tokensIn,
    tokensOut: result.usage.tokensOut,
    latencyMs: result.latencyMs,
    succeeded: true,
  });

  return { ok: true, explanation: result.data.explanation.trim() };
}
