/**
 * Manual conversation-path harness (structure-brief §1–§11).
 *
 *   node --env-file=../../.env --import tsx scripts/test-conversations.ts
 *
 * Prints input, response, path (brief | roadmap | redirect), and whether
 * the demo AI fallback fired. 5s delay between calls. Writes
 * scripts/test-conversations.out.txt.
 *
 * Does not modify prompt files.
 */
import { createWriteStream } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyInputShape } from '@inyalink/shared';
import {
  isDemoRoadmapGoal,
  lookupRoadmapDemoFallback,
} from '../src/ai/demo-fallback/cache.js';
import { generateRoadmap } from '../src/ai/features/generateRoadmap.js';
import { config } from '../src/lib/config.js';
import { converseBrief } from '../src/modules/ai/ai.service.js';

const DELAY_MS = 5_000;
const OUT_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  'test-conversations.out.txt',
);

/** One opening per structure-brief input type (§1–§11). */
const INPUTS: ReadonlyArray<{ section: number; kind: string; text: string }> = [
  { section: 1, kind: 'service', text: 'I need a logo' },
  { section: 2, kind: 'goal', text: 'I want to open a shop' },
  { section: 3, kind: 'problem', text: "my shop isn't getting customers" },
  { section: 4, kind: 'dont-know', text: "I don't know where to start" },
  { section: 5, kind: 'price', text: 'how much does a logo cost' },
  { section: 6, kind: 'platform', text: 'how does this work' },
  { section: 7, kind: 'advice', text: 'what business should I start' },
  {
    section: 8,
    kind: 'legal',
    text: 'How do I register my company and handle tax?',
  },
  { section: 9, kind: 'greeting', text: 'hello' },
  { section: 10, kind: 'nonsense', text: 'asdfghjkl qwerty' },
  { section: 11, kind: 'unrelated', text: 'I want a girlfriend' },
];

const CATEGORY_SLUGS = [
  'graphic-design',
  'photography',
  'web-development',
  'social-media-marketing',
  'content-writing-burmese',
  'video-tiktok-content',
  'translation',
  'illustration',
  'copywriting',
  'virtual-assistant',
  'other',
];

/** Same copy as locales/en.json converse.unrelatedRedirect (client path). */
const UNRELATED_REDIRECT =
  "That's outside what I help with here. If you're hiring for logo, website, photography, or social media — or planning a shop launch — say what you're working on.";

type PathTaken = 'brief' | 'roadmap' | 'redirect';

type CaseResult = {
  section: number;
  kind: string;
  input: string;
  shape: string;
  path: PathTaken;
  fallbackFired: boolean;
  response: string;
  error?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveModel(): string {
  if (process.env['GROQ_MODEL']) return process.env['GROQ_MODEL'];
  if (config.aiProvider === 'openai') {
    return process.env['OPENAI_MODEL'] ?? 'gpt-4o-mini';
  }
  return 'openai/gpt-oss-120b';
}

/** Capture demo-fallback hit / firing logs for this case only. */
function installFallbackSpy(): {
  didFire: () => boolean;
  restore: () => void;
} {
  let fired = false;
  const original = console.log.bind(console);
  console.log = (...args: unknown[]) => {
    const head = typeof args[0] === 'string' ? args[0] : '';
    if (
      head.includes('[demo-only] AI fallback cache firing') ||
      head.includes('[demo-only] AI fallback cache hit')
    ) {
      fired = true;
    }
    original(...args);
  };
  return {
    didFire: () => fired,
    restore: () => {
      console.log = original;
    },
  };
}

function formatResponsePreview(text: string, max = 400): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max)}…`;
}

async function runRoadmap(goal: string): Promise<{
  path: PathTaken;
  response: string;
  fallbackFired: boolean;
}> {
  const spy = installFallbackSpy();
  try {
    const seedGoal = isDemoRoadmapGoal(goal);
    const retryRateLimit = !(config.demoAiFallback && seedGoal);
    const result = await generateRoadmap({
      goal,
      categorySlugs: CATEGORY_SLUGS,
      locale: 'en',
      model: resolveModel(),
      log: async () => undefined,
      retryRateLimit,
    });

    if (result.ok) {
      const summary = result.steps
        .map((s) => `#${s.order} ${s.title} [${s.category_slug}]`)
        .join(' | ');
      return {
        path: 'roadmap',
        response: formatResponsePreview(
          `language=${result.language}; steps=${summary}`,
        ),
        fallbackFired: spy.didFire(),
      };
    }

    const cached = lookupRoadmapDemoFallback(goal, 'en');
    if (cached && config.demoAiFallback) {
      console.log('[demo-only] AI fallback cache firing', {
        feature: 'roadmap',
        providerErrorKind: result.errorKind,
        goal,
      });
      const summary = cached.steps
        .map((s) => `#${s.order} ${s.title} [${s.category_slug}]`)
        .join(' | ');
      return {
        path: 'roadmap',
        response: formatResponsePreview(
          `FALLBACK language=${cached.language}; steps=${summary}`,
        ),
        fallbackFired: true,
      };
    }

    return {
      path: 'roadmap',
      response: formatResponsePreview(
        `error=${result.errorKind}; notice=${result.notice ?? ''}`,
      ),
      fallbackFired: spy.didFire(),
    };
  } finally {
    spy.restore();
  }
}

