-- 0012_work_links.sql
-- Verified outbound profile links. Link-out only — never scrape or import.

do $$ begin
  create type work_link_platform as enum (
    'github',
    'behance',
    'dribbble',
    'website',
    'instagram',
    'facebook',
    'linkedin',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists work_links (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references professionals(user_id) on delete cascade,
  platform        work_link_platform not null,
  url             text not null check (length(url) between 8 and 500),
  label           text check (label is null or length(label) between 1 and 80),
  sort            int not null default 0,
  verified_at     timestamptz not null,
  created_at      timestamptz not null default now()
);

create index if not exists work_links_pro_sort_idx
  on work_links (professional_id, sort, created_at);

-- One row per named platform; multiple generic "other" links allowed.
create unique index if not exists work_links_one_named_platform_idx
  on work_links (professional_id, platform)
  where platform <> 'other';

alter table work_links enable row level security;

drop policy if exists work_links_of_approved on work_links;
create policy work_links_of_approved on work_links
  for select using (exists (
    select 1 from professionals p
    where p.user_id = work_links.professional_id
      and p.status = 'approved'
  ));

drop policy if exists own_work_links on work_links;
create policy own_work_links on work_links
  for all using (professional_id = auth.uid());
