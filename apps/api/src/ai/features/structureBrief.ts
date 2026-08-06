import { detectResponseLocale } from '@inyalink/burmese';
import {
  isBriefDraftComplete,
  type BriefDraft,
  type ChatMessage,
  type ConverseBriefResponse,
  type UiLocale,
} from '@inyalink/shared';
import { getProvider } from '../providers/index.js';
import { renderPrompt } from '../prompts/load.js';
import {
  StructureBriefModelOutputSchema,
  type StructureBriefModelOutput,
} from '../schemas.js';
import type { AiCallLogger } from '../telemetry.js';

export type StructureBriefArgs = {
  messages: ChatMessage[];
  briefDraft?: BriefDraft;
  /**
   * UI my/en toggle — kept for API compatibility. Questions follow the
   * most recent user message language instead.
   */
  locale: UiLocale;
  maxQuestions: number;
  model: string;
  log: AiCallLogger;
  /** When false, skip 429 Retry-After so demo fallback can run quickly. */
  retryRateLimit?: boolean;
};

/** Reply language = most recent user message (not the opening). */
function responseLocaleFromMessages(messages: ChatMessage[]): UiLocale {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m?.role === 'user') return detectResponseLocale(m.content);
  }
  return 'my';
}

/** Extends the HTTP response with an internal provider-failure signal for demo fallback. */
export type StructureBriefResult = ConverseBriefResponse & {
  providerFailed?: boolean;
  providerErrorKind?: string;
};

function countAssistantTurns(messages: ChatMessage[]): number {
  return messages.filter((m) => m.role === 'assistant').length;
}

function omitNulls(
  draft: StructureBriefModelOutput['briefDraft'],
): BriefDraft {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(draft)) {
    if (value !== null && value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}

function mergeDraft(base: BriefDraft, patch: BriefDraft): BriefDraft {
  return {
    ...base,
    ...Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined),
    ),
  };
}

function transcript(messages: ChatMessage[], draft: BriefDraft): string {
  const lines = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`);
  return [
    'Current briefDraft JSON:',
    JSON.stringify(draft),
    '',
    'Conversation:',
    ...lines,
  ].join('\n');
}

/**
 * One turn of brief structuring. Caps clarifying questions at maxQuestions.
 */
export async function structureBrief(
  args: StructureBriefArgs,
): Promise<StructureBriefResult> {
  const prior = args.briefDraft ?? {};
  const questionsAsked = countAssistantTurns(args.messages);
  const questionsRemaining = Math.max(0, args.maxQuestions - questionsAsked);
  const responseLocale = responseLocaleFromMessages(args.messages);
  const started = Date.now();

  let provider;
  try {
    provider = getProvider();
  } catch (err) {
    console.error('structureBrief provider unavailable', err);
    return {
      briefDraft: prior,
      complete: false,
      providerFailed: true,
      providerErrorKind: 'AI_UNAVAILABLE',
    };
  }

  const prompt = renderPrompt('structure-brief', {
    maxQuestions: args.maxQuestions,
    questionsAsked,
    questionsRemaining,
    language: responseLocale,
  });

  let result;
  try {
    result = await provider.complete({
      prompt,
      input: transcript(args.messages, prior),
      schema: StructureBriefModelOutputSchema,
      temperature: 0.3,
      maxTokens: 2048,
      retryRateLimit: args.retryRateLimit,
    });
  } catch (err) {
    console.error('structureBrief model error', err);
    await args.log({
      feature: 'structure_brief',
      provider: provider.name,
      model: args.model,
      latencyMs: Date.now() - started,
      succeeded: false,
      errorKind: 'validation_failed',
    });
    return {
      briefDraft: { ...prior, needs_human_review: true },
      complete: false,
      providerFailed: true,
      providerErrorKind: 'validation_failed',
    };
  }

  if (!result.ok) {
    await args.log({
      feature: 'structure_brief',
      provider: provider.name,
      model: args.model,
      latencyMs: Date.now() - started,
      succeeded: false,
      errorKind: result.error.code,
    });

    if (result.error.code === 'AI_RATE_LIMIT') {
      return {
        briefDraft: prior,
        complete: false,
        retryable: true,
        notice: 'One moment — the assistant is busy. Please try again.',
        providerFailed: true,
        providerErrorKind: 'AI_RATE_LIMIT',
      };
    }

    return {
      briefDraft: {
        ...prior,
        needs_human_review: true,
      },
      complete: false,
      providerFailed: true,
      providerErrorKind: result.error.code,
    };
  }

  await args.log({
    feature: 'structure_brief',
    provider: provider.name,
    model: args.model,
    tokensIn: result.usage.tokensIn,
    tokensOut: result.usage.tokensOut,
    latencyMs: result.latencyMs,
    succeeded: true,
  });

  let briefDraft = mergeDraft(prior, omitNulls(result.data.briefDraft));
  // Most-recent user message language wins over UI toggle and model inference.
  briefDraft = { ...briefDraft, language: responseLocale };
  let nextQuestion = result.data.nextQuestion ?? undefined;
  let complete = result.data.complete;
  const minOk = isBriefDraftComplete(briefDraft);

  if (questionsRemaining === 0) {
    nextQuestion = undefined;
    if (!minOk) {
      briefDraft = { ...briefDraft, needs_human_review: true };
      complete = false;
    } else {
      complete = true;
    }
  } else if (complete) {
    if (!minOk) {
      complete = false;
      if (!nextQuestion) {
        briefDraft = { ...briefDraft, needs_human_review: true };
      }
    } else {
      nextQuestion = undefined;
      complete = true;
    }
  } else {
    complete = false;
    if (!nextQuestion) {
      briefDraft = { ...briefDraft, needs_human_review: true };
    }
  }

  if (complete) {
    nextQuestion = undefined;
  }

  return { nextQuestion, briefDraft, complete };
}
