/** Throwaway: node --env-file=../../.env --import tsx scripts/test-roadmap.ts */
import { generateRoadmap } from '../src/ai/features/generateRoadmap.js';
import { config } from '../src/lib/config.js';

const GOAL = 'ကော်ဖီဆိုင် ဖွင့်ချင်ပါတယ်';
const CATEGORIES = [
  'graphic-design',
  'photography',
  'web-development',
  'social-media-marketing',
];

const model =
  process.env['GROQ_MODEL'] ??
  (config.aiProvider === 'openai'
    ? (process.env['OPENAI_MODEL'] ?? 'gpt-4o-mini')
    : 'openai/gpt-oss-120b');

const result = await generateRoadmap({
  goal: GOAL,
  categorySlugs: CATEGORIES,
  model,
  log: async () => undefined,
});

console.log('\n=== ROADMAP ===');
if (!result.ok) {
  console.log('error:', result.errorKind, result.notice ?? '');
  process.exitCode = 1;
} else {
  console.log('language:', result.language);
  console.log('disclaimer:', result.disclaimer);
  console.log('tokensIn', result.usage.tokensIn, 'tokensOut', result.usage.tokensOut);
  console.log('latencyMs', result.latencyMs);
  for (const step of result.steps) {
    console.log(`\n#${step.order} ${step.title}`);
    console.log('  why:', step.why);
    console.log('  category_slug:', step.category_slug);
    console.log('  est_mmk:', step.est_min_mmk, '–', step.est_max_mmk);
  }
  if (result.remappedSlugs.length === 0) {
    console.log('\nremaps: none');
  } else {
    console.log('\nREMAPPED category_slug:');
    for (const r of result.remappedSlugs) {
      console.log(`  step #${r.order}: ${r.from} → ${r.to}`);
    }
  }
}
