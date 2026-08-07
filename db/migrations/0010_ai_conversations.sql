-- 0010_ai_conversations.sql
-- Floating-chat transcripts for signed-in users. 90-day hard delete.
-- Never soft-delete. Never reuse engagement `messages`.

create table ai_conversations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  title        text not null check (length(title) between 1 and 120),
  path         text check (path is null or path in ('quick', 'clarify', 'unrelated')),
  brief_draft  jsonb not null default '{}'::jsonb,
  complete     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '90 days')
);

create index on ai_conversations (user_id, updated_at desc);
create index on ai_conversations (expires_at);

create table ai_conversation_messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references ai_conversations(id) on delete cascade,
  role             text not null check (role in ('user', 'assistant')),
  content          text not null check (length(content) between 1 and 4000),
  sort_order       int not null check (sort_order >= 0),
  created_at       timestamptz not null default now(),
  unique (conversation_id, sort_order)
);

create index on ai_conversation_messages (conversation_id, sort_order);

create trigger t_ai_conversations before update on ai_conversations
  for each row execute function touch_updated_at();

alter table ai_conversations enable row level security;
alter table ai_conversation_messages enable row level security;

create policy own_ai_conversations on ai_conversations
  for all using (user_id = auth.uid());

create policy own_ai_conversation_messages on ai_conversation_messages
  for all using (exists (
    select 1 from ai_conversations c
    where c.id = ai_conversation_messages.conversation_id
      and c.user_id = auth.uid()
  ));

select cron.schedule(
  'delete-expired-ai-conversations',
  '15 3 * * *',
  $$ delete from ai_conversations where expires_at < now() $$
);
