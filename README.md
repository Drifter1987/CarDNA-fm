# CarDNA

**A GMOttomotive product.**

CarDNA turns a VIN into the exact vehicle — make, model, year, engine, plant — and is the front door
of GMOttomotive's vehicle-data family. This repository is the public site: static HTML, two stylesheets,
a handful of small vanilla-JS modules, no build step, no dependencies, no backend.

## Run it

The catalogue is loaded from a local file with `fetch`, so it needs to be served over http
(opening `file://` will show a helpful notice instead of the list). Any static file server works:

```bash
cd CarDNA
npx serve .
# open the address it prints
```

In FreeMilk, **Run** does this for you and publishes the folder to its preview link. Deploy by
uploading the folder to any static host — Netlify, Cloudflare Pages, S3, nginx.

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
| `admin.html` | Owner console: account list, plan grants, suspension |
| `vault.html` | Private vault: a VIN list encrypted with a pass phrase in this browser, exportable as an encrypted file |
| `legal.html` | Privacy, terms, data licences and independence notice |

## Assets

| File | Purpose |
|---|---|
| `assets/style.css` | The whole design system: dark blueprint palette, acid-lime accent, mono labels |
| `assets/app.js` | Mobile nav, current year, delegated copy-to-clipboard, and the tab controller (hash-routed, arrow-key navigable) |
| `assets/supabase-config.js` | Project URL and the publishable key. Only those two — never a secret key or a database password |
| `assets/auth.js` | Accounts over the Supabase REST API: sign-in, sign-up, session refresh, profile (plan and role), the sign-in gate, and the account chip in the header |
| `assets/admin.js` | Owner console: stats, account list, plan changes and suspension |
| `assets/export.js` | Full-record export: Markdown, CSV, a real .xlsx (merged sheet + one sheet per model, written without a library) and print-to-PDF |
| `assets/motion.css` | Motion layer: entry reveals, panel and tab transitions, pointer spotlight, button sheen, the animated parts diagram and the VIN scan. Inert unless `motion.js` runs |
| `assets/motion.js` | Scroll reveals with stagger, counting stats, tab transitions, a pointer-tracked card glow and the 17-slot VIN scan that runs while a decode is in flight. Returns immediately when the visitor prefers reduced motion |
| `assets/vin.js` | VIN validation, vPIC decode over the shared 104-field schema, decode warnings, recent lookups in `localStorage`, `?vin=` deep links |
| `assets/vin-schema.js` | The single 104-field VIN schema, shared by the decoder and the comparison tool |
| `tools/vin-compare.html` | Keyless decoder comparison: vPIC, AI Kit Edge, AI Kit Unified, NHTSA recalls — full schema per VIN, plus field-by-field diff |
| `assets/makes.js` | Loads the static catalogue, groups brands by country, instant search across brands and models |
| `assets/garage.js` | Saved vehicles in `localStorage`: save, list, remove, clear — shared by the decoder and `garage.html` |
| `assets/vault.js` | Private vault: PBKDF2-SHA256 key derivation, AES-256-GCM encryption, VIN parsing and encrypted import/export — see below |
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
and a role; the vehicle data you decode is still sent straight from the browser to NHTSA. Recent
lookups, the garage and the vault stay in `localStorage`.

## Private vault

There is no database. Everything the browser keeps is in `localStorage`, per device:

- `cardna.recent` — the last six VINs you decoded
- `cardna.garage` — vehicles you saved
- `cardna.vault` — your encrypted VIN list

`vault.html` encrypts that list with AES-256-GCM, the key derived from your pass phrase through
PBKDF2-SHA256 (210,000 iterations, random salt and IV). Only the cipher text is written; the pass
phrase is never stored. "Download encrypted file" saves the same cipher text as JSON and "Load an
encrypted vault file" reads it back, so the list survives clearing the browser. There is no recovery
if the phrase is lost.

Plain VIN lists never belong in this repository — `.gitignore` excludes `private/`, `*.cardna` and
exported `cardna-vault-*` / `cardna-vins-*` files.

## What is deliberately not here yet

The catalogue (assemblies, diagrams, OEM numbers, fitment) is licensed data, not public data. It lands
in the next phase — see `../docs/data-acquisition-plan.md`. The catalogue section on the home page is
an honest explainer with an illustrative drawing, clearly labelled as such; there are no fake part
numbers presented as real.

## Placeholders to replace before launch

- `hello@gmottomotive.com` in `about.html` — swap for the real address.
- Pricing figures on `index.html` and `pricing.html` — modelled in `docs/pricing-feasibility.md`;
  re-run that model when the European vendor contract and the catalogue licence are signed.
- Planned product names on `about.html` (`Shopfloor`, `GMO Data API`, `Parts Index`) are working titles.

## Roadmap

1. Garage / saved vehicles (client-side first, then accounts).
2. First catalogue licence → diagrams and OEM numbers behind Pro.
3. Fitment and supersession graph.
4. Retailer feeds for live prices.
5. Workshop tools and a grounded repair assistant.

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
