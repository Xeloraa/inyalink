-- 0009_interest_matching.sql
-- Interest-then-rank: open pool, free one-tap interest, partner-tier fallback.

alter table professionals
  add column if not exists partner_tier boolean not null default false;

comment on column professionals.partner_tier is
  'Partner-tier pros fill undersubscribed briefs and handle urgent briefs. Badge: guaranteed response. Never a paid boost.';

alter table briefs
  add column if not exists urgent boolean not null default false,
  add column if not exists interest_opens_at timestamptz,
  add column if not exists interest_closes_at timestamptz,
  add column if not exists matching_mode text
    check (matching_mode is null or matching_mode in ('open_pool', 'partner_direct')),
  add column if not exists fallback_used boolean not null default false,
  add column if not exists ranked_at timestamptz;

comment on column briefs.matching_mode is
  'open_pool = category feed; partner_direct = skip feed (urgent).';
comment on column briefs.fallback_used is
  'True when partner-tier pros filled slots because fewer than 3 interests.';

create index if not exists briefs_open_feed_idx
  on briefs (category_id, interest_closes_at)
  where status = 'submitted' and matching_mode = 'open_pool';

-- Free one-tap interest. No boost, no payment, no visibility currency.
create table brief_interests (
  brief_id        uuid not null references briefs(id) on delete cascade,
  professional_id uuid not null references professionals(user_id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (brief_id, professional_id)
);

create index brief_interests_pro_created_idx
  on brief_interests (professional_id, created_at desc);

-- Surfaced top-3 only. Full interested pool is never exposed to the client.
create table brief_match_candidates (
  brief_id            uuid not null references briefs(id) on delete cascade,
  professional_id     uuid not null references professionals(user_id) on delete cascade,
  rank                smallint not null check (rank between 1 and 3),
  score               numeric(6,4) not null check (score between 0 and 1),
  score_breakdown     jsonb not null,
  rank_reason         text not null check (length(rank_reason) <= 400),
  guaranteed_response boolean not null default false,
  from_interest       boolean not null default true,
  explanation         text check (explanation is null or length(explanation) <= 500),
  created_at          timestamptz not null default now(),
  primary key (brief_id, professional_id),
  unique (brief_id, rank)
);

create index brief_match_candidates_brief_rank_idx
  on brief_match_candidates (brief_id, rank);
