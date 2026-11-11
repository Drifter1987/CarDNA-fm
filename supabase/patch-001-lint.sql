-- CarDNA — patch 001
-- Clears the two Advisor Centre findings on a project that already ran an earlier schema.sql.
--
-- Copy from the line that starts with "create" — if your editor shows "sql" at the very
-- beginning of the query, that is the markdown fence tag, not SQL, and Postgres rejects it
-- with 42601 "syntax error at or near sql". Delete it and run again.

-- 1. Pin the search path of the timestamp trigger (Function Search Path Mutable)
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

-- 2. Only the trigger needs to call this, not every signed-in visitor
--    (Public Can Execute SECURITY DEFINER Function)
revoke execute on function public.handle_new_user() from public, anon, authenticated;
