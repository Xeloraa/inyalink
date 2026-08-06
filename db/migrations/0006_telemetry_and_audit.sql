-- 0006_telemetry_and_audit.sql
-- Cost and quality telemetry. Burmese tokenises poorly; watch this from day one.

create table ai_calls (
  id           uuid primary key default gen_random_uuid(),
  feature      text not null,      -- structure_brief | roadmap | explain_match
  provider     text not null,
  model        text not null,
  brief_id     uuid references briefs(id) on delete set null,
  tokens_in    int,
  tokens_out   int,
  cost_usd     numeric(10,6),
  latency_ms   int,
  succeeded    boolean not null,
  error_kind   text,
  created_at   timestamptz not null default now()
);

create index on ai_calls (created_at desc);
create index on ai_calls (feature, succeeded);

create table audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references profiles(id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index on audit_log (entity_type, entity_id, created_at desc);
create index on audit_log (actor_id, created_at desc);
