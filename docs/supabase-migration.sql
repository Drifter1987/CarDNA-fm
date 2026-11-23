-- CarDNA — database rules for Phase 2 (SYN-04, SYN-07, ACC-04, ACC-05)
--
-- How to run: Supabase dashboard -> SQL Editor -> paste this whole file -> Run.
-- It is idempotent: running it twice changes nothing the second time.
-- It contains no secrets. It is not run by the site; the owner runs it once (decision D-2).
--
-- Assumptions it checks rather than guesses:
--   public.profiles(id uuid = auth.users.id, role text, plan text, status text)
--   public.vehicles(user_id uuid, vin text, ... unique on (user_id, vin))
--   public.events(user_id uuid, kind text, detail jsonb, created_at timestamptz)
-- If a table is missing, the matching step stops with a clear message before changing anything.

begin;

-- 0. Preflight ---------------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.profiles') is null then raise exception 'public.profiles not found'; end if;
  if to_regclass('public.vehicles') is null then raise exception 'public.vehicles not found'; end if;
  if to_regclass('public.events')   is null then raise exception 'public.events not found';   end if;
end $$;

-- 1. Safety copy of vehicles (D-2). RLS on and no policy: invisible to the API, readable here.
do $$
declare
  copy_name text := 'vehicles_backup_' || to_char(now(), 'YYYYMMDD');
begin
  if to_regclass('public.' || copy_name) is null then
    execute format('create table public.%I as table public.vehicles', copy_name);
    execute format('alter table public.%I enable row level security', copy_name);
  end if;
end $$;

-- 2. SYN-04: soft delete -----------------------------------------------------------------------
alter table public.vehicles add column if not exists deleted_at timestamptz;
create index if not exists vehicles_user_live_idx
  on public.vehicles (user_id) where deleted_at is null;

-- 3. Helpers (security definer so policies on profiles cannot recurse) ---------------------------
create or replace function public.cardna_is_active()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select lower(coalesce(p.status, 'active')) = 'active' from public.profiles p where p.id = auth.uid()),
    true);
$$;

create or replace function public.cardna_is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select p.role in ('owner', 'admin') from public.profiles p where p.id = auth.uid()),
    false);
$$;

grant execute on function public.cardna_is_active() to authenticated;
grant execute on function public.cardna_is_staff()  to authenticated;

-- 4. SYN-07: the saved-vehicle cap, enforced by the database ------------------------------------
-- Same numbers as PLAN_LIMITS in assets/auth.js: free 1, pro 5, workshop 25, business unlimited.
create or replace function public.cardna_vehicle_cap()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  plan_name text;
  cap       integer;
  live      integer;
begin
  -- Only an insert, or an update that brings a removed car back, can raise the count.
  if tg_op = 'UPDATE' and not (old.deleted_at is not null and new.deleted_at is null) then
    return new;
  end if;
  if new.deleted_at is not null then
    return new;
  end if;

  select lower(coalesce(p.plan, 'free')) into plan_name from public.profiles p where p.id = new.user_id;
  cap := case coalesce(plan_name, 'free')
           when 'free'     then 1
           when 'pro'      then 5
           when 'workshop' then 25
           when 'business' then null
           else 1
         end;
  if cap is null then
    return new;
  end if;

  -- Re-saving a car that is already kept is an update of that row, not a new car.
  if tg_op = 'INSERT' and exists (
       select 1 from public.vehicles v
        where v.user_id = new.user_id and v.vin = new.vin and v.deleted_at is null) then
    return new;
  end if;

  select count(*) into live
    from public.vehicles v
   where v.user_id = new.user_id and v.deleted_at is null
     and not (tg_op = 'UPDATE' and v.ctid = old.ctid);

  if live >= cap then
    raise exception 'Saved-vehicle limit reached for the % plan (%).', coalesce(plan_name, 'free'), cap
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists cardna_vehicle_cap on public.vehicles;
create trigger cardna_vehicle_cap
  before insert or update on public.vehicles
  for each row execute function public.cardna_vehicle_cap();

-- 5. ACC-05: a blocked account reads and writes nothing ------------------------------------------
-- RESTRICTIVE policies are ANDed with whatever policies already exist, so no existing policy
-- name needs to be known or dropped. Staff are not blocked from their own rows by this.
alter table public.vehicles enable row level security;
drop policy if exists cardna_active_only on public.vehicles;
create policy cardna_active_only on public.vehicles
  as restrictive for all to authenticated
  using (public.cardna_is_active())
  with check (public.cardna_is_active());

do $$
begin
  if to_regclass('public.vault_entries') is not null then
    execute 'alter table public.vault_entries enable row level security';
    execute 'drop policy if exists cardna_active_only on public.vault_entries';
    execute 'create policy cardna_active_only on public.vault_entries
               as restrictive for all to authenticated
               using (public.cardna_is_active())
               with check (public.cardna_is_active())';
  else
    raise notice 'public.vault_entries does not exist: skipped (the vault is local to the browser today).';
  end if;
end $$;

-- 6. ACC-04: staff can read the activity log -----------------------------------------------------
-- Permissive and additive: users keep reading their own rows through the policy they already have.
alter table public.events enable row level security;
drop policy if exists cardna_events_staff_read on public.events;
create policy cardna_events_staff_read on public.events
  for select to authenticated
  using (public.cardna_is_staff());

commit;

-- Check afterwards (read-only):
--   select policyname, permissive, cmd from pg_policies where tablename in ('vehicles','events','vault_entries');
--   select tgname from pg_trigger where tgrelid = 'public.vehicles'::regclass and not tgisinternal;
--   select column_name from information_schema.columns where table_name = 'vehicles' and column_name = 'deleted_at';
