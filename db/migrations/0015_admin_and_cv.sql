-- 0015_admin_and_cv.sql
-- Optional CV URL on professional applications (external link only).
-- Never identity-document storage. Admin gate is profiles.role = 'admin'.

alter table professionals
  add column if not exists cv_url text
    check (cv_url is null or length(cv_url) between 8 and 500);
