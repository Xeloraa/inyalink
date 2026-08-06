/**
 * Verify matching list is LLM-free: create → submit → GET candidates.
 * List must return 3 pros with reputation/portfolio and explanation: null
 * even when explanations would fail (covered separately in matching.test.ts).
 *
 *   node --env-file=../../.env --import tsx scripts/verify-matching-without-llm.ts
 */
import { closeSql } from '../src/db/client.js';
import * as briefs from '../src/modules/briefs/briefs.service.js';
import { getCandidates } from '../src/modules/matching/matching.service.js';

const DEMO_CLIENT_ID = 'b0000000-0000-4000-8000-000000000001';

try {
  const created = await briefs.createBrief(
    {
      source: 'ai_chat',
      raw_input: 'ကော်ဖီဆိုင် လိုဂို လိုချင်ပါတယ်',
      draft: {
        language: 'my',
        category: 'graphic-design',
        title: 'Inya Cafe logo',
        description: 'Need a cafe logo',
        requirements: ['logo', 'branding'],
        budget_min_mmk: 300_000,
        budget_max_mmk: 500_000,
        deadline: '2026-09-30',
      },
    },
    DEMO_CLIENT_ID,
  );

  const submitted = await briefs.submitBrief(
    created.id,
    { urgent: false },
    DEMO_CLIENT_ID,
  );
  console.log('brief', submitted.id, 'ranked_at', submitted.ranked_at);

  const match = await getCandidates(submitted.id, DEMO_CLIENT_ID);
  console.log('status', match.status);
  console.log('candidates', match.candidates.length);

  if (match.status !== 'ready' || match.candidates.length !== 3) {
    throw new Error(
      `expected ready + 3 candidates, got ${match.status} / ${match.candidates.length}`,
    );
  }

  for (const c of match.candidates) {
    console.log(
      '-',
      c.displayName,
      'completed',
      c.reputation.completedCount,
      'clients',
      c.reputation.uniqueClients,
      'portfolio',
      c.portfolio.length,
      'explanation',
      c.explanation,
    );
    if (c.explanation !== null) {
      throw new Error('list endpoint must return explanation: null');
    }
    if (c.portfolio.length === 0) {
      throw new Error(`expected portfolio thumbs for ${c.displayName}`);
    }
  }

  console.log(
    'OK — three professionals with reputation/portfolio; explanation null (LLM not required)',
  );
} finally {
  await closeSql();
}
