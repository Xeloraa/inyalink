import type { RoadmapStep, UiLocale } from '@inyalink/shared';
import { detectResponseLocale } from '@inyalink/burmese';
import { getProvider } from '../providers/index.js';
import { renderPrompt } from '../prompts/load.js';
import {
  GenerateRoadmapModelOutputSchema,
  type GenerateRoadmapModelOutput,
} from '../schemas.js';
import type { AiCallLogger } from '../telemetry.js';

export type GenerateRoadmapArgs = {
  goal: string;
  categorySlugs: string[];
  /**
   * UI my/en toggle — kept for API compatibility. Plan copy follows the
   * goal message language instead.
   */
  locale: UiLocale;
  model: string;
  log: AiCallLogger;
  /** When false, skip 429 Retry-After so demo fallback can run quickly. */
  retryRateLimit?: boolean;
};

export type GenerateRoadmapOk = {
  ok: true;
  language: UiLocale;
  steps: RoadmapStep[];
  disclaimer: string;
  remappedSlugs: Array<{ order: number; from: string; to: string }>;
  usage: { tokensIn: number; tokensOut: number };
  latencyMs: number;
};

export type GenerateRoadmapErr = {
  ok: false;
  retryable: boolean;
  notice?: string;
  errorKind: string;
};

export type GenerateRoadmapFeatureResult = GenerateRoadmapOk | GenerateRoadmapErr;

function normalizeSteps(
  raw: GenerateRoadmapModelOutput['steps'],
  allowed: Set<string>,
  fallbackSlug: string,
): {
  steps: RoadmapStep[];
  remappedSlugs: Array<{ order: number; from: string; to: string }>;
} {
  const remappedSlugs: Array<{ order: number; from: string; to: string }> = [];
  const steps = raw
    .map((step, index) => {
      const order = index + 1;
      let slug = step.category_slug;
      if (!allowed.has(slug)) {
        remappedSlugs.push({ order, from: slug, to: fallbackSlug });
        slug = fallbackSlug;
      }
      const min = step.est_min_mmk;
      const max = Math.max(step.est_max_mmk, min);
      return {
        order,
        title: step.title,
        why: step.why,
        category_slug: slug,
        est_min_mmk: min,
        est_max_mmk: max,
      };
    })
    .slice(0, 6);
  return { steps, remappedSlugs };
}

/**
 * Single-shot Guided Plan. Persisting is the caller's job.
 */
export async function generateRoadmap(
  args: GenerateRoadmapArgs,
): Promise<GenerateRoadmapFeatureResult> {
  if (args.categorySlugs.length === 0) {
    return {
      ok: false,
      retryable: false,
      errorKind: 'no_categories',
      notice: 'No active categories are configured.',
    };
  }

  const allowed = new Set(args.categorySlugs);
  const fallbackSlug = args.categorySlugs[0] ?? 'graphic-design';
  const responseLocale = detectResponseLocale(args.goal);
  const provider = getProvider();
  const prompt = renderPrompt('roadmap', {
    categories: args.categorySlugs.map((s) => `- ${s}`).join('\n'),
    language: responseLocale,
  });

  const started = Date.now();
  let result;
  try {
    result = await provider.complete({
      prompt,
      input: args.goal,
      schema: GenerateRoadmapModelOutputSchema,
      temperature: 0.3,
      maxTokens: 3072,
      retryRateLimit: args.retryRateLimit,
    });
  } catch (err) {
    console.error('generateRoadmap model error', err);
    await args.log({
      feature: 'roadmap',
      provider: provider.name,
      model: args.model,
      latencyMs: Date.now() - started,
      succeeded: false,
      errorKind: 'validation_failed',
    });
    return {
      ok: false,
      retryable: false,
      errorKind: 'validation_failed',
    };
  }

  if (!result.ok) {
    await args.log({
      feature: 'roadmap',
      provider: provider.name,
      model: args.model,
      latencyMs: Date.now() - started,
      succeeded: false,
      errorKind: result.error.code,
    });

    if (result.error.code === 'AI_RATE_LIMIT') {
      return {
        ok: false,
        retryable: true,
        errorKind: 'AI_RATE_LIMIT',
        notice: 'One moment — the assistant is busy. Please try again.',
      };
    }

    return {
      ok: false,
      retryable: false,
      errorKind: result.error.code,
    };
  }

  await args.log({
    feature: 'roadmap',
    provider: provider.name,
    model: args.model,
    tokensIn: result.usage.tokensIn,
    tokensOut: result.usage.tokensOut,
    latencyMs: result.latencyMs,
    succeeded: true,
  });

  const { steps, remappedSlugs } = normalizeSteps(
    result.data.steps,
    allowed,
    fallbackSlug,
  );
  if (steps.length < 4) {
    return {
      ok: false,
      retryable: false,
      errorKind: 'insufficient_steps',
    };
  }

  return {
    ok: true,
    language: responseLocale,
    steps,
    disclaimer: result.data.disclaimer,
    remappedSlugs,
    usage: result.usage,
    latencyMs: result.latencyMs,
  };
}
