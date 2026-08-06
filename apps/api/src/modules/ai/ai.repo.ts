import { getSql } from '../../db/client.js';
import type { AiCallLog } from '../../ai/telemetry.js';
import type { RoadmapStep, TextLanguage } from '@inyalink/shared';

export async function insertAiCall(row: AiCallLog): Promise<void> {
  const sql = getSql();
  await sql`
    insert into ai_calls (
      feature, provider, model, brief_id,
      tokens_in, tokens_out, cost_usd, latency_ms,
      succeeded, error_kind
    ) values (
      ${row.feature},
      ${row.provider},
      ${row.model},
      ${row.briefId ?? null},
      ${row.tokensIn ?? null},
      ${row.tokensOut ?? null},
      ${row.costUsd ?? null},
      ${row.latencyMs ?? null},
      ${row.succeeded},
      ${row.errorKind ?? null}
    )
  `;
}

export async function listActiveCategorySlugs(): Promise<string[]> {
  const sql = getSql();
  const rows = await sql<{ slug: string }[]>`
    select slug from categories
    where is_active = true
    order by sort asc, slug asc
  `;
  return rows.map((r) => r.slug);
}

export type InsertRoadmapRow = {
  userId: string;
  goalText: string;
  language: TextLanguage;
  steps: RoadmapStep[];
};

export async function insertRoadmap(
  row: InsertRoadmapRow,
): Promise<{ id: string }> {
  const sql = getSql();
  const inserted = await sql<{ id: string }[]>`
    insert into roadmaps (user_id, goal_text, language, steps)
    values (
      ${row.userId}::uuid,
      ${row.goalText},
      ${row.language}::text_language,
      ${sql.json(row.steps)}
    )
    returning id
  `;
  const id = inserted[0]?.id;
  if (!id) {
    throw new Error('insertRoadmap returned no id');
  }
  return { id };
}
