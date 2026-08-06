-- 0002_profiles_and_categories.sql
-- Extends Supabase auth.users. Phone lives in auth.users only — not duplicated.

create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         user_role   not null default 'client',
  display_name text        not null check (length(display_name) between 1 and 80),
  locale       locale_code not null default 'my',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Seed ONE category at launch. Liquidity is local to a vertical.

create table categories (
  id        uuid primary key default gen_random_uuid(),
  slug      text unique not null,
  name_my   text not null,
  name_en   text not null,
  sort      int  not null default 0,
  is_active boolean not null default true
);
