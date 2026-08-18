# AGENTS.md — InyaLink

Rules for AI coding agents working in this repository. Read before making changes.

> If your tool expects `.cursorrules` instead, copy or symlink this file to that name. Conventions differ between versions and tools; the content is what matters.

---

## Project

InyaLink is a Burmese-language platform where users describe a goal and get a structured brief plus a vetted professional. Users are in Myanmar on slow mobile connections. **Read `ARCHITECTURE.md` before structural changes.**

## Non-negotiable rules

**1. Never add identity-document storage.**
No NRC, no national ID number, no Smart Card, no passport, no selfie, no biometric, no government-issued personal document — no column, table, field, upload, or form input. If a task seems to require one, stop and ask. This is a user-safety requirement under Myanmar's data retention and disclosure regime, not a preference.

**2. Never expose AI provider keys to the client.**
All AI calls originate from `apps/api`. No key is ever prefixed `VITE_`. No browser-to-provider requests.

**3. Never bypass the API from the frontend.**
`apps/web` talks only to `apps/api`. No Supabase client calls for application data. Auth session handling is the sole exception.

**4. Never store raw user text without Burmese normalization.**
All text passes `normalizeToUnicode()` from `packages/burmese` at the API boundary.

**5. Never soft-delete messages.**
Retention is a hard delete via pg_cron. Do not add `deleted_at` to `messages`.

## Code conventions

**Language:** TypeScript, `strict: true`. No `any`. No `@ts-ignore` without a comment explaining why.

**Validation:** Zod at every boundary. Schemas live in `packages/shared/src/schemas/` and are imported by both API and web. Never duplicate a schema.

**Backend modules:** exactly four files, no variation.
```
modules/<name>/
  <name>.routes.ts    thin: validate → service → respond
  <name>.service.ts   business logic, no req/res
  <name>.repo.ts      SQL only, no business logic
  <name>.test.ts
```
- Routes never contain SQL
- Repos never contain business rules
- Services never touch `req` or `res`

**Database:** raw SQL via the repo layer. No ORM. Schema changes require a numbered migration in `db/migrations/` **and** an update to `db/schema.sql`. Both, always.

**RLS:** every migration that creates a table enables row level security **in that same migration**, with policies (or a documented default-deny). Never defer it to a later hardening pass — two tables did that once and sat exposed to the anon key for three days before anyone caught it. A dedicated sweep is not a reliable safety net; the migration that creates the table is.

**Frontend:** `features/` mirrors API `modules/`. TanStack Query for server state. React Hook Form + Zod resolver for forms. No Redux, no Zustand unless asked.

**Money:** `bigint` kyat. Never float. Format only via `packages/shared/src/money.ts`.

**Files:** keep under ~300 lines. Split when longer.

**Errors:** structured JSON, never a raw stack trace to the client.

## When adding a feature

Work the slice end to end in this order:
1. Zod schema in `packages/shared`
2. Migration + `schema.sql` update
3. Repo → service → route
4. Frontend feature module
5. Test

Do not build all models first, then all routes. Vertical slices only.

## Scope discipline

- Build exactly what was asked. No speculative abstraction.
- No new dependency without asking first.
- No refactoring of untouched code alongside a feature change.
- Prefer a boring solution. This codebase optimises for reviewability.

If a request seems to need a new pattern, propose it and wait rather than inventing one.

## Myanmar-specific requirements

- **Burmese line-height 1.8 minimum.** Stacked diacritics clip below that.
- **No whitespace word boundaries in Burmese.** Never split on spaces for truncation, wrapping, or search. Use `overflow-wrap: anywhere`.
- **Bundle budget: 200KB gzipped** first paint. Check before adding a dependency.
- **All UI strings in `locales/my.json` and `locales/en.json`.** No hardcoded user-facing text.
- Assume 3G and intermittent connectivity. Every fetch needs a timeout, a loading state, and a retry path.

## Testing

Vitest. Every service function gets a unit test. Every route gets an integration test. Burmese normalization tests use real device fixtures from `packages/burmese/test/fixtures/` — do not add synthetic Burmese samples.

## AI module

- Prompts live in `apps/api/src/ai/prompts/*.md`, never as string literals in code
- Every model output validated against a Zod schema; unvalidated output never reaches the UI
- On validation failure: retry once, then set `needs_human_review = true` and return gracefully
- Every call logged to `ai_calls` (tokens, cost, latency, feature)
- Conversation turns hard-capped at 5
- **Prompt changes require running `npm run evals` first.** No prompt ships without the regression suite passing.

## Before you finish

- [ ] `tsc --noEmit` clean
- [ ] Tests pass
- [ ] No new user-data column without a `db/DATA_MAP.md` entry
- [ ] No secrets added to `apps/web`
- [ ] Burmese strings render correctly at long lengths
