-- InyaLink — canonical schema
-- Postgres 15+ / Supabase
--
-- DESIGN NOTE: there is deliberately no table or column for national identity
-- documents, ID numbers, selfies, or biometrics. Under Myanmar's Cybersecurity
-- Law (Arts. 33-34), retained personal data and activity logs may be subject to
-- mandatory disclosure. Linking verified identity to work history would create
-- serious risk for users. Do not add such columns.

create extension if not exists pg_cron;

-- ---------------------------------------------------------------- enums

create type user_role       as enum ('client', 'professional', 'admin');
create type locale_code     as enum ('my', 'en');
create type text_language   as enum ('my', 'en', 'mixed');
create type pro_status      as enum ('pending', 'approved', 'rejected', 'paused');
create type brief_status    as enum ('draft', 'submitted', 'matched', 'closed', 'cancelled');
create type brief_source    as enum ('form', 'ai_chat', 'roadmap');
create type engagement_status as enum (
  'proposed', 'accepted', 'declined', 'in_progress',
  'delivered', 'confirmed', 'disputed', 'cancelled'
);

-- ---------------------------------------------------------------- profiles
-- Extends Supabase auth.users. Phone lives in auth.users only — not duplicated.

create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         user_role   not null default 'client',
  display_name text        not null check (length(display_name) between 1 and 80),
  locale       locale_code not null default 'my',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------- categories
-- Seed ONE category at launch. Liquidity is local to a vertical.

create table categories (
  id        uuid primary key default gen_random_uuid(),
  slug      text unique not null,
  name_my   text not null,
  name_en   text not null,
  sort      int  not null default 0,
  is_active boolean not null default true
);

-- ---------------------------------------------------------------- professionals

