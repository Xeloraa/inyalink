import { getSql } from '../db/client.js';
import { config } from './config.js';

export type RetentionCleanupResult = {
  messagesDeleted: number;
  conversationsDeleted: number;
};

/**
 * Hard-delete expired messages and AI conversations.
 * Mirrors the pg_cron jobs in schema.sql / migrations 0008 + 0010.
 *
 * Why an app fallback: Supabase free-tier DBs pause after inactivity, so
 * pg_cron does not fire while paused. Local/dev may also lack pg_cron.
 * This job is idempotent with the SQL cron deletes.
 */
export async function runRetentionCleanup(): Promise<RetentionCleanupResult> {
  const sql = getSql();

  const deletedMessages = await sql<{ id: string }[]>`
    delete from messages
    where expires_at < now()
    returning id
  `;

  const deletedConversations = await sql<{ id: string }[]>`
    delete from ai_conversations
    where expires_at < now()
    returning id
  `;

  return {
    messagesDeleted: deletedMessages.length,
    conversationsDeleted: deletedConversations.length,
  };
}

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000; // hourly

/**
 * Run cleanup once on boot, then on an interval. No-ops when DATABASE_URL
 * is unset (tests / misconfigured boots).
 */
export function startRetentionScheduler(
  intervalMs: number = DEFAULT_INTERVAL_MS,
): NodeJS.Timeout | null {
  if (!config.databaseUrl) {
    console.warn(
      '[retention] DATABASE_URL unset — skipping retention scheduler',
    );
    return null;
  }

  const tick = (): void => {
    void runRetentionCleanup()
      .then((result) => {
        if (
          result.messagesDeleted > 0 ||
          result.conversationsDeleted > 0
        ) {
          console.log('[retention] cleanup', result);
        }
      })
      .catch((err: unknown) => {
        console.error('[retention] cleanup failed', err);
      });
  };

  tick();
  return setInterval(tick, intervalMs);
}
