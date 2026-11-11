-- CarDNA — Supabase schema
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query → paste → Run).
-- Safe to re-run: every object is created with "if not exists" and policies are dropped first.
--
-- Four tables:
--   profiles       one row per account, created automatically on sign-up
--   vehicles       the garage, synced across devices
--   vault_entries  the private VIN list, one row per account
--   decode_cache   shared cache of paid European decodes, server-side only

begin;

-- ------------------------------------------------------------------ profiles
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  plan         text not null default 'free',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ------------------------------------------------------------------ garage
create table if not exists public.vehicles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  vin        text not null,
  model_year text,
  make       text,
  model      text,
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint vehicles_vin_format check (vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  constraint vehicles_user_vin_key unique (user_id, vin)
);

-- ------------------------------------------------------------------ private vault
create table if not exists public.vault_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  vin        text not null,
  note       text,
  created_at timestamptz not null default now(),

  constraint vault_vin_format check (vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  constraint vault_user_vin_key unique (user_id, vin)
);

-- ------------------------------------------------------------------ paid-decode cache
-- One row per VIN ever bought from the European vendor, so a repeat lookup is free.
-- Never exposed to the browser: no grants, no policies, reachable only by a function
-- using the secret key.
create table if not exists public.decode_cache (
  vin        text primary key,
  payload    jsonb not null,
  source     text not null default 'vincario',
  fetched_at timestamptz not null default now(),

  constraint decode_cache_vin_format check (vin ~ '^[A-HJ-NPR-Z0-9]{17}$')
);

create index if not exists vehicles_user_idx on public.vehicles (user_id, created_at desc);
create index if not exists vault_user_idx on public.vault_entries (user_id, created_at desc);

-- ------------------------------------------------------------------ updated_at
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists vehicles_touch on public.vehicles;
create trigger vehicles_touch before update on public.vehicles
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------ new account → profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger functions run as the table owner, so no role needs EXECUTE on this.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ------------------------------------------------------------------ row level security
alter table public.profiles      enable row level security;
alter table public.vehicles      enable row level security;
alter table public.vault_entries enable row level security;
alter table public.decode_cache  enable row level security;

drop policy if exists "profiles read own"   on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
drop policy if exists "vehicles own"        on public.vehicles;
drop policy if exists "vault own"           on public.vault_entries;

create policy "profiles read own" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles insert own" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy "profiles update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- One policy covers select, insert, update and delete for the owner.
create policy "vehicles own" on public.vehicles
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "vault own" on public.vault_entries
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- No policy on decode_cache means no browser access at all, by design.

-- ------------------------------------------------------------------ grants
-- "Automatically expose new tables" is switched off, so grants are explicit.
grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on public.profiles      to authenticated;
grant select, insert, update, delete on public.vehicles      to authenticated;
grant select, insert, update, delete on public.vault_entries to authenticated;

grant select, insert, update, delete on public.decode_cache to service_role;
revoke all on public.decode_cache from anon, authenticated;

commit;
