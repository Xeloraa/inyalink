-- 0019_interest_matching_rls.sql
-- 0009_interest_matching.sql created brief_interests and
-- brief_match_candidates three days before 0018's hardening pass, which
-- swept audit_log/ai_calls/categories/schema_migrations but missed these
-- two — both had zero RLS and zero policies, readable in full by the
-- public anon key. Flagged by Supabase's advisor.
-- API uses the service role (bypasses RLS); policies are defence in depth.

alter table brief_interests        enable row level security;
alter table brief_match_candidates enable row level security;

-- Full interested pool is never exposed to the client (see 0009's own
-- comment on brief_match_candidates) — only the professional who expressed
-- interest can read their own row. No client-side policy on this table.
create policy own_interest on brief_interests
  for all using (professional_id = auth.uid());

-- Surfaced top-3 only. A professional sees their own candidate row; the
-- brief's client sees the candidates ranked for their brief. Read-only —
-- this table is algorithm-generated, never a direct user write.
create policy match_candidate_participants on brief_match_candidates
  for select using (
    professional_id = auth.uid()
    or exists (
      select 1 from briefs b
      where b.id = brief_match_candidates.brief_id and b.client_id = auth.uid()
    )
  );
