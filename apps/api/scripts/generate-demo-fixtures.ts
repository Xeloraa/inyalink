/**
 * Generate demo-fallback fixtures from live provider output.
 *
 * Usage (from apps/api):
 *   node --env-file=../../.env --import tsx scripts/generate-demo-fixtures.ts
 *   node --env-file=../../.env --import tsx scripts/generate-demo-fixtures.ts --only=cafe-logo
 *   node --env-file=../../.env --import tsx scripts/generate-demo-fixtures.ts --force
 *
 * Writes genuine structureBrief / generateRoadmap JSON under
 * src/ai/demo-fallback/fixtures/. Skips files that already exist unless --force.
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BriefDraft, ChatMessage, UiLocale } from '@inyalink/shared';
import { structureBrief } from '../src/ai/features/structureBrief.js';
import { generateRoadmap as runGenerateRoadmap } from '../src/ai/features/generateRoadmap.js';
import { config } from '../src/lib/config.js';

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../src/ai/demo-fallback/fixtures',
);

const CATEGORIES = [
  'graphic-design',
  'photography',
  'web-development',
  'social-media-marketing',
  'content-writing',
  'video-production',
];

const force = process.argv.includes('--force');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const onlySlug = onlyArg?.slice('--only='.length) ?? null;

const model =
  process.env['GROQ_MODEL'] ??
  (config.aiProvider === 'openai'
    ? (process.env['OPENAI_MODEL'] ?? 'gpt-4o-mini')
    : 'openai/gpt-oss-120b');

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function noopLog(): Promise<void> {
  /* fixture generation — do not write ai_calls */
}

