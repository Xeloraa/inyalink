-- 0015_admin_and_cv.sql
-- Admin console gate + optional CV URL on professional applications.
-- cv_url is an external link only — never identity-document storage.

alter table profiles
  add column if not exists is_admin boolean not null default false;

alter table professionals
  add column if not exists cv_url text
    check (cv_url is null or length(cv_url) between 8 and 500);

create index if not exists profiles_is_admin_idx
  on profiles (id)
  where is_admin = true;
