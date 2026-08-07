-- 0013_ai_conversation_path_plan.sql
-- Allow persisting guided-plan (roadmap) sessions in the floating chat panel.

alter table ai_conversations
  drop constraint if exists ai_conversations_path_check;

alter table ai_conversations
  add constraint ai_conversations_path_check
  check (path is null or path in ('quick', 'plan', 'clarify', 'unrelated'));