function replyTo(question: string, turn: number, locale: UiLocale): string {
  // Prefer the last sentence — questions often echo prior answers ("Minimalist
  // style noted. What budget…?") which would otherwise false-match earlier rules.
  const sentences = question
    .split(/(?<=[.?။])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const q = (sentences[sentences.length - 1] ?? question).toLowerCase();
  const my = locale === 'my';

  // Budget / deadline before style — acknowledgements often contain "style".
  if (/ဘတ်ဂျက်|budget|ငွေ|ကျသင့်|ကုန်ကျ|price|cost|ဘယ်လောက်/i.test(q)) {
    return my
      ? 'ဘတ်ဂျက်က ၃ သိန်းကနေ ၅ သိန်းလောက်ပါ။ Deadline က ၂၀၂၆-၀၉-၃၀ ပါ။'
      : 'Budget is about 300,000–500,000 MMK. Deadline 2026-09-30.';
  }
  if (/deadline|timeline|ရက်|အချိန်|ဘယ်တော့|when do you need/i.test(q)) {
    return my
      ? 'လာမယ့်လကုန်အထိ လိုချင်ပါတယ်။ ၂၀၂၆-၀၉-၃၀ လောက်။'
      : 'I need it by 2026-09-30.';
  }
  if (
    /အမည်|နာမည်|name|ဆိုင်နာမည်|business name|brand name|company/i.test(q)
  ) {
    return my ? 'ဆိုင်နာမည်က Inya Cafe ပါ။' : 'The business name is Inya Cafe.';
  }
  if (/scope|signage|packaging|တစ်ခုတည်း|just the|only logo|website pages/i.test(q)) {
    return my
      ? 'လောလောဆယ် အဓိက deliverable တစ်ခုတည်း လိုပါတယ်။'
      : 'Just the main deliverable for now.';
  }
  if (
    /style|ပုံစံ|အရောင်|design|reference|ဥပမာ|ကြိုက်|tone|voice|look/i.test(q)
  ) {
    return my
      ? 'Minimalist ပုံစံလိုချင်ပါတယ်။ အရောင်က အညိုနဲ့ cream ပါ။'
      : 'Minimalist style, brown and cream. No reference link yet.';
  }
  if (/platform|facebook|instagram|channel/i.test(q)) {
    return my
      ? 'Facebook နဲ့ Instagram ပါ။'
      : 'Facebook and Instagram.';
  }
  if (/file|format|deliver|resolution|pages?/i.test(q)) {
    return my
      ? 'Source file / editable format လိုပါတယ်။'
      : 'Editable source files please.';
  }

  const fallbacksMy = [
    'Inya Cafe ပါ။',
    'အဓိက deliverable တစ်ခုတည်းပါ။',
    'Minimalist ပုံစံပါ။',
    'ဘတ်ဂျက် ၃–၅ သိန်း၊ deadline ၂၀၂၆-၀၉-၃၀။',
  ];
  const fallbacksEn = [
    'Inya Cafe.',
    'Just the main deliverable for now.',
    'Minimalist style.',
    'Budget 300000-500000, deadline 2026-09-30.',
  ];
  const list = my ? fallbacksMy : fallbacksEn;
  return list[turn % list.length]!;
}

type ConverseSpec = {
  kind: 'converse';
  slug: string;
  locale: UiLocale;
  matchInput: string;
  aliases?: string[];
};

type RoadmapSpec = {
  kind: 'roadmap';
  slug: string;
  locale: UiLocale;
  matchInput: string;
  aliases?: string[];
};

type Spec = ConverseSpec | RoadmapSpec;

/** ~25 fixtures covering likely demo inputs (Burmese + English). */
const SPECS: Spec[] = [
  // Existing cafe logo / cafe open (regenerate or skip if present)
  {
    kind: 'converse',
    slug: 'cafe-logo',
    locale: 'my',
    matchInput: 'ကော်ဖီဆိုင်အတွက် logo လိုချင်ပါတယ်',
    aliases: ['ကော်ဖီဆိုင် လိုဂို လိုချင်ပါတယ်'],
  },
  {
    kind: 'converse',
    slug: 'cafe-logo',
    locale: 'en',
    matchInput: 'ကော်ဖီဆိုင်အတွက် logo လိုချင်ပါတယ်',
    aliases: ['ကော်ဖီဆိုင် လိုဂို လိုချင်ပါတယ်'],
  },
  {
    kind: 'converse',
    slug: 'logo',
    locale: 'en',
    matchInput: 'I need a logo for my cafe',
    aliases: ['I want a logo for my coffee shop'],
  },
  {
    kind: 'converse',
    slug: 'logo-simple',
    locale: 'my',
    matchInput: 'logo လိုချင်ပါတယ်',
    aliases: ['လိုဂို လိုချင်ပါတယ်'],
  },
  {
    kind: 'converse',
    slug: 'website',
    locale: 'my',
    matchInput: 'ဆိုင်အတွက် website လိုချင်ပါတယ်',
    aliases: ['ဝက်ဘ်ဆိုက် လိုချင်ပါတယ်'],
  },
  {
    kind: 'converse',
    slug: 'website',
    locale: 'en',
    matchInput: 'I need a website for my shop',
    aliases: ['I want a website'],
  },
  {
    kind: 'converse',
    slug: 'social',
    locale: 'my',
    matchInput: 'Facebook Instagram စီမံပေးချင်ပါတယ်',
    aliases: ['social media လုပ်ပေးချင်ပါတယ်'],
  },
  {
    kind: 'converse',
    slug: 'social',
    locale: 'en',
    matchInput: 'I need social media management',
    aliases: ['I want Facebook and Instagram management'],
  },
  {
    kind: 'converse',
    slug: 'content',
    locale: 'my',
    matchInput: 'content writing လိုချင်ပါတယ်',
    aliases: ['ကော်ပီ ရေးပေးချင်ပါတယ်'],
  },
  {
    kind: 'converse',
    slug: 'content',
    locale: 'en',
    matchInput: 'I need a content writer',
    aliases: ['looking for a content writer'],
  },
  {
    kind: 'converse',
    slug: 'photo',
    locale: 'my',
    matchInput: 'ဆိုင်အတွက် ဓာတ်ပုံ ရိုက်ပေးချင်ပါတယ်',
    aliases: ['photography လိုချင်ပါတယ်'],
  },
  {
    kind: 'converse',
    slug: 'photo',
    locale: 'en',
    matchInput: 'I need photography for my shop',
    aliases: ['I want product photography'],
  },
  {
    kind: 'converse',
    slug: 'price-logo',
    locale: 'my',
    matchInput: 'logo က ဘယ်လောက်ကျမလဲ',
    aliases: ['လိုဂို ဈေးနှုန်း ဘယ်လောက်လဲ'],
  },
  {
    kind: 'converse',
    slug: 'price-logo',
    locale: 'en',
    matchInput: 'how much does a logo cost',
    aliases: ['how much for a logo'],
  },
  {
    kind: 'converse',
    slug: 'price-web',
    locale: 'en',
    matchInput: 'how much for a website',
    aliases: ['website price'],
  },
  {
    kind: 'converse',
    slug: 'facebook',
    locale: 'my',
    matchInput: 'Facebook page လုပ်ပေးချင်ပါတယ်',
  },
  {
    kind: 'roadmap',
    slug: 'cafe-open',
    locale: 'my',
    matchInput: 'ကော်ဖီဆိုင် ဖွင့်ချင်ပါတယ်',
    aliases: ['ကော်ဖီဆိုင် ဖွင့်ချင်ပါတယ်။ ဘာတွေ လိုအပ်မလဲ?'],
  },
  {
    kind: 'roadmap',
    slug: 'cafe-open',
    locale: 'en',
    matchInput: 'ကော်ဖီဆိုင် ဖွင့်ချင်ပါတယ်',
    aliases: ['ကော်ဖီဆိုင် ဖွင့်ချင်ပါတယ်။ ဘာတွေ လိုအပ်မလဲ?'],
  },
  {
    kind: 'roadmap',
    slug: 'open-cafe',
    locale: 'en',
    matchInput: 'I want to open a cafe',
    aliases: ['I want to open a coffee shop'],
  },
  {
    kind: 'roadmap',
    slug: 'no-customers',
    locale: 'my',
    matchInput: 'ဆိုင်က ဖောက်သည် မရဘူး',
    aliases: ['အရောင်း မကောင်းဘူး'],
  },
  {
    kind: 'roadmap',
    slug: 'no-customers',
    locale: 'en',
    matchInput: "my shop isn't getting customers",
    aliases: ['not getting customers'],
  },
  {
    kind: 'roadmap',
    slug: 'dont-know',
    locale: 'my',
    matchInput: 'ဘယ်က စရမလဲ',
    aliases: ['ဘာတွေ လိုအပ်မှန်း မသိဘူး'],
  },
  {
    kind: 'roadmap',
    slug: 'dont-know',
    locale: 'en',
    matchInput: "I don't know where to start",
    aliases: ['where should I start'],
  },
  {
    kind: 'roadmap',
    slug: 'start-business',
    locale: 'my',
    matchInput: 'စီးပွားရေး စတင်ချင်ပါတယ်',
    aliases: ['ဆိုင်ဖွင့်ချင်တယ်'],
  },
  {
    kind: 'roadmap',
    slug: 'grow-shop',
    locale: 'en',
    matchInput: 'I want to grow my shop',
    aliases: ['how do I grow my business'],
  },
];

function outPath(spec: Spec): string {
  return join(fixturesDir, `${spec.kind}-${spec.slug}.${spec.locale}.json`);
}

async function withTurnRetries<T>(
  label: string,
  run: () => Promise<T>,
): Promise<T> {
  const maxAttempts = 10;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await run();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const retryable =
        /AI_RATE_LIMIT|rate.?limit|busy|retryable|validation_failed|fetch failed|timeout|ECONNRESET|UND_ERR|Connect Timeout|provider failed/i.test(
          msg,
        );
      if (!retryable || attempt >= maxAttempts - 1) throw err;
      const waitMs = Math.min(240_000, 60_000 * (attempt + 1));
      console.log(
        `${label}: transient (${msg.slice(0, 80)}); waiting ${waitMs / 1000}s then retrying turn…`,
      );
      await sleep(waitMs);
    }
  }
  throw new Error(`${label}: exhausted turn retries`);
}

