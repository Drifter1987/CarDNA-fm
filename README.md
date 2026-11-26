# CarDNA

**A GMOttomotive product.**

CarDNA turns a VIN into the exact vehicle — make, model, year, engine, plant — and is the front door
of GMOttomotive's vehicle-data family. This repository is the public site: static HTML, two stylesheets,
a handful of small vanilla-JS modules, no build step, no dependencies, no backend.

## Run it

Two places, and no others: **GitHub** holds the public files, **Supabase** holds account data.
GitHub Pages serves this repository at `https://drifter1987.github.io/CarDNA-fm/` — no separate host,
no build step, no third platform.

To run it locally, any static file server works:

```bash
cd CarDNA-fm
npx serve .
# open the address it prints
```

## Pages

| File | What it is |
|---|---|
| `index.html` | App shell: Overview / Decode VIN / Brands / Catalogue / Pricing as tabs, no page scroll |
| `decode.html` | Full VIN decoder with example VINs, shareable `?vin=` links and recent lookups |
| `makes.html` | 319 car brands grouped by country, every model embedded — opening a brand fetches nothing |
| `pricing.html` | Free / Pro / Workshop / Business tiers, line-by-line comparison, and why the quotas are what they are |
| `about.html` | GMOttomotive, principles, data sources, roadmap, contact |
| `garage.html` | Saved vehicles, select all or some, and export the full record as Excel, PDF, Markdown or CSV |
| `signin.html` | Email and password sign-in; the app is behind it |
| `admin.html` | Staff console in four tabs: Overview (stats, plan mix, 7-day KPIs), Accounts (search and the table), Activity (a filterable table) and Charts (period/kind/account filters over the daily chart and the by-kind and by-account lists) |
| `vault.html` | Private vault: a VIN list encrypted with a pass phrase in this browser, exportable as an encrypted file |
| `legal.html` | Privacy, terms, data licences and independence notice |

## Assets

| File | Purpose |
|---|---|
| `assets/style.css` | The whole design system: dark blueprint palette, acid-lime accent, mono labels |
| `assets/app.js` | Mobile nav, current year, the shared clipboard helper (with a fallback for browsers that refuse it), and the tab controller (hash-routed, arrow-key navigable) |
| `assets/preview.js` | The start icon: marks a feature that is built in the interface but not wired yet, and hides the marker the moment its flag turns true |
| `assets/surfaces.js` | The surface runtime: one panel per unwired feature, with locked, working, not-connected, done and error states decided in one place |
| `assets/billing.js` | Checkout, the billing portal, invoices and overage — the shape a payment processor will return, without ever claiming a charge |
| `assets/waitlist.js` · `assets/bulk.js` · `assets/api.js` · `assets/team.js` · `assets/account.js` · `assets/vehicle.js` · `assets/report.js` | The waitlist, bulk VIN upload (real CSV parsing), API key, team seats, data export/deletion, recalls and shareable-report modules behind the garage, pricing and decoder panels |
| `assets/supabase-config.js` | Project URL and the publishable key. Only those two — never a secret key or a database password |
| `assets/auth.js` | Accounts over the Supabase REST API: sign-in, sign-up, session refresh, profile (plan and role), the sign-in gate, the account chip, and activity logging |
| `assets/admin.js` | Staff console: four tabs with the account table, a filterable activity table and the charts (period, kind and account filters), role and plan control, blocking, and the owner-only read-only "log in as" button — two steps in the page, never a native dialog |
| `assets/export.js` | Full-record export: Markdown, CSV, a real .xlsx (merged sheet + one sheet per model, written without a library) and print-to-PDF |
| `assets/motion.css` | Motion layer: entry reveals, panel and tab transitions, pointer spotlight, button sheen, the animated parts diagram and the VIN scan. Inert unless `motion.js` runs |
| `assets/motion.js` | Scroll reveals with stagger, counting stats, tab transitions, a pointer-tracked card glow and the 17-slot VIN scan that runs while a decode is in flight. Returns immediately when the visitor prefers reduced motion |
| `assets/cloud.js` | One account's cloud storage: recent lookups and the encrypted vault mirrored to `cardna_cloud`, a per-account local mirror, an offline queue, and the honest "not set up yet" line when the SQL has not been run |
| `assets/actas.js` | The owner's "log in as" view of one account: read-only, a banner with a way back, and every use recorded — the button is for drifter_87@live.com alone, and the database refuses anyone else (`docs/supabase-owner-act-as.sql`) |
| `assets/vin.js` | VIN validation, vPIC decode over the shared 104-field schema, decode warnings, recent lookups per account (mirrored to Supabase), `?vin=` deep links |
| `assets/vin-schema.js` | The single 104-field VIN schema, shared by the decoder and the comparison tool |
| `tools/vin-compare.html` | Keyless decoder comparison: vPIC, AI Kit Edge, AI Kit Unified, NHTSA recalls — full schema per VIN, plus field-by-field diff |
| `assets/makes.js` | Loads the static catalogue, groups brands by country, instant search across brands and models |
| `assets/garage.js` | Saved vehicles in `localStorage`: save, list, remove, clear — shared by the decoder and `garage.html` |
| `assets/vault.js` | Private vault: PBKDF2-SHA256 key derivation, AES-256-GCM encryption, VIN parsing and encrypted import/export, with the cipher text mirrored to the account — see below |
| `data/vehicles.csv` | Static catalogue: 15,068 rows, one per model, six vehicle kinds (1.1 MB) — CC BY 4.0 |
| `data/engines.csv` | 30,535 engine variants with generation, years, body, power, torque and dimensions (5 MB) — ODbL |
| `data/catalog_car_makes.json` | Make metadata with country codes, used to group the brands |
| `data/brands.json` | Curated parent-group overlay (Volkswagen Group, Stellantis, Geely…) |
| `data/vpic_makes.csv` | 12,423 manufacturer records — the full NHTSA registry, for reference |
| `data/vpic_makes_car.csv` | The 195 makes filed as "Passenger Car" |
| `data/public-apis-README.md` | The complete public-apis catalogue — ~2,000 free APIs in 51 categories |
## Data

