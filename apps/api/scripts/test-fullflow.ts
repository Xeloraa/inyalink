/**
 * Throwaway end-to-end demo:
 *   node --env-file=../../.env --import tsx scripts/test-fullflow.ts
 *
 * Requires DATABASE_URL, AI_PROVIDER + key, and db/seed.sql applied
 * (demo client b0000000-…-0001 + graphic-design pros).
 */
import type { BriefDraft, ChatMessage } from '@inyalink/shared';
import { isBriefDraftComplete } from '@inyalink/shared';
import { closeSql, getSql } from '../src/db/client.js';
import { converseBrief } from '../src/modules/ai/ai.service.js';
import { getCandidates } from '../src/modules/matching/matching.service.js';

const OPENING = 'ကော်ဖီဆိုင်အတွက် logo လိုချင်ပါတယ်';
const DEMO_CLIENT_ID = 'b0000000-0000-4000-8000-000000000001';

const FALLBACK_REPLIES = [
  'ဘတ်ဂျက်က ၃ သိန်းကနေ ၅ သိန်းလောက်ပါ။',
  'လာမယ့်လကုန်အထိ လိုချင်ပါတယ်။ ၂၀၂၆-၀၉-၃၀ လောက်။',
  'Minimalist ပုံစံ၊ အရောင်က အညိုနဲ့ cream ပါ။',
  'နာမည်က Inya Cafe ပါ။ Vector file လိုပါတယ်။',
  'Reference မရှိသေးပါဘူး၊ သင့်အကြံပေးချက်နဲ့ လုပ်ပေးပါ။',
];

function replyTo(question: string, turn: number): string {
  const q = question.toLowerCase();
  if (q.includes('အမည်') || q.includes('နာမည်') || q.includes('name')) {
    return 'ဆိုင်နာမည်က Inya Cafe ပါ။';
  }
  if (
    q.includes('style') ||
    q.includes('ပုံစံ') ||
    q.includes('အရောင်') ||
    q.includes('design') ||
    q.includes('reference')
  ) {
    return 'Minimalist ပုံစံလိုချင်ပါတယ်။ အရောင်က အညိုနဲ့ cream ပါ။';
  }
  if (q.includes('ဘတ်ဂျက်') || q.includes('budget') || q.includes('ငွေ')) {
    return 'ဘတ်ဂျက်က ၃ သိန်းကနေ ၅ သိန်းလောက်ပါ။';
  }
  if (
    q.includes('deadline') ||
    q.includes('ရက်') ||
    q.includes('အချိန်') ||
    q.includes('ဘယ်တော့')
  ) {
    return 'လာမယ့်လကုန်အထိ လိုချင်ပါတယ်။ ၂၀၂၆-၀၉-၃၀ လောက်။';
  }
  if (q.includes('file') || q.includes('format')) {
    return 'AI/SVG vector file လိုပါတယ်။';
  }
  return FALLBACK_REPLIES[turn % FALLBACK_REPLIES.length]!;
}

function finalizeDraft(draft: BriefDraft): BriefDraft {
  const patched: BriefDraft = {
    ...draft,
    language: draft.language ?? 'my',
    category: draft.category ?? 'graphic-design',
    description:
      draft.description ?? 'Inya Cafe အတွက် logo ဒီဇိုင်း လိုအပ်ပါတယ်။',
    budget_min_mmk: draft.budget_min_mmk ?? 300_000,
    budget_max_mmk: draft.budget_max_mmk ?? 500_000,
    deadline: draft.deadline ?? '2026-09-30',
    requirements: draft.requirements ?? [
      'ဆိုင်နာမည်: Inya Cafe',
      'စတိုင်: Minimalist',
      'အရောင်: အညို, cream',
    ],
    needs_human_review: false,
  };
  if (!isBriefDraftComplete(patched)) {
    throw new Error('cannot finalize incomplete draft');
  }
  return patched;
}

async function runConverse(): Promise<BriefDraft> {
  const messages: ChatMessage[] = [{ role: 'user', content: OPENING }];
  let briefDraft: BriefDraft | undefined;
  console.log('USER:', OPENING);

  for (let turn = 1; turn <= 8; turn += 1) {
    const result = await converseBrief({ messages, briefDraft });
    if (result.retryable) {
      console.log('rate-limited, waiting 10s…', result.notice ?? '');
      await new Promise((r) => setTimeout(r, 10_000));
      turn -= 1;
      continue;
    }
    briefDraft = result.briefDraft;
    console.log(`\n--- converse turn ${turn} ---`);
    console.log('complete:', result.complete);
    console.log('draft:', JSON.stringify(briefDraft, null, 2));

    if (result.complete) return briefDraft;

    if (!result.nextQuestion) {
      console.log('no nextQuestion — finalizing draft from collected answers');
      return finalizeDraft(briefDraft);
    }

    const answer = replyTo(result.nextQuestion, turn);
    console.log('QUESTION:', result.nextQuestion);
    console.log('USER:', answer);
    messages.push({ role: 'assistant', content: result.nextQuestion });
    messages.push({ role: 'user', content: answer });
  }

  console.log('turn budget exhausted — finalizing draft');
  return finalizeDraft(briefDraft ?? {});
}

