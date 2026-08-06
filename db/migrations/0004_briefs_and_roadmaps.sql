-- 0004_briefs_and_roadmaps.sql

create table roadmaps (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  goal_text  text not null,
  language   text_language,
  steps      jsonb not null default '[]',   -- [{order, title, why, category_slug, est_min_mmk, est_max_mmk}]
  created_at timestamptz not null default now()
);

create index on roadmaps (user_id, created_at desc);

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
