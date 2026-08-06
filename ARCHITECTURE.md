# InyaLink — Technical Architecture

**Version:** 1.0
**Date:** August 2026
**Build environment:** Cursor (agentic coding)

This document is written to be read by both you and your coding agent. Keep it in the repo root. When Cursor drifts, point it back here.

---

## 1. Governing principles

Six decisions that everything else follows from. If a later choice conflicts with one of these, the principle wins.

**1. One way to do everything.** When an AI agent writes most of your code, consistency matters more than local optimality. Two valid patterns for the same job means the agent picks randomly and your codebase forks. Every rule below exists to remove a choice.

**2. All traffic goes through the Express API.** The frontend never queries Supabase directly for application data. Supabase is Postgres + Auth + Storage, nothing more. This costs one network hop and buys a single place where authorization, validation, logging, and rate limiting live.

**3. TypeScript everywhere, Zod at every boundary.** Types are the contract an agent reads to stay correct. A shared package of Zod schemas that generates both runtime validation and static types is the highest-leverage thing in this repo.

**4. Stage 1 must work with zero AI.** The manual form and the AI chat produce the same `Brief`. Build the concierge product first; the AI module slots in behind an existing interface.

**5. The schema makes the wrong thing impossible.** There is no identity-document table, no NRC column, no biometric storage. Not "we chose not to populate it" — it does not exist. An agent cannot write to a column that isn't there.

**6. Assume the network is hostile.** Slow mobile, VPN routing, localised shutdowns. Every feature degrades rather than fails.

---

## 2. Repository shape

npm workspaces. Not Turborepo, not pnpm, not Nx — you are one person and the tooling tax isn't worth it.

```
inyalink/
├── AGENTS.md                 ← agent rules (read this first)
├── ARCHITECTURE.md           ← this file
├── package.json              ← workspaces root
├── .env.example
│
├── packages/
│   ├── shared/               ← THE CONTRACT. Zod schemas + types.
│   │   ├── src/
│   │   │   ├── schemas/      brief.ts, professional.ts, engagement.ts...
│   │   │   ├── enums.ts      statuses, roles, categories
│   │   │   ├── money.ts      MMK helpers
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── burmese/              ← Zawgyi/Unicode. Isolated, heavily tested.
│       ├── src/
│       │   ├── detect.ts
│       │   ├── normalize.ts
│       │   └── index.ts
│       └── test/fixtures/    real device samples, not synthetic
│
├── apps/
│   ├── api/                  ← Express + TS
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── db/           client, migrations runner
│   │   │   ├── middleware/   auth, validate, rateLimit, errors
│   │   │   ├── modules/      ← feature-sliced, see §4
│   │   │   │   ├── auth/
│   │   │   │   ├── briefs/
│   │   │   │   ├── professionals/
│   │   │   │   ├── matching/
│   │   │   │   ├── engagements/
│   │   │   │   ├── messages/
│   │   │   │   └── admin/
│   │   │   ├── ai/           ← see §6
│   │   │   └── lib/          logger, errors, config
│   │   └── test/
│   │
│   └── web/                  ← React + Vite + TS
│       ├── src/
│       │   ├── main.tsx
│       │   ├── routes/       file-per-route
│       │   ├── features/     ← mirrors api/modules
│       │   ├── components/   shared UI primitives only
│       │   ├── lib/          apiClient, queryClient, i18n
│       │   └── locales/      my.json, en.json
│       └── index.html
│
├── db/
│   ├── schema.sql            ← canonical
│   ├── migrations/           ← 0001_init.sql, 0002_...
│   └── seed.sql              categories + dev fixtures
│
└── evals/                    ← AI prompt regression suite (§6.4)
    ├── fixtures/             real briefs from concierge
    └── run.ts
```

**Why `features/` mirrors `modules/`:** when you tell Cursor "add budget range to briefs," it finds `packages/shared/src/schemas/brief.ts`, `apps/api/src/modules/briefs/`, and `apps/web/src/features/briefs/`. Three predictable locations. Symmetry is a machine-readable convention.

---

## 3. Stack, locked

| Layer | Choice | Note |
|---|---|---|
| Language | TypeScript, `strict: true` | Non-negotiable with an agent |
| Frontend | React 18 + Vite | Your existing prototype |
| Routing | React Router | File-per-route under `routes/` |
| Server state | TanStack Query | No Redux. No Zustand unless proven need. |
| Styling | Tailwind | Must support Burmese text rendering — see §8.2 |
| Forms | React Hook Form + Zod resolver | Same schemas as the API |
| Backend | Express 4 + TS | Boring on purpose |
| Validation | Zod | Every boundary, no exceptions |
| DB | Supabase Postgres | RLS on as defence-in-depth |
| Migrations | Plain SQL files, numbered | No ORM migration magic |
| DB access | `postgres.js` or `pg` | Direct SQL. No ORM. |
| Auth | Supabase Auth, phone OTP | See §8.3 for the SMS problem |
| Storage | Supabase Storage, private | Portfolio files only |
| AI | Provider-abstracted | §6 |
| Testing | Vitest | Unit + integration |
| Scheduled jobs | pg_cron | Retention deletion (§8.4) |

