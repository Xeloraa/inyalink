-- 0017_notifications.sql
-- In-app notifications for match, engagement, and application events.
-- Titles/bodies are i18n on the client; DB stores type + href + optional meta.

create type notification_type as enum (
  'match_top3',
  'engagement_proposed',
  'engagement_accepted',
  'engagement_declined',
  'application_approved',
  'application_rejected'
);

create table notifications (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(id) on delete cascade,
  type           notification_type not null,
  href           text not null check (length(href) between 1 and 500),
  brief_id       uuid references briefs(id) on delete set null,
  engagement_id  uuid references engagements(id) on delete set null,
  meta           jsonb not null default '{}'::jsonb,
  read_at        timestamptz,
  created_at     timestamptz not null default now()
);

create index notifications_user_created_idx
  on notifications (user_id, created_at desc);

create index notifications_user_unread_idx
  on notifications (user_id)
  where read_at is null;

alter table notifications enable row level security;

create policy own_notifications on notifications
  for all using (user_id = auth.uid());
