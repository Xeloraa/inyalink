-- 0007_rls.sql
-- Defence in depth. The API uses the service role and enforces authorization
-- in the service layer; these policies are the backstop if that is bypassed.

alter table profiles        enable row level security;
alter table professionals   enable row level security;
alter table portfolio_items enable row level security;
alter table briefs          enable row level security;
alter table roadmaps        enable row level security;
alter table engagements     enable row level security;
alter table messages        enable row level security;

create policy own_profile on profiles
  for all using (id = auth.uid());

create policy approved_pros_public on professionals
  for select using (status = 'approved');

create policy own_pro_row on professionals
  for all using (user_id = auth.uid());

create policy portfolio_of_approved on portfolio_items
  for select using (exists (
    select 1 from professionals p
    where p.user_id = portfolio_items.professional_id
      and p.status = 'approved'
  ));

create policy own_briefs on briefs
  for all using (client_id = auth.uid());

create policy matched_pro_reads_brief on briefs
  for select using (exists (
    select 1 from engagements e
    where e.brief_id = briefs.id and e.professional_id = auth.uid()
  ));

create policy own_roadmaps on roadmaps
  for all using (user_id = auth.uid());

create policy engagement_participants on engagements
  for select using (
    professional_id = auth.uid()
    or exists (select 1 from briefs b
               where b.id = engagements.brief_id and b.client_id = auth.uid())
  );

create policy message_participants on messages
  for all using (exists (
    select 1 from engagements e
    left join briefs b on b.id = e.brief_id
    where e.id = messages.engagement_id
      and (e.professional_id = auth.uid() or b.client_id = auth.uid())
  ));