- **VIN decode:** two layers. NHTSA vPIC (`https://vpic.nhtsa.dot.gov/api`, public domain, no key)
  gives the US manufacturer-filed record. A **European structural decoder** built into `vin.js` reads
  the WMI (~130 manufacturers), market region, model year, plant code, serial and check digit from the
  VIN itself, and fills the identity fields when vPIC has nothing. Every result renders the same
  104-field schema in seven sections; unfiled fields show `—`, and vPIC error codes are surfaced in a
  banner and a decode-notes section.
- **Car brands and models:** VehiclesDB (CC BY 4.0), shipped as `data/vehicles.csv` (one row per model).
  Browsing the catalogue makes no network request at all.
- **Generations and engines:** gor3a/vehicle-makes-models (ODbL), shipped as `data/engines.csv`
  (30,535 variants). Loaded lazily the first time a brand is opened, then cached in memory.

Accounts live in Supabase. An account stores an email, a hashed password, a display name, a plan
and a role. **Each account has its own place in the database, reached whenever the browser is online:**
saved vehicles in `vehicles`, recent lookups and the *encrypted* vault blob in `cardna_cloud` — rows only
that account can read, enforced by row-level security rather than by the page. The vehicle record you
decode is still sent straight from the browser to NHTSA. `docs/cloud-storage.md` records the design, its
cost and how a paid decode would be charged.

## Private vault

There is no plain VIN list on any server. Three copies exist, and every one of them is cipher text:

- `cardna.vault.<account>` — this browser, per account
- `cardna_cloud`, kind `vault`, key `current` — the account's own row in Supabase
- the file `cardna-vault-<date>.json` — only if you download it

`vault.html` encrypts the list with AES-256-GCM, the key derived from your pass phrase through
PBKDF2-SHA256 (210,000 iterations, random salt and IV). Only the cipher text is written; the pass
phrase is never stored and never sent. "Download encrypted file" saves that same cipher text as JSON and
"Load an encrypted vault file" reads it back, so the list survives losing the device. There is no
recovery if the phrase is lost — not by us either, because we cannot read the blob.

Recent lookups (`cardna.recent.<account>`) and the garage (`cardna.garage`) are readable by the account
that owns them, on any device it signs in on; the local copy is a cache so the page renders at once and
works offline.

Plain VIN lists never belong in this repository — `.gitignore` excludes `private/`, `*.cardna` and
exported `cardna-vault-*` / `cardna-vins-*` files.

## What is real today, and what is marked

The product's target is a finished interface whose paid features are wired in later, without redesign.
That target is set out in `instructions.md` and `cardna-fm-plan.md`. **The interface is now complete for
every feature whose service is missing:** each one is built, carries a small "Coming soon" marker
(`assets/preview.js` plus the `.preview-flag` style), and answers honestly instead of pretending. Going
live changes one flag and one function body — never a layout or a sentence.

