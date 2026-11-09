-- WorkFinder: allow job IDs from all aggregated sources.
-- Run once in the Supabase SQL Editor (or `supabase db push`). Existing jobs,
-- bookmarks and letters are preserved; the format "<source>-<32 hex>" is the
-- one produced by server/services/providers.ts.
begin;
alter table public.jobs drop constraint if exists jobs_id_check;
alter table public.jobs add constraint jobs_id_check
  check (id ~ '^(hh-[0-9]{1,16}|[a-z]{3,12}-[a-f0-9]{32})$');
commit;
