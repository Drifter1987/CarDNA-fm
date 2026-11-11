# Supabase setup

The project is live and empty. This page is the exact order to do things in, and what to
paste where.

| | |
|---|---|
| Project | **DNA-fm** |
| Organisation | drifter1987 (Free) |
| Reference | `wcyhhufdxyepyneektou` |
| API URL | `https://wcyhhufdxyepyneektou.supabase.co` |
| Region | West EU (Paris) · `eu-west-3` · Nano |
| Plan | Free — 2 projects, 500 MB database, 5 GB egress, 50k monthly active users |

## 1. Create the tables

Dashboard → **SQL Editor** → *New query* → paste the whole of
[`supabase/schema.sql`](../supabase/schema.sql) → **Run**.

It creates four tables, their indexes, an `updated_at` trigger, a trigger that makes a profile
on sign-up, row-level security with owner-only policies, and the grants. It is safe to run
again — everything is `if not exists` and the policies are dropped first.

Then check **Table Editor**: `profiles`, `vehicles`, `vault_entries`, `decode_cache`.

| Table | Holds | Who can read it |
|---|---|---|
| `profiles` | one row per account, plan, display name | that account only |
| `vehicles` | the synced garage | that account only |
| `vault_entries` | the private VIN list | that account only |
| `decode_cache` | paid European decodes, one row per VIN | nobody in the browser; server only |

`decode_cache` has row-level security on and **no policies at all**, plus no grants to `anon` or
`authenticated`. That is deliberate: the anon key cannot read it even if someone tries. Only a
function holding the secret key can touch it.

## 2. Keys

Dashboard → **Project Settings → API Keys**.

- **Publishable key** (`sb_publishable_…`) — safe in the browser and safe to commit. It is only
  powerful alongside row-level security, which is now on.
- **Secret key** (`sb_secret_…`) — server only. Never in a page, never in this repository, only in
  an edge function's environment variables.

The old `anon` / `service_role` names are behind *View legacy API keys* and are being retired in
early 2027; new code should use publishable and secret.

## 3. Auth settings

Dashboard → **Authentication → URL Configuration**. This is still on the default
`http://localhost:3000`, which is why confirmation links would go nowhere:

- **Site URL** — `https://drifter1987.github.io/CarDNA-fm/`
- **Redirect URLs** — add all three:
  - `https://drifter1987.github.io/CarDNA-fm/**`
  - `http://localhost:3000/**`
  - `https://cardna-eumz--preview.freemilk.app/**` (the preview link)

The `/**` matters: Supabase matches the path as well as the host, and a bare URL will reject
anything deeper than the root.

- **Email** — confirmation is on by default. The built-in SMTP sender is heavily rate-limited and
  fine for development only; a real launch needs custom SMTP.
- Providers — email + password is enough to start. GitHub OAuth can be added later; the CarDNA
  repository already exists, so that is a small step when wanted.

## 4. What the app does next

Nothing in `assets/` talks to Supabase yet. Wiring it in is a separate, reviewable change:

1. `assets/supabase-config.js` — the project URL and publishable key (both public).
2. Sign-in UI — email + password, one small panel, no page reload.
3. Garage sync — `cardna.garage` keeps working offline, and mirrors to `vehicles` when signed in.
4. Vault sync — `vault_entries` replaces the encrypted-file hop between devices. The browser
   encryption can stay as a second layer if wanted; the database is already owner-only.
5. Edge function — the European decoder proxy, reading its vendor key from the function's
   environment and writing results into `decode_cache`.

## 5. Free-tier things to know

- **No automatic backups on Free.** `schema.sql` in this repository is the backup of the
  structure; the rows are user data and should be exported before anything risky.
- **Pausing** — a project with no traffic for a week pauses and wakes on the next request, with a
  few seconds' delay. Worth knowing before launch, not a problem while building.
- **Nano compute** — 500 MB database, shared CPU. The catalogue stays as static files in the repo
  and is not stored here, which keeps the database tiny.

## 6. If you already ran an earlier version

The first version of `schema.sql` had two lint warnings from the Advisor Center. Open
[`supabase/patch-001-lint.sql`](../supabase/patch-001-lint.sql), copy it, and run it once; it is also
what the file now contains, so a fresh project needs nothing.

**Copy from the line that starts with `create`.** If the editor's first token is `sql`, that is the
markdown fence tag from the code block, not SQL — Postgres rejects the batch with
`42601: syntax error at or near "sql"` and nothing runs.

```sql
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
```

Two advisories are expected and should be left alone:

- **RLS Enabled No Policy — `public.decode_cache`**: there is deliberately no policy, so the browser
  can never read the cache. Only the secret key from a server function can.
- **Unused Index — `vehicles`, `vault_entries`**: they exist for queries that start when data
  arrives; the advisor is just noting the tables are empty.
