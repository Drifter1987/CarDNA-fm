# One account's cloud storage

Every account has its own place in Supabase: rows only it can read or write, reached whenever the
browser has a connection. This file is the record of that design, of what it costs, and of how a paid
decode would be charged — nothing here is a decision the Boss has already made.

## What an account holds, and where

| What | Where it lives | Read by |
|---|---|---|
| Saved vehicles | `public.vehicles`, one row per car per account | `assets/garage.js` |
| Recent lookups (last six VINs) | `public.cardna_cloud`, kind `recent`, key `list` | `assets/vin.js` |
| Encrypted vault | `public.cardna_cloud`, kind `vault`, key `current` — the AES-256-GCM blob | `assets/vault.js` |
| Decode count | `public.decode_log`, one row per account per VIN | `assets/auth.js` |
| Activity | `public.events` | `assets/auth.js`, `assets/admin.js` |
| VIN cache (public data, not per account) | `public.decode_cache` | `assets/vin.js`, `assets/report-view.js` |

`docs/supabase-user-cloud.sql` creates the second table: `(user_id, kind, key, data jsonb, updated_at)`,
primary key on the first three, row-level security with **one policy per command, each `user_id =
auth.uid()`**, a restrictive policy that blocks a suspended account, a grant to `authenticated` only,
and a plan cap of 20 rows on Free, 200 Pro, 2000 Workshop, unlimited on Business. The same file replaces
`cardna_delete_my_account` so a deletion removes these rows too — the vault and `vault_entries` deletes
are now guarded with `to_regclass`, so a missing table can no longer make a deletion fail.

**Run it once** in Supabase → SQL Editor. Until then the app says so on the page:

> Cloud storage is not set up yet: run docs/supabase-user-cloud.sql in Supabase. Nothing was uploaded.

That sentence comes from `assets/cloud.js`, which probes the table once the session resolves — so the
page states what is true rather than pretending. The same module keeps a mirror per account under
`cardna.cloud.<user id>` (a page renders before the request answers), queues a change made offline in
`cardna.cloud.queue`, and sends it when the browser is back online. Only the cipher text of the vault is
ever uploaded: the pass phrase and the plain VIN list stay in the tab.

The newest change is also the reason the vault page's copy changed: it used to say nothing was uploaded,
which is no longer true. Privacy on `legal.html` says the same thing now.

## Why it is cheap

- **Rows are tiny.** The recent list is about 300 bytes; a 400-VIN vault blob is a few kilobytes. A
  thousand accounts with both rows is a few megabytes — the free Supabase project (500 MB database,
  quoted in the dashboard's plan page, so check it there before relying on the number) is not the limit
  that will be reached first.
- **No files, no bucket.** Everything is in Postgres rows, so no storage-object egress is spent and no
  Storage policy has to be written.
- **Writes are rare.** A row is written on a decode, a save or a vault save — never per keystroke. The
  free plan's three decodes a month make the traffic negligible; a paying account's own traffic is what
  its plan already accounts for.
- **Reads are one row each.** `select=data&kind=eq.&key=eq.&limit=1` uses the primary key, so no index
  scan and no full-table read; the mirror means the page does not need the read to render.
- **The cap is the guard.** The trigger stops one account from filling the project, which is the only
  cost risk a free tier really has.

What would cost money, in order: a paid plan's row count at scale, egress if the app ever reads whole
lists on every page view, and Realtime (not used here — the app fetches on load and on an action).
If cost ever matters, the first lever is capping `cardna_cloud` at one row per kind per account.

## Charging only for the decode that costs us money

Yes — and it is the cheapest design, because the two decodes are not the same service:

- **US decode (NHTSA vPIC)** is public domain, no key, no per-lookup cost. It should never be charged,
  and the free plan's three decodes exist to prove the app works, not to earn anything.
- **European full specification** is bought per lookup from a vendor (Vincario €0.22–€0.49, quoted in
  `docs/eu-decoder-integration.md`). That is the only decode with a marginal cost, so it is the only
  one worth metering.

The shapes that fit, cheapest first:

| Shape | How it charges | What it costs to run | When it is the right answer |
|---|---|---|---|
| **Prepaid European credits** | A pack of lookups bought through Checkout; one credit spent per European decode, in the database | One Checkout session and one webhook per purchase, no metered invoices, no minimum | The default recommendation: a small team, infrequent purchases, one price |
| **Metered billing** (Stripe usage records, Paddle metered prices) | One usage record per European decode, invoiced monthly | A price per unit, a webhook per record or a batch, invoice reconciliation, and a minimum invoice some processors charge | Only at volume, when an invoice per month is friendlier than a purchase per use |
| **Plan allowance, then overage** | The plan's monthly European allowance, then a per-decode price — what `pricing.html` already shows | The same as above plus a running count per account per month | Once the vendor contract and the allowances are settled |

Both payment shapes need the same two things this app does not have yet: a card processor (`D-12`) and
a place to keep the vendor key server-side. That place is the same edge function the VIN cache wants —
the one that calls the vendor and writes the row — so metering and the cache are one piece of work, not
two. Nothing can charge from the static pages: the key and the count must be on the server, or an
account could hand itself free lookups.

The database change metering needs is small: a `kind` column on `decode_log` (`'us'` or `'eu'`), so the
free three count only US decodes, and a credit balance per account (a column on `profiles` or a row in
`cardna_cloud`). Until that exists, the Free plan's three decodes count both kinds — which is what the
app does today, and `pricing.html` says so.

## Fees to weigh before choosing

Approximate, and to be checked on the providers' own pricing pages before anything is signed: Stripe
charges per successful card charge plus a percentage (about 1.5 % + €0.25 for a European card, more for
a non-European one), Paddle and Lemon Squeezy charge a higher percentage but act as merchant of record
and remit VAT themselves. On a €0.26 lookup, a percentage-only fee is a large share of the margin — which
is why the prepaid pack, where one card fee covers many lookups, is the shape that survives this
product's prices.

## Where this is recorded

- This file: the design, the cost, the metering answer.
- `docs/supabase-user-cloud.sql`: the table, its policies, its cap, the deletion.
- `cardna-fm-plan.md` §4: `F-28`, the feature's status and its wiring contract.
- `README.md`: what the product promises publicly.
- `CarDNA-fm-tracker.md`: what was checked in the browser, and what is still open.
- `legal.html`: what the account stores, in the words a visitor reads.