create table professionals (
  user_id               uuid primary key references profiles(id) on delete cascade,
  category_id           uuid not null references categories(id),
  headline_my           text check (length(headline_my) <= 120),
  headline_en           text check (length(headline_en) <= 120),
  bio_my                text check (length(bio_my) <= 2000),
  bio_en                text check (length(bio_en) <= 2000),
  skills                text[] not null default '{}',
  status                pro_status not null default 'pending',
  review_note           text,
  reviewed_by           uuid references profiles(id),
  reviewed_at           timestamptz,
  typical_turnaround_days int check (typical_turnaround_days between 1 and 365),
  min_budget_mmk        bigint check (min_budget_mmk >= 0),
  accepting_work        boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index on professionals (category_id, status, accepting_work);
create index on professionals using gin (skills);

create table portfolio_items (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references professionals(user_id) on delete cascade,
  storage_path    text,          -- private bucket; served via short-lived signed URL
  external_url    text,          -- Behance, GitHub, live site
  caption         text check (length(caption) <= 300),
  sort            int not null default 0,
  created_at      timestamptz not null default now(),
  check (storage_path is not null or external_url is not null)
);

create index on portfolio_items (professional_id, sort);

-- ---------------------------------------------------------------- roadmaps

create table roadmaps (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  goal_text  text not null,
  language   text_language,
  steps      jsonb not null default '[]',   -- [{order, title, why, category_slug, est_min_mmk, est_max_mmk}]
  created_at timestamptz not null default now()
);

create index on roadmaps (user_id, created_at desc);

-- ---------------------------------------------------------------- briefs
-- The central object. Produced identically by the Stage 1 form and the
-- Stage 2 AI chat — `source` records which.

create table briefs (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid not null references profiles(id) on delete cascade,
  status             brief_status not null default 'draft',
  source             brief_source not null default 'form',
  raw_input          text,                   -- what the user actually typed
  language           text_language,
  category_id        uuid references categories(id),
  title              text check (length(title) <= 140),
  description        text check (length(description) <= 4000),
  requirements       jsonb not null default '[]',
  budget_min_mmk     bigint check (budget_min_mmk >= 0),
  budget_max_mmk     bigint check (budget_max_mmk >= 0),
  deadline           date,
  reference_links    text[] not null default '{}',
  ai_confidence      numeric(3,2) check (ai_confidence between 0 and 1),
  needs_human_review boolean not null default false,
  roadmap_id         uuid references roadmaps(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (budget_max_mmk is null or budget_min_mmk is null
         or budget_max_mmk >= budget_min_mmk)
);

create index on briefs (client_id, created_at desc);
create index on briefs (status, category_id) where status = 'submitted';
create index on briefs (needs_human_review) where needs_human_review;

-- ---------------------------------------------------------------- engagements
-- The transaction record. This is the moat: reputation derives from here,
-- never from self-reported claims.

create table engagements (
  id              uuid primary key default gen_random_uuid(),
  brief_id        uuid not null references briefs(id) on delete cascade,
  professional_id uuid not null references professionals(user_id),
  status          engagement_status not null default 'proposed',
  amount_mmk      bigint check (amount_mmk >= 0),
  match_reason    text,
  matched_by      uuid references profiles(id),   -- null = automated match
  decline_reason  text,
  proposed_at     timestamptz not null default now(),
  respond_by      timestamptz,
  accepted_at     timestamptz,
  delivered_at    timestamptz,
  confirmed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (brief_id, professional_id)
);

create index on engagements (professional_id, status);
create index on engagements (brief_id);
create index on engagements (status) where status in ('proposed', 'disputed');

-- ---------------------------------------------------------------- messages
-- 90-day retention is a DATABASE DEFAULT, not application logic.
-- Hard delete only. Never add deleted_at.

create table messages (
  id            uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements(id) on delete cascade,
  sender_id     uuid not null references profiles(id) on delete cascade,
  body          text not null check (length(body) between 1 and 4000),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '90 days')
);

create index on messages (engagement_id, created_at);
create index on messages (expires_at);

select cron.schedule(
  'delete-expired-messages',
  '0 3 * * *',
  $$ delete from messages where expires_at < now() $$
);

-- ---------------------------------------------------------------- reputation
-- A VIEW, not a table. No sync job, no drift, no stale cache.
-- Make it materialized only if it measurably slows down. It won't.

create view professional_reputation as
select
  p.user_id as professional_id,
  count(*) filter (where e.status = 'confirmed')            as completed_count,
  count(*) filter (where e.status = 'declined')             as declined_count,
  count(distinct b.client_id) filter (where e.status = 'confirmed') as unique_clients,
  round(
    100.0 * count(*) filter (where e.status = 'confirmed')
    / nullif(count(*) filter (where e.status in ('accepted','in_progress','delivered','confirmed','disputed')), 0)
  , 0)                                                       as completion_rate_pct,
  percentile_cont(0.5) within group (
    order by extract(epoch from (e.accepted_at - e.proposed_at)) / 60
  ) filter (where e.accepted_at is not null)                 as median_response_mins
from professionals p
left join engagements e on e.professional_id = p.user_id
left join briefs b      on b.id = e.brief_id
group by p.user_id;

-- NOTE: do not surface ratings publicly until >= 50 completed engagements
-- exist platform-wide. Thin-volume ratings are noise, and an unlucky early
-- one-star is unrecoverable for a professional who did nothing wrong.

-- ---------------------------------------------------------------- ai_calls
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

-- ---------------------------------------------------------------- audit_log

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

-- ---------------------------------------------------------------- RLS
-- Defence in depth. The API uses the service role and enforces authorization
-- in the service layer; these policies are the backstop if that is bypassed.

alter table profiles        enable row level security;
alter table professionals   enable row level security;
alter table portfolio_items enable row level security;
alter table briefs          enable row level security;
alter table roadmaps        enable row level security;
alter table engagements     enable row level security;
alter table messages        enable row level security;

create policy own_profile on profiles
  for all using (id = auth.uid());

create policy approved_pros_public on professionals
  for select using (status = 'approved');

create policy own_pro_row on professionals
  for all using (user_id = auth.uid());

create policy portfolio_of_approved on portfolio_items
  for select using (exists (
    select 1 from professionals p
    where p.user_id = portfolio_items.professional_id
      and p.status = 'approved'
  ));

create policy own_briefs on briefs
  for all using (client_id = auth.uid());

create policy matched_pro_reads_brief on briefs
  for select using (exists (
    select 1 from engagements e
    where e.brief_id = briefs.id and e.professional_id = auth.uid()
  ));

create policy own_roadmaps on roadmaps
  for all using (user_id = auth.uid());

create policy engagement_participants on engagements
  for select using (
    professional_id = auth.uid()
    or exists (select 1 from briefs b
               where b.id = engagements.brief_id and b.client_id = auth.uid())
  );

create policy message_participants on messages
  for all using (exists (
    select 1 from engagements e
    left join briefs b on b.id = e.brief_id
    where e.id = messages.engagement_id
      and (e.professional_id = auth.uid() or b.client_id = auth.uid())
  ));

-- ---------------------------------------------------------------- updated_at

create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger t_profiles      before update on profiles
  for each row execute function touch_updated_at();
create trigger t_professionals before update on professionals
  for each row execute function touch_updated_at();
create trigger t_briefs        before update on briefs
  for each row execute function touch_updated_at();
create trigger t_engagements   before update on engagements
  for each row execute function touch_updated_at();
