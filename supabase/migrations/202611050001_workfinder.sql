-- Run once through `supabase db push` or the Supabase SQL editor.
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);
create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  profile jsonb not null default '{"name":"","contact":"","education":"","skills":"","projects":"","goals":""}',
  messages jsonb not null default '[]',
  version integer not null default 0 check (version >= 0),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(profile) = 'object'),
  check (jsonb_typeof(messages) = 'array' and jsonb_array_length(messages) <= 60)
);
create table public.jobs (
  id text primary key check (id ~ '^hh-[0-9]+$'),
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table public.saved_jobs (
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id text not null references public.jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, job_id)
);
create table public.cover_letters (
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id text not null references public.jobs(id) on delete cascade,
  language text not null check (language in ('en','ru')),
  letter text not null check (length(letter) <= 15000),
  updated_at timestamptz not null default now(),
  primary key(user_id, job_id, language)
);
create table public.job_cache (
  key text primary key, payload jsonb not null, expires_at timestamptz not null
);
create table public.rate_buckets (
  key text primary key, hits integer not null, expires_at timestamptz not null
);
create index saved_jobs_owner_date on public.saved_jobs(user_id, created_at desc);
create index cache_expiry on public.job_cache(expires_at);
create index rate_expiry on public.rate_buckets(expires_at);

alter table public.profiles enable row level security;
alter table public.resumes enable row level security;
alter table public.saved_jobs enable row level security;
alter table public.cover_letters enable row level security;
alter table public.jobs enable row level security;
alter table public.job_cache enable row level security;
alter table public.rate_buckets enable row level security;
create policy own_profile on public.profiles for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_resume on public.resumes for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_saved_jobs on public.saved_jobs for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_letters on public.cover_letters for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy read_jobs on public.jobs for select to authenticated using (true);
-- No anon access; cache ingestion and rate accounting are server-only.
revoke all on public.profiles, public.resumes, public.saved_jobs, public.cover_letters, public.jobs, public.job_cache, public.rate_buckets from anon;
revoke all on public.job_cache, public.rate_buckets from authenticated;
grant select, insert, update, delete on public.profiles, public.resumes, public.saved_jobs, public.cover_letters to authenticated;
grant select on public.jobs to authenticated;
grant all on public.profiles, public.resumes, public.saved_jobs, public.cover_letters, public.jobs, public.job_cache, public.rate_buckets to service_role;

create function public.consume_limit(bucket_key text, max_count integer, window_seconds integer)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare current_hits integer;
begin
  insert into public.rate_buckets(key, hits, expires_at)
  values(bucket_key, 1, now() + make_interval(secs => window_seconds))
  on conflict(key) do update set
    hits = case when rate_buckets.expires_at <= now() then 1 else rate_buckets.hits + 1 end,
    expires_at = case when rate_buckets.expires_at <= now() then now() + make_interval(secs => window_seconds) else rate_buckets.expires_at end
  returning hits into current_hits;
  return current_hits <= max_count;
end; $$;
revoke all on function public.consume_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_limit(text, integer, integer) to service_role;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 5242880, array['application/pdf'])
on conflict(id) do nothing;
create policy own_pdf_read on storage.objects for select to authenticated using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy own_pdf_insert on storage.objects for insert to authenticated with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy own_pdf_update on storage.objects for update to authenticated using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text) with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy own_pdf_delete on storage.objects for delete to authenticated using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