async function generateConverse(spec: ConverseSpec): Promise<void> {
  const file = outPath(spec);
  if (!force && existsSync(file)) {
    console.log('skip (exists)', file);
    return;
  }

  console.log('\n=== converse', spec.slug, spec.locale, '===');
  console.log('opening:', spec.matchInput);

  const messages: ChatMessage[] = [
    { role: 'user', content: spec.matchInput },
  ];
  let briefDraft: BriefDraft | undefined;
  const questions: string[] = [];
  const draftsAfterUserTurn: Record<string, unknown>[] = [];
  let finalBrief: Record<string, unknown> | null = null;
  let safety = 0;

  while (safety < 8) {
    safety += 1;
    const turnLabel = `${spec.slug}.${spec.locale}#${safety}`;
    const result = await withTurnRetries(turnLabel, async () => {
      const raw = await structureBrief({
        messages,
        briefDraft,
        locale: spec.locale,
        maxQuestions: Math.min(3, config.aiMaxTurns),
        model,
        log: noopLog,
        retryRateLimit: true,
      });
      if (raw.providerFailed || raw.retryable) {
        throw new Error(
          `provider failed (${raw.providerErrorKind ?? 'retryable'})`,
        );
      }
      return raw;
    });

    briefDraft = result.briefDraft;
    draftsAfterUserTurn.push({ ...result.briefDraft });

    if (result.complete) {
      finalBrief = { ...result.briefDraft };
      break;
    }

    if (!result.nextQuestion) {
      // Provider returned incomplete without a question — salvage current draft.
      console.log(
        `warn: no nextQuestion for ${spec.slug}.${spec.locale}; salvaging draft`,
      );
      finalBrief = { ...(briefDraft ?? {}) };
      break;
    }

    questions.push(result.nextQuestion);
    console.log('Q:', result.nextQuestion.slice(0, 100));
    const answer = replyTo(result.nextQuestion, safety, spec.locale);
    console.log('A:', answer);
    messages.push({ role: 'assistant', content: result.nextQuestion });
    messages.push({ role: 'user', content: answer });
    // Pace for Groq free-tier TPM / RPM.
    await sleep(35_000);
  }

  if (!finalBrief) {
    finalBrief = { ...(briefDraft ?? {}) };
  }

  const progressive = draftsAfterUserTurn.slice(
    0,
    Math.max(questions.length, 1),
  );

  const payload = {
    demoOnly: true as const,
    note: `DEMO ONLY — recorded from live ${config.aiProvider || 'provider'} structureBrief. Served when the live provider rate-limits or errors.`,
    kind: 'converse' as const,
    matchInput: spec.matchInput,
    aliases: spec.aliases ?? [],
    locale: spec.locale,
    questions,
    draftsAfterUserTurn: progressive,
    finalBrief,
  };

  mkdirSync(fixturesDir, { recursive: true });
  writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log('wrote', file, `(${questions.length} questions)`);
  await sleep(45_000);
}

