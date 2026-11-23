-- CarDNA — follow-up to supabase-migration.sql (Turn 22)
--
-- Why: after the first migration ran, the dashboard showed the project already had
--   * trigger vehicles_plan_cap  (function enforce_vehicle_cap) — the same cap, and it lets staff through
--   * policies "events staff read" and "staff read events" — the same staff read of events
-- so two of the first migration's pieces are duplicates, and one of them (cardna_vehicle_cap) is
-- STRICTER than the original: it has no staff bypass, so an owner or admin on a low plan would be
-- refused a second saved car where the original rule allowed it.
--
-- This file removes only the two duplicates the first migration added. It keeps everything else:
-- deleted_at, the active-account restrictive policies, and the helper functions.
-- Idempotent. Run in Supabase -> SQL Editor only if you want the original single cap rule back.

begin;

drop trigger  if exists cardna_vehicle_cap on public.vehicles;
drop function if exists public.cardna_vehicle_cap();

drop policy if exists cardna_events_staff_read on public.events;

commit;

-- Check afterwards (read-only):
--   select tgname from pg_trigger where tgrelid = 'public.vehicles'::regclass and not tgisinternal;
--     -> expect vehicles_plan_cap and vehicles_touch only
--   select policyname from pg_policies where tablename = 'events';
--     -> expect "events insert own", "events staff read", "staff read events"