**Live and working:** US VIN decoding (NHTSA vPIC, 104 fields), the European structural decode used as a
fallback, the whole static catalogue, **recalls and complaints on any VIN** (every campaign listed, each
folded to one line you can expand — the component, campaign number, summary, remedy and filed date, and
every export carries them), accounts with roles and plans, the garage with server sync and a retry queue,
the encrypted vault, Markdown / CSV / PDF / Excel export, the staff console, analytics for the owner, the
**waitlist** (a real row in Supabase per address and interest, insert-only for visitors and
staff-readable), the **shareable report** at `report.html?vin=…` (the filed record only, readable without
an account, served from the VIN cache — and a VIN shows there once someone has decoded it while signed in;
the decoder's panel copies the link, and the report has its own Share button), the free plan's limits
(3 decodes in total, 1 saved vehicle), and self-serve account export and deletion.

**Finished, waiting for its service** — `cardna-fm-plan.md` §4.1 and §4.2 name the module and the exact
wiring for each:

| Surface | Where | What is missing |
|---|---|---|
| Checkout, invoices, overage | `pricing.html` | a card processor (`D-12`) |
| European full specification | `decode.html` result | the vendor contract (`D-13`) |
| Licensed parts catalogue | `index.html` Catalogue tab | the licence (`D-14`) |
| Bulk VIN upload | `garage.html` | the batch path into the garage |
| API key | `garage.html` | `api_keys` and the gateway |
| Team seats | `garage.html` | the `seats` table and the invitation email |
| Email verification and recovery | `signin.html`, `reset.html` | a product-domain sender (`D-4`) |

**Waiting on the database, not on a decision:** the server-side decode count (`F-26`) and the VIN cache
(`F-27`) are wired to `docs/supabase-decode-log-cache-delete.sql`, which has been run. The cache was proved
in Turn 43: a signed-in decode writes the vPIC answer, and the report renders it. **The per-account cloud
storage (`F-28`) is wired to `docs/supabase-user-cloud.sql`, which has not been run yet**: until it is, the
garage and vault pages say so in red and keep recent lookups and the vault in this browser only. **The
owner's "log in as" view (`F-29`) is wired to `docs/supabase-owner-act-as.sql`, also not run yet**:
until it is, the button in the staff console answers honestly and opens nothing. The
licensed parts layer and the European vendor proxy still need contracts.

## Documents

| File | What it is |
|---|---|
| `instructions.md` | The working rules: authority, standards, the placeholder convention, constraints |
| `cardna-fm-plan.md` | The plan and feature registry: status of every feature, its wiring contract, the build order |
| `README.md` | This file: what the product is, publicly |
| `CarDNA-fm-tracker.md` | The turn-by-turn record: decisions, what was verified, what is open |
| `docs/cloud-storage.md` | One account's storage: what is in which table, why it is cheap, and how a paid decode would be charged |
| `AGENT.md` | Superseded by `instructions.md`; kept for history |

## What is deliberately not here yet

The catalogue (assemblies, diagrams, OEM numbers, fitment) is licensed data, not public data. It lands
in a later phase — see `../docs/data-acquisition-plan.md`. The catalogue section on the home page is an
honest explainer with an illustrative drawing, clearly labelled as such; there are no fake part numbers
presented as real.

## Placeholders to replace before launch

- `hello@gmottomotive.com` in `about.html` — swap for the real address.
- Pricing figures on `index.html` and `pricing.html` — modelled in `docs/pricing-feasibility.md`;
  re-run that model when the European vendor contract and the catalogue licence are signed.
- Planned product names on `about.html` (`Shopfloor`, `GMO Data API`, `Parts Index`) are working titles.
- Every item in the planned list above — its status, in `cardna-fm-plan.md` §4.

## Roadmap

0. Frontend complete, every planned feature behind its start icon (`cardna-fm-plan.md` §7, phases P0–P2).
1. Free wiring: waitlist, analytics, recalls, data export, server-side limits.
2. Payments, invoices, seats and email.
3. First catalogue licence → diagrams and OEM numbers behind Pro.
4. Fitment and supersession graph.
5. Retailer feeds for live prices.
6. Workshop tools and a grounded repair assistant.


## More data

`docs/open-data-sources.md` catalogues every open dataset and library found for expanding the
catalogue — generations and engines (gor3a, ODbL), 54k variants (vbalagovic), offline VIN decoders
(cardog/corgi, Wal33D WMI), registration data (ECB/ACEA, UK licensing, Jersey), vehicle image
datasets (VMMRdb, CompCars, Stanford Cars) and part-segmentation data — with the licence consequences
spelled out.

`docs/eu-decoder-integration.md` covers the paid European full-spec layer: published per-lookup
prices (Vincario €0.22–€0.49, CarAPI $299/yr, RapidAPI $69/mo), the signed-request proxy architecture
with a permanent VIN cache, and what it costs at realistic volumes.

`docs/pricing-feasibility.md` is the one-page model behind the plans: the single cost (€0.26 per European
lookup), net profit per plan at typical use and at full quota, overage, the three stingier plan sets it
was chosen over, and why.

`docs/public-apis-free.md` extracts the **Vehicle** category from the public-apis repository (18 APIs,
with auth/CORS and what each is good for) plus adjacent free APIs — recalls, fitment, MOT history,
registrations — and notes that the upstream list carries no quota data.

Maintained by GMOttomotive. CarDNA is part of the company's tools, web apps and websites.
