-- CarDNA — the owner's "log in as this account" view (Turn 46)
--
-- What this is, plainly: a browser cannot mint another account's Supabase session. That needs the
-- service_role key, which must never be in a page, so a real session swap is a server function and a
-- decision of its own. What this file adds is the honest middle: ONE account — drifter_87@live.com,
-- refused by email in the database, not only by the button — may read another account's view: its
-- profile, saved vehicles, recent lookups, encrypted vault blob and decode count. Read-only.
--
-- Every use is written to public.events (kind 'act_as' and 'act_as_end'), so it is never silent.
--
-- Idempotent. Run in Supabase -> SQL Editor. Contains no secrets.

begin;

create or replace function public.cardna_act_as(target uuid, ending boolean default false)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  me       uuid := auth.uid();
  my_mail  text;
  my_role  text;
  who      public.profiles%rowtype;
  cars     jsonb := '[]'::jsonb;
  recent   jsonb := null;
  vault    jsonb := null;
  used     integer := 0;
  leftover integer := 0;
begin
  if me is null then
    return jsonb_build_object('ok', false, 'error', 'Not signed in.');
  end if;

  select lower(coalesce(p.role, 'user')) into my_role from public.profiles p where p.id = me;
  select lower(u.email) into my_mail from auth.users u where u.id = me;

  /* The one account allowed to look, in the database, by address as well as by role. */
  if coalesce(my_role, 'user') <> 'owner' or my_mail is distinct from 'drifter_87@live.com' then
    return jsonb_build_object('ok', false, 'error', 'Only the owner may open another account''s view.');
  end if;

  if target is null then
    return jsonb_build_object('ok', false, 'error', 'No account was named.');
  end if;

  select * into who from public.profiles p where p.id = target;
  if who.id is null then
    return jsonb_build_object('ok', false, 'error', 'That account was not found.');
  end if;

  if target = me then
    return jsonb_build_object('ok', false, 'error', 'That is your own account.');
  end if;

  /* Looking at another owner is refused: there is only one owner, and it is you. */
  if lower(coalesce(who.role, 'user')) = 'owner' then
    return jsonb_build_object('ok', false, 'error', 'The owner account cannot be viewed this way.');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'vin', v.vin,
           'year', coalesce(v.model_year::text, ''),
           'make', coalesce(v.make, ''),
           'model', coalesce(v.model, ''),
           'label', coalesce(v.note, ''),
           'savedAt', coalesce(v.created_at::text, '')
         ) order by v.created_at desc), '[]'::jsonb)
    into cars
    from public.vehicles v
   where v.user_id = target and v.deleted_at is null;

  if to_regclass('public.cardna_cloud') is not null then
    execute 'select data from public.cardna_cloud where user_id = $1 and kind = ''recent'' and key = ''list'''
      into recent using target;
    execute 'select data from public.cardna_cloud where user_id = $1 and kind = ''vault'' and key = ''current'''
      into vault using target;
  end if;

  if to_regclass('public.decode_log') is not null then
    execute 'select count(*) from public.decode_log where user_id = $1' into used using target;
  end if;

  if to_regclass('public.profiles') is not null then
    leftover := 0;
  end if;

  insert into public.events (user_id, kind, detail)
  values (me, case when ending then 'act_as_end' else 'act_as' end,
          jsonb_build_object('target_id', target, 'email', who.email));

  return jsonb_build_object(
    'ok', true,
    'profile', jsonb_build_object(
      'id', who.id, 'email', who.email, 'display_name', who.display_name,
      'plan', coalesce(who.plan, 'free'), 'role', coalesce(who.role, 'user'),
      'created_at', who.created_at
    ),
    'vehicles', cars,
    'recent', recent,
    'vault', vault,
    'decodes', used,
    'readonly', true
  );
end;
$$;

grant execute on function public.cardna_act_as(uuid, boolean) to authenticated;

commit;

-- Check afterwards (read-only):
--   select proname from pg_proc where proname = 'cardna_act_as';
--   select kind, detail from public.events
--    where kind in ('act_as','act_as_end') order by created_at desc limit 10;
