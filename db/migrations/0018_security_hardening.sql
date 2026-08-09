-- 0018_security_hardening.sql
-- Supabase advisor fixes: RLS on internal tables, security_invoker view,
-- and defensive re-assert of retention cron jobs when pg_cron is present.
-- API uses the service role (bypasses RLS); policies are defence in depth.

-- ---------------------------------------------------------------- RLS
-- No policies on audit_log / ai_calls / schema_migrations → deny for
-- anon/authenticated. Service role bypasses RLS.

alter table audit_log enable row level security;
alter table ai_calls  enable row level security;

create table if not exists schema_migrations (
  filename   text primary key,
  applied_at timestamptz not null default now()
);

alter table schema_migrations enable row level security;

alter table categories enable row level security;

create policy categories_active_public on categories
  for select using (is_active = true);

-- ---------------------------------------------------------------- views
-- Default view behaviour is security-definer-like and can bypass RLS on
-- underlying tables. Force invoker so policies apply to the caller.

alter view professional_reputation set (security_invoker = true);

-- ---------------------------------------------------------------- cron
-- pg_cron is available on Supabase free tier when the extension is enabled.
-- Free-tier projects pause after inactivity, so cron may not fire while
-- paused — the API also runs an application-level retention fallback.
-- Re-assert jobs only when the extension is installed (local/dev may lack it).

do $guard$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if not exists (
      select 1 from cron.job where jobname = 'delete-expired-messages'
    ) then
      perform cron.schedule(
        'delete-expired-messages',
        '0 3 * * *',
        $cron$ delete from messages where expires_at < now() $cron$
      );
    end if;

    if not exists (
      select 1 from cron.job where jobname = 'delete-expired-ai-conversations'
    ) then
      perform cron.schedule(
        'delete-expired-ai-conversations',
        '15 3 * * *',
        $cron$ delete from ai_conversations where expires_at < now() $cron$
      );
    end if;
  else
    raise notice
      'pg_cron not installed — retention relies on API retention fallback';
  end if;
exception
  when undefined_table then
    raise notice
      'cron.job unavailable — retention relies on API retention fallback';
  when insufficient_privilege then
    raise notice
      'pg_cron privilege missing — retention relies on API retention fallback';
end
$guard$;
