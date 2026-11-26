-- CarDNA — one account's cloud storage (Turn 45)
--
-- Why: every account must own a place in the database that is there on any device with a
-- connection. Before this file the saved garage was the only thing mirrored; recent lookups
-- and the encrypted vault lived in one browser only, so a second device started empty.
--
-- What it adds:
--   public.cardna_cloud   one row per (user, kind, key), readable and writable by its owner only
--   the plan cap          free 20 rows, Pro 200, Workshop 2000, Business no limit
--   deletion              cardna_delete_my_account also removes these rows
--
-- Idempotent: safe to run twice. Run it in Supabase -> SQL Editor. It stores no secrets.
-- It expects the helpers from docs/supabase-migration.sql (cardna_is_active) and the delete
-- function from docs/supabase-decode-log-cache-delete.sql; both are guarded below.

begin;

-- 1. The table -----------------------------------------------------------------------------------
-- The browser uses two rows per account today: kind 'recent' key 'list' (the last six VINs) and
-- kind 'vault' key 'current' (the AES-256-GCM blob, still encrypted). The shape leaves room for
-- smaller things later — a setting, a label — without a new table for each.

create table if not exists public.cardna_cloud (
  user_id    uuid not null default auth.uid(),
  kind       text not null,
  key        text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  constraint cardna_cloud_pkey primary key (user_id, kind, key),
  constraint cardna_cloud_kind_len check (char_length(kind) between 1 and 32),
  constraint cardna_cloud_key_len  check (char_length(key)  between 1 and 64),
  -- 256 KB per row: the vault blob for 400 VINs is a few KB, so this is room, not a target.
  constraint cardna_cloud_size     check (octet_length(data::text) <= 262144)
);

create index if not exists cardna_cloud_user_kind_idx
  on public.cardna_cloud (user_id, kind);

alter table public.cardna_cloud enable row level security;

-- 2. Only its owner reads or writes a row ---------------------------------------------------------
drop policy if exists cardna_cloud_read_own on public.cardna_cloud;
create policy cardna_cloud_read_own on public.cardna_cloud
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists cardna_cloud_insert_own on public.cardna_cloud;
create policy cardna_cloud_insert_own on public.cardna_cloud
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists cardna_cloud_update_own on public.cardna_cloud;
create policy cardna_cloud_update_own on public.cardna_cloud
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists cardna_cloud_delete_own on public.cardna_cloud;
create policy cardna_cloud_delete_own on public.cardna_cloud
  for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.cardna_cloud to authenticated;

-- A blocked account reads and writes nothing. Restricted only when the helper exists.
do $$
begin
  if to_regprocedure('public.cardna_is_active()') is not null then
    execute 'drop policy if exists cardna_active_only on public.cardna_cloud';
    execute 'create policy cardna_active_only on public.cardna_cloud
               as restrictive for all to authenticated
               using (public.cardna_is_active())
               with check (public.cardna_is_active())';
  else
    raise notice 'cardna_is_active() missing: blocked accounts are not restricted here (run supabase-migration.sql).';
  end if;
end $$;

-- 3. A plan cap, so one account cannot fill the free project --------------------------------------
-- Mirrors PLAN_LIMITS in assets/auth.js: free 20 rows, Pro 200, Workshop 2000, Business unlimited.

create or replace function public.cardna_cloud_cap()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  plan_name text;
  cap       integer;
  used      integer;
begin
  -- Re-saving the same row is not a new row.
  if tg_op = 'UPDATE' then
    return new;
  end if;

  select lower(coalesce(p.plan, 'free')) into plan_name from public.profiles p where p.id = new.user_id;
  cap := case coalesce(plan_name, 'free')
           when 'free'     then 20
           when 'pro'      then 200
           when 'workshop' then 2000
           when 'business' then null
           else 20
         end;
  if cap is null then
    return new;
  end if;

  select count(*) into used from public.cardna_cloud c where c.user_id = new.user_id;
  if used >= cap then
    raise exception 'Cloud storage is full for the % plan (%).', coalesce(plan_name, 'free'), cap
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists cardna_cloud_cap on public.cardna_cloud;
create trigger cardna_cloud_cap
  before insert on public.cardna_cloud
  for each row execute function public.cardna_cloud_cap();

-- 4. Deletion removes these rows too ---------------------------------------------------------------
-- The same function as docs/supabase-decode-log-cache-delete.sql, with this table added and the
-- optional tables guarded. The owner is still refused in the database, not in the page.

create or replace function public.cardna_delete_my_account(confirm text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  uid       uuid := auth.uid();
  role_name text;
  mail      text;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not signed in.');
  end if;

  if lower(trim(coalesce(confirm, ''))) <> 'delete' then
    return jsonb_build_object('ok', false, 'error', 'Type delete to confirm.');
  end if;

  select lower(coalesce(p.role, 'user')) into role_name from public.profiles p where p.id = uid;
  role_name := coalesce(role_name, 'user');

  if role_name = 'owner' then
    return jsonb_build_object('ok', false, 'error', 'The owner account cannot be deleted from the app.');
  end if;

  select lower(u.email) into mail from auth.users u where u.id = uid;

  delete from public.vehicles   where user_id = uid;
  delete from public.decode_log where user_id = uid;
  delete from public.events     where user_id = uid;
  delete from public.profiles   where id = uid;

  -- Tables an older project may not have: delete from each only when it is there.
  if to_regclass('public.cardna_cloud') is not null then
    execute 'delete from public.cardna_cloud where user_id = $1' using uid;
  end if;
  if to_regclass('public.vault_entries') is not null then
    execute 'delete from public.vault_entries where user_id = $1' using uid;
  end if;

  if mail is not null then
    delete from public.waitlist w where lower(w.email) = mail;
  end if;
  delete from auth.users where id = uid;

  return jsonb_build_object('ok', true, 'deleted', uid::text);
end;
$$;

grant execute on function public.cardna_delete_my_account(text) to authenticated;

commit;

-- Check afterwards (read-only):
--   select policyname, cmd, permissive from pg_policies where tablename = 'cardna_cloud';
--     -> cardna_cloud_read_own / insert / update / delete (permissive) and cardna_active_only
--   select tgname from pg_trigger
--    where tgrelid = 'public.cardna_cloud'::regclass and not tgisinternal;
--     -> cardna_cloud_cap
--   select count(*) from public.cardna_cloud;   -- 0 until someone saves something
