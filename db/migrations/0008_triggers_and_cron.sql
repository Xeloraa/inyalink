-- 0008_triggers_and_cron.sql

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

select cron.schedule(
  'delete-expired-messages',
  '0 3 * * *',
  $$ delete from messages where expires_at < now() $$
);