async function runBrief(text: string): Promise<{
  path: PathTaken;
  response: string;
  fallbackFired: boolean;
}> {
  const spy = installFallbackSpy();
  try {
    const result = await converseBrief({
      messages: [{ role: 'user', content: text }],
      locale: 'en',
    });

    if (result.redirectTo === 'roadmap') {
      return {
        path: 'redirect',
        response: formatResponsePreview(
          result.nextQuestion ??
            '(redirectTo=roadmap; no nextQuestion — client should open Guided Plan)',
        ),
        fallbackFired: spy.didFire(),
      };
    }

    if (result.retryable) {
      return {
        path: 'brief',
        response: formatResponsePreview(
          `retryable: ${result.notice ?? '(no notice)'}`,
        ),
        fallbackFired: spy.didFire(),
      };
    }

    const parts: string[] = [];
    if (result.nextQuestion) parts.push(result.nextQuestion);
    if (result.complete) parts.push('[complete=true]');
    if (result.briefDraft?.category) {
      parts.push(`category=${result.briefDraft.category}`);
    }
    return {
      path: 'brief',
      response: formatResponsePreview(parts.join(' | ') || '(empty brief response)'),
      fallbackFired: spy.didFire(),
    };
  } finally {
    spy.restore();
  }
}

/**
 * Mirror FloatingChat / demoFlow routing:
 *   goal      → roadmap generation
 *   unrelated → warm redirect (client; no AI)
 *   else      → converseBrief (brief, or redirect if API says so)
 */
async function runCase(
  item: (typeof INPUTS)[number],
): Promise<CaseResult> {
  const shape = classifyInputShape(item.text);
  try {
    if (shape === 'goal') {
      const out = await runRoadmap(item.text);
      return {
        section: item.section,
        kind: item.kind,
        input: item.text,
        shape,
        path: out.path,
        fallbackFired: out.fallbackFired,
        response: out.response,
      };
    }

    if (shape === 'unrelated') {
      return {
        section: item.section,
        kind: item.kind,
        input: item.text,
        shape,
        path: 'redirect',
        fallbackFired: false,
        response: UNRELATED_REDIRECT,
      };
    }

    const out = await runBrief(item.text);
    return {
      section: item.section,
      kind: item.kind,
      input: item.text,
      shape,
      path: out.path,
      fallbackFired: out.fallbackFired,
      response: out.response,
    };
  } catch (err) {
    return {
      section: item.section,
      kind: item.kind,
      input: item.text,
      shape,
      path: shape === 'goal' ? 'roadmap' : 'brief',
      fallbackFired: false,
      response: '',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function formatCase(result: CaseResult): string {
  const lines = [
    `── §${result.section} ${result.kind} ──`,
    `input:          ${result.input}`,
    `shape:          ${result.shape}`,
    `path:           ${result.path}`,
    `fallbackFired:  ${result.fallbackFired}`,
    `response:       ${result.error ? `ERROR: ${result.error}` : result.response}`,
    '',
  ];
  return lines.join('\n');
}

const out = createWriteStream(OUT_PATH, { encoding: 'utf8' });
const log = (line = '') => {
  console.log(line);
  out.write(`${line}\n`);
};

log(`test-conversations — ${new Date().toISOString()}`);
log(`AI_PROVIDER=${config.aiProvider || '(unset)'} DEMO_AI_FALLBACK=${config.demoAiFallback}`);
log(`delay between calls: ${DELAY_MS}ms`);
log(`output file: ${OUT_PATH}`);
log('');

const results: CaseResult[] = [];

for (let i = 0; i < INPUTS.length; i += 1) {
  const item = INPUTS[i]!;
  log(`Running §${item.section} ${item.kind}…`);
  const result = await runCase(item);
  results.push(result);
  log(formatCase(result));

  if (i < INPUTS.length - 1) {
    log(`(waiting ${DELAY_MS / 1000}s)\n`);
    await sleep(DELAY_MS);
  }
}

log('═══ SUMMARY ═══');
for (const r of results) {
  log(
    `§${r.section} ${r.kind.padEnd(10)} path=${r.path.padEnd(8)} fallback=${String(r.fallbackFired).padEnd(5)} ${r.error ? 'ERROR' : 'ok'}`,
  );
}
log('');
log(`Wrote ${OUT_PATH}`);

await new Promise<void>((resolve, reject) => {
  out.end(() => resolve());
  out.on('error', reject);
});