async function recordRoadmap(spec: RoadmapSpec): Promise<void> {
  const file = outPath(spec);
  if (!force && existsSync(file)) {
    console.log('skip (exists)', file);
    return;
  }

  console.log('\n=== roadmap', spec.slug, spec.locale, '===');
  console.log('goal:', spec.matchInput);

  const result = await withTurnRetries(`${spec.slug}.${spec.locale}`, async () => {
    const raw = await runGenerateRoadmap({
      goal: spec.matchInput,
      categorySlugs: CATEGORIES,
      locale: spec.locale,
      model,
      log: noopLog,
      retryRateLimit: true,
    });
    if (!raw.ok) {
      throw new Error(`roadmap failed (${raw.errorKind})`);
    }
    return raw;
  });

  const payload = {
    demoOnly: true as const,
    note: `DEMO ONLY — recorded from live ${config.aiProvider || 'provider'} generateRoadmap. Served when the live provider rate-limits or errors.`,
    kind: 'roadmap' as const,
    matchInput: spec.matchInput,
    aliases: spec.aliases ?? [],
    locale: spec.locale,
    language: result.language,
    disclaimer: result.disclaimer,
    steps: result.steps,
  };

  mkdirSync(fixturesDir, { recursive: true });
  writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log('wrote', file, `(${result.steps.length} steps)`);
  await sleep(45_000);
}

async function main(): Promise<void> {
  if (!config.aiProvider) {
    console.error('AI_PROVIDER is not set');
    process.exitCode = 1;
    return;
  }

  const kindFilter = process.argv.includes('--roadmaps')
    ? 'roadmap'
    : process.argv.includes('--converse')
      ? 'converse'
      : null;

  const specs = SPECS.filter((s) => {
    if (onlySlug && s.slug !== onlySlug) return false;
    if (kindFilter && s.kind !== kindFilter) return false;
    return true;
  }).sort((a, b) => {
    // Roadmaps are one call — record them before multi-turn converse scripts.
    if (a.kind === b.kind) return 0;
    return a.kind === 'roadmap' ? -1 : 1;
  });

  console.log(
    `Generating ${specs.length} fixtures (force=${force}, provider=${config.aiProvider})`,
  );

  for (const spec of specs) {
    try {
      if (spec.kind === 'converse') await generateConverse(spec);
      else await recordRoadmap(spec);
    } catch (err) {
      console.error('FAILED', spec.kind, spec.slug, spec.locale, err);
      // Continue — partial set is still useful; re-run with --only / --force.
    }
  }

  console.log('\nDone. Re-run with --force to overwrite, or --only=slug for one.');
}

await main();
