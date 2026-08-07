# Data map

Every table and view that holds (or derives) user-adjacent data. Update this
file in the same PR that adds or changes a column on a user-facing table.

**Governing rule:** no national identity documents, ID numbers, selfies, or
biometrics — not as a column, not as a table. See `schema.sql` design note.

Retention assumes Myanmar's Cybersecurity Law disclosure posture: anything
kept may be compelled. Prefer short retention and hard delete.

| Object | Kind | What it holds | Why | Retention |
|---|---|---|---|---|
| `profiles` | table | App profile linked 1:1 to `auth.users`: role, display name, locale. **No phone** (lives in Auth only). | Public-facing identity for clients and professionals without duplicating auth PII. | Until account deletion (`on delete cascade` from `auth.users`). |
| `categories` | table | Vertical taxonomy: slug, Burmese/English names, sort, active flag. | Scope liquidity to one vertical at a time. Not personal data. | Indefinite (reference data). Soft-deactivate via `is_active`. |
| `professionals` | table | Professional application/profile: category, bilingual headline/bio, skills, review status/notes, turnaround, min budget (kyat `bigint`), accepting flag, `partner_tier` (fallback / urgent pool). | Vetting and matching. Review fields support admin queue. Partner tier is ops designation, not paid boost. | Until profile/account deletion. Rejected applications remain until account delete unless admin purges. |
| `brief_interests` | table | One-tap free interest: `(brief_id, professional_id)`, timestamp. | Open-pool matching. Cap of 10 active interests enforced in app. No boost/payment columns. | Until brief or pro deleted (cascade). |
| `brief_match_candidates` | table | Surfaced top-3 only: rank, score, score_breakdown, rank_reason, guaranteed_response flag, optional AI explanation. | Client-facing matches; debugging on stage; never stores the full interested pool. | Until brief deleted (cascade). |
| `portfolio_items` | table | Portfolio references: private `storage_path` and/or `external_url`, caption, sort. | Evidence of craft for review and client trust. Files live in private Storage; DB stores paths only. | Until professional row deleted (cascade) or item removed. Storage objects must be deleted with the row. |
| `roadmaps` | table | Guided Plan output: goal text, language, JSON steps (incl. budget estimates). | Stage 2 AI / planning artifact; may link to a brief. | Until user account deletion (cascade). Revisit if plans accumulate without product need. |
| `briefs` | table | Central work request: status, source, raw input, structured fields, budget, deadline, AI flags, plus interest window (`interest_opens_at`/`closes_at`), `matching_mode`, `urgent`, `fallback_used`, `ranked_at`. | Concierge + AI produce the same object; interest-then-rank hang off this. | Until client account deletion (cascade). Closed/cancelled briefs retained for ops history until then. |
| `engagements` | table | Match/transaction record: brief ↔ professional, status machine, amount, match/decline reasons, timestamps. | Reputation and completion metrics derive only from here. | Until brief deletion (cascade) or explicit purge policy later. Prefer retain through dispute window. |
| `messages` | table | Engagement thread body + sender. `expires_at` defaults to now + 90 days. | Coordination between client and professional. | **90 days** via column default + `pg_cron` hard delete (`delete-expired-messages`). Never soft-delete. |
| `ai_conversations` | table | Signed-in floating-chat session: title (from opening message), path, brief_draft JSON, complete flag. `expires_at` defaults to now + 90 days. | Resume hire conversations; holds business plans/budgets. | **90 days** via column default + `pg_cron` hard delete (`delete-expired-ai-conversations`). Never soft-delete. Anonymous chat stays in browser sessionStorage only — never uploaded on sign-in. |
| `ai_conversation_messages` | table | Ordered user/assistant turns for an `ai_conversations` row. | Transcript for resume. | Cascades with parent conversation (same 90-day hard delete). |
| `professional_reputation` | view | Aggregates from engagements: completed/declined counts, unique clients, completion rate, median response minutes. | Computed reputation; no stored scores to drift. | N/A (derived). Do not surface publicly until ≥50 platform-wide confirmed engagements. |
| `ai_calls` | table | Telemetry per model call: feature, provider, model, optional brief id, tokens, cost, latency, success/error. | Cost control and quality; Burmese tokenization needs monitoring. | Operational. Propose 180-day hard delete once volume justifies a job; until then retain for cost audit. No message/body content. |
| `audit_log` | table | Actor, action, entity type/id, JSON metadata. | Admin/accountability trail for reviews, matches, deletions. | Operational/compliance. Propose 2-year hard delete; metadata must not store identity documents or message bodies. |
| `schema_migrations` | table | Applied migration filenames + timestamps. | Migration runner bookkeeping (API). | Indefinite. Not user data. |

## Intentionally absent

- Identity documents, NRC, passport, Smart Card, selfie, biometrics
- Phone numbers in app tables (Auth only)
- Soft-delete columns on `messages` or `ai_conversations` (`deleted_at`)
- Star ratings stored as mutable rows (reputation is a view)

## Storage

Portfolio binaries live in **private** Supabase Storage. The database stores
`storage_path` only. Signed URLs are short-lived and not persisted.
