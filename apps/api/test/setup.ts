import path from 'node:path';

// Tests run outside the dev/start scripts' `node --env-file=../../.env`, so
// load it here too — otherwise config.ts's required() throws on import for
// any test that touches a module needing DATABASE_URL/SUPABASE_*.
try {
  process.loadEnvFile(path.resolve(import.meta.dirname, '../../../.env'));
} catch {
  // No .env file (e.g. CI injecting env vars directly) — fine, continue.
}