**No ORM.** Prisma and Drizzle add a schema-definition layer that competes with `schema.sql` for authority. With an agent writing code, two sources of schema truth is a reliable way to get drift. Write SQL, type the results with Zod, move on.

**Rejected:** Next.js (you have Vite and don't need SSR), GraphQL (over-engineering at this scale), Redux (TanStack Query covers it), microservices (you are one person), Docker for local dev (Supabase local is enough).

---

## 4. Backend module pattern

Every module is exactly four files. No variation.

```
modules/briefs/
├── briefs.routes.ts      Express router. Thin. Validate → call service → respond.
├── briefs.service.ts     Business logic. No req/res. Testable in isolation.
├── briefs.repo.ts        SQL only. No business logic.
└── briefs.test.ts
```

**Rules the agent must not break:**
- Routes never contain SQL
- Repos never contain business rules
- Services never touch `req` or `res`
- All input validated by a shared Zod schema before reaching the service
- Every handler wrapped in the async error middleware

Example shape:

```ts
// briefs.routes.ts
router.post('/',
  requireAuth,
  validate(CreateBriefInput),
  async (req, res) => {
    const brief = await briefService.create(req.user.id, req.body);
    res.status(201).json(brief);
  }
);
```

That's the whole route. If a route file grows past ~80 lines, logic has leaked upward.

---

## 5. API surface

All routes prefixed `/api/v1`. All authenticated except where noted.

### Auth
| Method | Path | Notes |
|---|---|---|
| POST | `/auth/otp/request` | Public. Rate limited hard. |
| POST | `/auth/otp/verify` | Public. Returns session. |
| GET | `/auth/me` | Current profile |
| POST | `/auth/logout` | |
| DELETE | `/auth/me` | Real deletion, cascades |

### Briefs
| Method | Path | Notes |
|---|---|---|
| POST | `/briefs` | Create (form or AI-produced) |
| GET | `/briefs` | Caller's own only |
| GET | `/briefs/:id` | Owner or matched professional or admin |
| PATCH | `/briefs/:id` | Owner, while status = draft |
| POST | `/briefs/:id/submit` | draft → submitted |

### AI (Stage 2)
| Method | Path | Notes |
|---|---|---|
| POST | `/ai/brief/converse` | Turn-by-turn. Returns next question or completed draft. |
| POST | `/ai/roadmap` | Single-shot Guided Plan |
| POST | `/ai/explain-match` | Internal use by matching |

### Professionals
| Method | Path | Notes |
|---|---|---|
| POST | `/professionals/apply` | |
| GET | `/professionals/:id` | Public profile. No identity data, ever. |
| PATCH | `/professionals/me` | |
| POST | `/professionals/me/portfolio` | Signed upload URL |
| DELETE | `/professionals/me/portfolio/:itemId` | |

### Matching & engagements
| Method | Path | Notes |
|---|---|---|
| GET | `/matching/candidates?briefId=` | Top 3 + reasons |
| POST | `/engagements` | Propose to a professional |
| POST | `/engagements/:id/accept` | Professional |
| POST | `/engagements/:id/decline` | Professional, reason required |
| POST | `/engagements/:id/deliver` | Professional |
| POST | `/engagements/:id/confirm` | Client. **Writes reputation.** |
| POST | `/engagements/:id/dispute` | Flags for human review |

### Messages
| Method | Path | Notes |
|---|---|---|
| GET | `/engagements/:id/messages` | Participants only |
| POST | `/engagements/:id/messages` | Sets `expires_at` = now + 90d |

### Admin
| Method | Path | Notes |
|---|---|---|
| GET | `/admin/review-queue` | Pending professionals |
| POST | `/admin/professionals/:id/review` | approve / reject / request info |
| GET | `/admin/briefs/unmatched` | **Your Stage 1 workbench** |
| POST | `/admin/briefs/:id/match` | Manual assignment |
| GET | `/admin/metrics` | Repeat rate, completion rate, AI cost |

`/admin/briefs/unmatched` is the most important screen in Stage 1. Build it early and make it good — it's where you'll spend your working hours.

---

## 6. AI module

### 6.1 Structure

```
api/src/ai/
├── index.ts                  public interface, the ONLY import path
├── providers/
│   ├── types.ts              LLMProvider interface
│   ├── gemini.ts
│   ├── openai.ts
│   └── index.ts              selection by env config
├── features/
│   ├── structureBrief.ts
│   ├── clarifyingQuestions.ts
│   ├── generateRoadmap.ts
│   └── explainMatch.ts
├── prompts/
│   ├── structure-brief.md    prompts live as files, not string literals
│   ├── clarifying.md
│   └── roadmap.md
├── schemas.ts                Zod schemas for every model output
└── telemetry.ts              cost + latency logging
```

**Prompts as `.md` files.** They get reviewed as prose, diffed cleanly, and edited without touching code. Load at boot, cache in memory.

### 6.2 Provider interface

```ts
export interface LLMProvider {
  name: string;
  complete<T>(args: {
    prompt: string;
    input: string;
    schema: z.ZodType<T>;   // enforced, not suggested
    maxTokens?: number;
    temperature?: number;
  }): Promise<{ data: T; usage: TokenUsage; latencyMs: number }>;
}
```

Every feature returns validated, typed data or throws. Unvalidated model output never reaches the UI.

**Retry policy:** on schema validation failure, retry once with the validation error appended. On second failure, set `needs_human_review = true` and return gracefully. Never show the user a parse error.

### 6.3 Hard rules

- All AI calls server-side. No provider keys reachable from the browser. Ever.
- Every call logged to `ai_calls` with tokens, cost, latency, feature, and brief id
- Hard cap on conversation turns (5). No unbounded loops.
- Confidence below threshold → `needs_human_review = true` → routes to your admin queue
- Timeout at 20s with a user-visible progress state

### 6.4 The eval harness

Every real brief from Stage 1 concierge becomes a fixture:

```
evals/fixtures/briefs/
├── 001-cafe-logo-my.json          { input, expected: {category, budget...} }
├── 002-clothing-brand-mixed.json
```

`npm run evals` runs all fixtures against the current prompts and reports accuracy per field. **Run before every prompt merge.** No prompt change ships on vibes.

This corpus is a real asset — it's the only Burmese business-brief dataset of its kind, and building it is a reason Stage 1 concierge is worth doing even though it doesn't scale.

---

## 7. Data model

Full DDL in `db/schema.sql`. Structural notes:

**`reputation` is a VIEW, not a table.** Computed from `engagements`. No sync job, no drift, no stale-cache bugs. If it becomes slow, make it materialized. It will not become slow.

**Money is `bigint` kyat.** Never float, never decimal, never a currency column — you're single-currency until cross-border. `packages/shared/src/money.ts` owns all formatting.

**Every status is a CHECK constraint**, mirrored by a Zod enum in `shared`. The database refuses invalid states even if the agent writes a bug.

**`messages.expires_at` defaults to `now() + interval '90 days'`.** Retention is a database default, not application logic someone can forget.

**No `identity_documents` table. No `nrc` column. No `selfie_url`.** Structurally absent.

---

## 8. Myanmar-specific engineering

These are the things that will bite you and that a generic architecture won't mention.

### 8.1 Zawgyi/Unicode — day one, blocking

Myanmar spent years split between two incompatible encodings of the same script. Unicode migration is largely done, but legacy content and older devices persist. Zawgyi text parsed as Unicode is garbage, and vice versa.

`packages/burmese` handles this in one place:

```ts
detectEncoding(text): 'zawgyi' | 'unicode' | 'unknown'
normalizeToUnicode(text): string
```

**Rule:** every text input is normalized at the API boundary before it touches the database. Storage is Unicode only.

Google's `myanmar-tools` provides a trained Zawgyi detector, and conversion libraries exist in the npm ecosystem. **Verify current maintenance status before depending on them** — some Myanmar-script tooling has gone quiet. If nothing viable is maintained, budget real time here; it is not optional.

**Test with real samples from real devices.** Synthetic test data will pass and production will fail.

### 8.2 Burmese text rendering

- Myanmar script needs greater line-height than Latin — stacked diacritics clip at default values. Set `line-height: 1.8` minimum for Burmese content.
- **No whitespace word boundaries.** Any truncation, search, or wrap logic assuming spaces will break. Use CSS `overflow-wrap: anywhere` and never hand-roll word splitting.
- Bundle a Myanmar Unicode webfont (Noto Sans Myanmar or Padauk). Do not rely on device fonts — coverage is inconsistent. **Subset it**; the full font is heavy and you have a bundle budget.
- Test at small sizes on a cheap Android device.

### 8.3 Phone OTP delivery

Supabase Auth supports phone, but needs an SMS provider. International providers (Twilio, MessageBird) to Myanmar numbers can be expensive, slow, or unreliable.

**Investigate a local SMS aggregator before building the auth flow.** If delivery is unreliable, this blocks every user at the front door, and no amount of good architecture recovers from that. Fall back to a Viber-based verification path if SMS proves unworkable.

Treat this as an assumption to test, not a solved problem.

### 8.4 Retention enforcement

```sql
select cron.schedule(
  'delete-expired-messages',
  '0 3 * * *',
  $$ delete from messages where expires_at < now() $$
);
```

Hard delete, not soft. A `deleted_at` column would defeat the entire purpose.

### 8.5 Network hostility

- **Bundle budget: 200KB gzipped** for first paint. Enforce in CI — fail the build on regression.
- Cache the professional list aggressively; make it readable offline.
- Briefs draft to localStorage and sync on reconnect. A user losing a half-written brief to a dropped connection does not come back.
- Every fetch has a timeout and a visible retry.
- No third-party analytics that transmit user content. Self-host or omit.

### 8.6 Legal posture in code

- `db/DATA_MAP.md`: every table, what it holds, why, retention period. Maintain it.
- Any PR adding a column to a user-facing table updates the data map. Put it in the PR template.
- Assume anything retained may be compelled. That's a design input, not a disclaimer.

---

## 9. Build order

Vertical slices. Each ships end to end — schema, API, UI, test — before the next begins. Never build "all the models" then "all the routes."

**Slice 0 — Skeleton (week 1)**
Workspaces, shared package with one schema, Express with health check, Vite app, DB connection, one migration, CI. Ends with: form submits to API, writes a row, renders it back.

**Slice 1 — Auth (week 2)**
Phone OTP end to end. **Validate SMS delivery to real Myanmar numbers first.**

**Slice 2 — Burmese package (week 2)**
Detection and normalization, tested against real fixtures. Before any user text is stored.

**Slice 3 — Briefs, manual (week 3)**
Guided form → `Brief` → list view. No AI.

**Slice 4 — Professionals + review (week 4)**
Application, portfolio upload to private bucket, admin review queue.

**Slice 5 — Admin matching console (week 5)**
Unmatched briefs, professional search, manual assignment. **This is Stage 1 launch.** You now have a working concierge business.

**Slice 6 — Engagements + messaging (week 6)**
Status machine, threaded messages, retention job.

→ **Run concierge for 8 weeks. Collect briefs. Charge money.**

**Slice 7 — AI brief builder (Stage 2)**
Against your real fixture corpus, behind the interface Slice 3 already defined.

**Slice 8 — Tag matching**
**Slice 9 — Guided Plan**
**Slice 10 — Reputation view**

Slices 7-10 only after concierge proves demand.

---

## 10. Environment

```
# api
DATABASE_URL=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=        # server only, never in web
AI_PROVIDER=gemini|openai
GEMINI_API_KEY=
OPENAI_API_KEY=
MESSAGE_RETENTION_DAYS=90
AI_MAX_TURNS=5

# web  (VITE_ prefix = PUBLIC. Nothing secret.)
VITE_API_URL=
```

**If a key would ever be prefixed `VITE_`, it does not belong in this project.**

---

## 11. Definition of done

A slice isn't done until:

- [ ] Zod schema in `packages/shared`, used by both API and web
- [ ] Migration file added, `schema.sql` updated to match
- [ ] Input validated at the API boundary
- [ ] Burmese text normalized before storage
- [ ] Errors return structured JSON, never a stack trace
- [ ] Tested on a throttled 3G profile
- [ ] Renders correctly in Burmese, including long strings
- [ ] No new user-data column without a `DATA_MAP.md` entry
- [ ] Tests pass, `tsc --noEmit` clean

---

## 12. Where this will go wrong

Honest list, so you recognise it early.

**Cursor will over-build.** Ask for a brief form, get a state machine with optimistic updates and a plugin system. Reject it. Small, boring, reviewable diffs.

**Cursor will drift on conventions** as context fills. Symptom: a route file containing SQL. Fix: point it at AGENTS.md and this document, then restart the session.

**Zawgyi will be worse than expected.** Budget real time. It's the kind of problem that's invisible until it's everything.

**SMS delivery may not work.** Test in week 1, not week 8.

**You will be tempted to skip concierge and build the AI.** The AI is the fun part. It's also the part with no moat, and building it before you have real briefs means building it against imagined inputs. Resist this.

**You will want to add categories.** One vertical, deep. Liquidity is local to a category.
