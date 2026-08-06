/** Time parallel explainMatch via getCandidates.
 *  node --env-file=../../.env --import tsx scripts/time-matching.ts
 */
import { closeSql, getSql } from '../src/db/client.js';
import { getCandidates } from '../src/modules/matching/matching.service.js';

const sql = getSql();
const rows = await sql<{ id: string }[]>`
  select id from briefs
  where source = 'ai_chat'
  order by created_at desc
  limit 1
`;
const id = rows[0]?.id;
if (!id) {
  throw new Error('no ai_chat brief found — run test-fullflow first');
}

console.log('briefId', id);
const t0 = Date.now();
const match = await getCandidates(id);
console.log('candidates', match.candidates.length);
for (const c of match.candidates) {
  console.log('-', c.displayName);
  console.log(' ', c.explanation);
}
console.log('matchElapsedMs', Date.now() - t0);
await closeSql();
