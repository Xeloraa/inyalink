/** Confirm explainMatch returns a real model sentence, not the canned fallback.
 *  node --env-file=../../.env --import tsx scripts/test-explain-match.ts
 */
import { explainMatch } from '../src/ai/features/explainMatch.js';

const FALLBACK_FRAGMENT = 'သည် ဤအလုပ်၏ အမျိုးအစားနှင့် လိုအပ်သော ကျွမ်းကျင်မှုများနှင့် ကိုက်ညီပါသည်';
const MIXED_FALLBACK = 'က ဒီ brief ရဲ့ category နဲ့ skills နဲ့ ကိုက်ညီပါတယ်';

const t0 = Date.now();
const result = await explainMatch({
  briefId: '11111111-1111-4111-8111-111111111111',
  brief: {
    title: 'Inya Cafe logo',
    description: 'Inya Cafe အတွက် logo design',
    requirements: ['Minimalist', 'logo', 'branding'],
    budgetMinMmk: 300_000,
    budgetMaxMmk: 500_000,
    language: 'my',
  },
  professional: {
    displayName: 'မင်းထက် · Min Thet',
    headlineMy: 'လိုဂိုနှင့် ဘရန်းဒ် ဒီဇိုင်း',
    headlineEn: 'Logo and brand design',
    skills: ['logo', 'branding', 'packaging'],
    minBudgetMmk: 150_000,
    typicalTurnaroundDays: 5,
    completionRatePct: 100,
    completedCount: 4,
  },
  model: 'unused-default',
  locale: 'my',
  log: async (row) => {
    console.log(
      'log',
      row.model,
      row.succeeded,
      row.errorKind ?? '',
      'tokens',
      row.tokensIn,
      row.tokensOut,
      'latencyMs',
      row.latencyMs,
    );
  },
});

console.log('wallMs:', Date.now() - t0);
console.log('ok:', result.ok);
console.log('explanation:', result.explanation);
if (!result.ok) {
  console.log('errorKind:', result.errorKind);
  process.exitCode = 1;
} else if (
  result.explanation.includes(FALLBACK_FRAGMENT) ||
  result.explanation.includes(MIXED_FALLBACK)
) {
  console.error('FAIL: still using canned fallback');
  process.exitCode = 1;
} else {
  console.log('PASS: generated explanation (not fallback)');
}
