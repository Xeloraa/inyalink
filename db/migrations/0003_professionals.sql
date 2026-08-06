-- 0003_professionals.sql

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
