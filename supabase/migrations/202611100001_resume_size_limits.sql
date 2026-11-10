-- WorkFinder: cap the size of a stored resume and chat.
-- Signed-in users can write their own row directly through the Supabase API,
-- bypassing the server validation; these limits stop storage abuse.
-- Run once in the Supabase SQL Editor. Existing rows are far below the limits.
begin;
alter table public.resumes drop constraint if exists resumes_profile_size;
alter table public.resumes add constraint resumes_profile_size
  check (pg_column_size(profile) <= 131072);
alter table public.resumes drop constraint if exists resumes_messages_size;
alter table public.resumes add constraint resumes_messages_size
  check (pg_column_size(messages) <= 262144);
alter table public.profiles drop constraint if exists profiles_name_size;
alter table public.profiles add constraint profiles_name_size
  check (length(display_name) <= 300);
commit;
