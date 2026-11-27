# What must never be committed

This repository is **public**: every tracked file is readable on github.com by anyone, and git keeps
old versions for ever. This page is the rule for what may be in it.

## Never in a tracked file

- A password, of any kind — an account's, a database's, a Postgres role's.
- A Supabase **secret** key (`sb_secret_…`) or the legacy **service_role** key. Either one bypasses
  row-level security, so it would hand every row to any visitor.
- A payment processor's secret key (`sk_live_…`, `sk_test_…`), or a vendor API key.
- A `.env` file, a private key, a certificate, or the Supabase CLI's local state.
- Someone's personal address, phone number, or the VIN of a car they actually own.

## The one key that is in the repository, on purpose

`assets/supabase-config.js` holds the Supabase project **URL** and its **publishable** key
(`sb_publishable_…`). Supabase marks that key safe to publish: it ships to every visitor's browser and
grants nothing by itself. What any request may read or write is decided by **row-level security** in the
database, not by the key. A secret key is what would end that protection, and it belongs in a server
function's environment variables — never in a page.

## If something private has already been committed

Deleting it from the current files is not enough: it stays in the history of a public repository, and in
any clone or fork of it. In order of cost:

1. **Rotate it.** A password changed in Supabase or GitHub is worthless in the history. This is the only
   fix that needs no rewriting, and it works even where the history cannot be changed.
2. **Make the repository private** (Settings → General → Danger zone → Change visibility). History stops
   being public in one step. On a GitHub Free plan, Pages is then not published, so the site needs another
   host or a paid plan.
3. **Start a clean repository** from the current files and archive the old one. New history, no old
   commits — and the old repository must still be made private, or its history stays readable.

This project's own history still contains two personal addresses from before they were removed from the files
(Turn 49). The passwords for those two accounts are the ones to rotate; see `CarDNA-fm-tracker.md`, Turn 51.

## Before every commit

- `git status` and `git diff`, read, not skimmed.
- A search for what a secret looks like: `git grep -nE '@|password|secret|service_role|sk_live|sb_secret_'`.
- If a key was pasted "just to test it", rotate it before pushing, not after.