async function resolveCategoryId(slugOrName: string): Promise<string> {
  const sql = getSql();
  const rows = await sql<{ id: string }[]>`
    select id from categories
    where slug = ${slugOrName}
       or name_en ilike ${slugOrName}
       or name_my = ${slugOrName}
    limit 1
  `;
  const id = rows[0]?.id;
  if (!id) throw new Error(`category not found: ${slugOrName}`);
  return id;
}

async function persistBrief(draft: BriefDraft): Promise<string> {
  if (!draft.category?.trim()) {
    throw new Error('draft missing category — cannot persist');
  }
  if (!draft.description?.trim()) {
    throw new Error('draft missing description — cannot persist');
  }

  const sql = getSql();
  const categoryId = await resolveCategoryId(draft.category);
  const requirements = draft.requirements ?? [];
  const inserted = await sql<{ id: string }[]>`
    insert into briefs (
      client_id, status, source, raw_input, language, category_id,
      title, description, requirements,
      budget_min_mmk, budget_max_mmk, deadline, reference_links,
      ai_confidence, needs_human_review
    ) values (
      ${DEMO_CLIENT_ID}::uuid,
      'submitted'::brief_status,
      'ai_chat'::brief_source,
      ${OPENING},
      ${draft.language ?? null}::text_language,
      ${categoryId}::uuid,
      ${draft.title ?? null},
      ${draft.description},
      ${sql.json(requirements)},
      ${draft.budget_min_mmk ?? null},
      ${draft.budget_max_mmk ?? null},
      ${draft.deadline ?? null}::date,
      ${draft.reference_links ?? []},
      ${draft.ai_confidence ?? null},
      ${draft.needs_human_review ?? false}
    )
    returning id
  `;
  const id = inserted[0]?.id;
  if (!id) throw new Error('brief insert returned no id');
  return id;
}

async function sumTokensSince(since: Date): Promise<{ in: number; out: number }> {
  const sql = getSql();
  const rows = await sql<{ tin: string; tout: string }[]>`
    select
      coalesce(sum(tokens_in), 0)::text as tin,
      coalesce(sum(tokens_out), 0)::text as tout
    from ai_calls
    where created_at >= ${since.toISOString()}::timestamptz
  `;
  return {
    in: Number(rows[0]?.tin ?? 0),
    out: Number(rows[0]?.tout ?? 0),
  };
}

const started = new Date();
const t0 = Date.now();

try {
  console.log('\n=== 1. CONVERSE → briefDraft ===\n');
  const draft = await runConverse();

  console.log('\n=== 2. PERSIST brief ===\n');
  const briefId = await persistBrief(draft);
  console.log('briefId:', briefId);

  console.log('\n=== 3. MATCHING candidates ===\n');
  const matchT0 = Date.now();
  const match = await getCandidates(briefId);
  const matchElapsedMs = Date.now() - matchT0;
  console.log(`language: ${match.language ?? 'null'}, candidates: ${match.candidates.length}`);
  console.log('matchElapsedMs:', matchElapsedMs);

  for (const [i, c] of match.candidates.entries()) {
    const r = c.reputation;
    console.log(`\n#${i + 1} ${c.displayName}  (score ${c.score})`);
    console.log(
      `  reputation: completed=${r.completedCount} declined=${r.declinedCount}` +
        ` uniqueClients=${r.uniqueClients}` +
        ` completionRate%=${r.completionRatePct ?? 'n/a'}` +
        ` medianResponseMins=${r.medianResponseMins ?? 'n/a'}`,
    );
    console.log(`  explanation: ${c.explanation}`);
  }

  const tokens = await sumTokensSince(started);
  console.log('\n=== TOTALS ===');
  console.log('elapsedMs:', Date.now() - t0);
  console.log('tokensIn:', tokens.in, 'tokensOut:', tokens.out, 'tokensTotal:', tokens.in + tokens.out);
} catch (err) {
  console.error('\nFULLFLOW FAILED', err);
  process.exitCode = 1;
} finally {
  await closeSql();
}
