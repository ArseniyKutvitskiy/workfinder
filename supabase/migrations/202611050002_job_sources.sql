-- Run once in Supabase SQL Editor. Existing bookmarks and letters are preserved.
begin;
alter table public.jobs drop constraint if exists jobs_id_check;
alter table public.jobs add constraint jobs_id_check
  check (id ~ '^(hh-[0-9]{1,16}|arbeitnow-[a-f0-9]{32}|jooble-[a-f0-9]{32})$');
commit;
