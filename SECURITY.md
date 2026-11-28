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

## What the published site may carry

GitHub Pages serves `main` through Jekyll, so **every file that is not in `_config.yml`'s `exclude`
list can be downloaded by a visitor**. Three rules keep that right:

- **The site carries the app and nothing else:** the pages, `assets/`, `tools/vin-compare.html` and the
  four `data/` files the pages load.
- **The list is defended twice.** Each document is named, *and* the common document extensions are
  excluded outright — `*.md` and `**/*.md`, `*.sql`, `*.yml`, `*.yaml`, `*.toml`, `*.log`, `*.sh`,
  `*.py` — so a document written later cannot leak by being forgotten. **A new internal file of another
  kind (a `.txt` note, a stray `.html`, an unlisted `.json`) is published until it is added to the
  list**: add it in the same turn it is created.
- **Never add a `.nojekyll` file.** It switches Jekyll off and serves the whole repository again.

**To check it**, open the address of each internal file and expect the Pages 404:

```
https://drifter1987.github.io/CarDNA-fm/CarDNA-fm-tracker.md
https://drifter1987.github.io/CarDNA-fm/instructions.md
https://drifter1987.github.io/CarDNA-fm/SECURITY.md
https://drifter1987.github.io/CarDNA-fm/cardna-fm-plan.md
https://drifter1987.github.io/CarDNA-fm/docs/cloud-storage.md
https://drifter1987.github.io/CarDNA-fm/Skills/claude-mem/claude-mem.md
https://drifter1987.github.io/CarDNA-fm/tools/parse-public-apis.html
```

…while `report.html` and `assets/supabase-config.js` still load. That is the check after every change
to `_config.yml`; Turn 53 is the last run of it.

## If something private has already been committed

Deleting it from the current files is not enough: it stays in the history of a public repository, and in
any clone or fork of it. In order of cost:

1. **Rotate it — if it is a credential.** A password or a key changed in Supabase or GitHub is worthless
   in the history. This is the only fix that needs no rewriting, and it works even where the history
   cannot be changed. **An address is not a credential:** changing that account's password does nothing
   about the address being known, and is worth doing only if the password is reused elsewhere, is
   guessable, or is used on a service where the address is half of the sign-in. Say which case it is
   instead of calling every leak a rotation.
2. **Make the repository private** (Settings → General → Danger zone → Change visibility). History stops
   being public in one step. On a GitHub Free plan, Pages is then not published, so the site needs another
   host or a paid plan.
3. **Start a clean repository** from the current files and archive the old one. New history, no old
   commits — and the old repository must still be made private, or its history stays readable.

This project's own history still contains two personal addresses from before they were removed from the
files (Turn 49). They are named in the tracker's Turn 53 entry by description only — the literals are in
no file, because this repository is public. Both are addresses, not credentials; see step 1.

## Before every commit

- `git status` and `git diff`, read, not skimmed.
- A search for what a secret looks like: `git grep -nE '@|password|secret|service_role|sk_live|sb_secret_'`.
- A new internal file checked against `_config.yml` (see above), and its URL opened for a 404.
- If a key was pasted "just to test it", rotate it before pushing, not after.
