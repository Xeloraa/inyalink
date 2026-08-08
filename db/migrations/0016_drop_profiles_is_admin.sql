-- 0016_drop_profiles_is_admin.sql
-- Admin access is profiles.role = 'admin' only — drop the duplicate flag.

drop index if exists profiles_is_admin_idx;

alter table profiles
  drop column if exists is_admin;
