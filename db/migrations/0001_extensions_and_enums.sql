-- 0001_extensions_and_enums.sql

create extension if not exists pg_cron;

create type user_role       as enum ('client', 'professional', 'admin');
create type locale_code     as enum ('my', 'en');
create type text_language   as enum ('my', 'en', 'mixed');
create type pro_status      as enum ('pending', 'approved', 'rejected', 'paused');
create type brief_status    as enum ('draft', 'submitted', 'matched', 'closed', 'cancelled');
create type brief_source    as enum ('form', 'ai_chat', 'roadmap');
create type engagement_status as enum (
  'proposed', 'accepted', 'declined', 'in_progress',
  'delivered', 'confirmed', 'disputed', 'cancelled'
);
