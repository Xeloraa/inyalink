-- 0005_engagements_and_messages.sql
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
