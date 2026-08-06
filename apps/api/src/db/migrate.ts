import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeSql, getSql } from './client.js';

const migrationsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../db/migrations',
);

export async function migrate(): Promise<void> {
  const sql = getSql();

  await sql`
    create table if not exists schema_migrations (
      filename   text primary key,
      applied_at timestamptz not null default now()
    )
  `;

  const applied = await sql<{ filename: string }[]>`
    select filename from schema_migrations
  `;
  const appliedSet = new Set(applied.map((row) => row.filename));

  const entries = await fs.readdir(migrationsDir);
  const files = entries.filter((name) => /^\d{4}_.+\.sql$/.test(name)).sort();

  for (const filename of files) {
    if (appliedSet.has(filename)) {
      continue;
    }

    const fullPath = path.join(migrationsDir, filename);

    await sql.begin(async (tx) => {
      await tx.file(fullPath);
      await tx`
        insert into schema_migrations (filename)
        values (${filename})
      `;
    });

    console.log(`applied ${filename}`);
  }
}

async function main(): Promise<void> {
  try {
    await migrate();
    console.log('migrations complete');
  } finally {
    await closeSql();
  }
}

const isDirectRun =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  });
}
