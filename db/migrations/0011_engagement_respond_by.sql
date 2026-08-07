-- 0011_engagement_respond_by.sql
-- 24h accept/decline window for proposed engagements.

alter table engagements
  add column if not exists respond_by timestamptz;

create index if not exists engagements_respond_by_proposed_idx
  on engagements (respond_by)
  where status = 'proposed';

comment on column engagements.respond_by is
  'Deadline for professional to accept or decline a proposed engagement.';
