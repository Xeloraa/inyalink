import postgres from 'postgres';
import { config } from '../lib/config.js';

export type Sql = ReturnType<typeof postgres>;

let client: Sql | null = null;

export function getSql(): Sql {
  if (client) {
    return client;
  }

  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  client = postgres(config.databaseUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return client;
}

export async function closeSql(): Promise<void> {
  if (!client) {
    return;
  }
  await client.end({ timeout: 5 });
  client = null;
}
