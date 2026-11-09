# CarDNA

**A GMOttomotive product.**

CarDNA turns a VIN into the exact vehicle — make, model, year, engine, plant — and is the front door
of GMOttomotive's vehicle-data family. This repository is the public site: static HTML, one stylesheet,
three small vanilla-JS modules, no build step, no dependencies, no backend.

## Run it

The catalogue is loaded from a local JSON file with `fetch`, so it needs to be served over http
(opening `file://` will show a helpful notice instead of the list):

```bash
cd CarDNA
python3 -m http.server 8080
# open http://localhost:8080
```

Deploy by uploading the folder to any static host — Netlify, Cloudflare Pages, S3, nginx.

## Pages

| File | What it is |
|---|---|
| `index.html` | App shell: Overview / Decode VIN / Brands / Catalogue / Pricing as tabs, no page scroll |
| `decode.html` | Full VIN decoder with example VINs, shareable `?vin=` links and recent lookups |
| `makes.html` | 319 car brands grouped by country, every model embedded — opening a brand fetches nothing |
| `pricing.html` | Free / Pro / Workshop tiers and a line-by-line comparison |
| `about.html` | GMOttomotive, principles, data sources, roadmap, contact |
| `garage.html` | Saved vehicles — this browser only, no account |
| `legal.html` | Privacy, terms, data licences and independence notice |

## Assets

| File | Purpose |
|---|---|
| `assets/style.css` | The whole design system: dark blueprint palette, acid-lime accent, mono labels |
| `assets/app.js` | Mobile nav, current year, delegated copy-to-clipboard, and the tab controller (hash-routed, arrow-key navigable) |
| `assets/vin.js` | VIN validation, vPIC decode over the shared 104-field schema, decode warnings, recent lookups in `localStorage`, `?vin=` deep links |
| `assets/vin-schema.js` | The single 104-field VIN schema, shared by the decoder and the comparison tool |
| `tools/vin-compare.html` | Keyless decoder comparison: vPIC, AI Kit Edge, AI Kit Unified, NHTSA recalls — full schema per VIN, plus field-by-field diff |
| `assets/makes.js` | Loads the static catalogue, groups brands by country, instant search across brands and models |
| `assets/garage.js` | Saved vehicles in `localStorage`: save, list, remove, clear — shared by the decoder and `garage.html` |
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

Nothing about the visitor is stored server-side. Recent lookups live in `localStorage` and can be
cleared by clearing site data.

## What is deliberately not here yet

The catalogue (assemblies, diagrams, OEM numbers, fitment) is licensed data, not public data. It lands
in the next phase — see `../docs/data-acquisition-plan.md`. The catalogue section on the home page is
an honest explainer with an illustrative drawing, clearly labelled as such; there are no fake part
numbers presented as real.

## Placeholders to replace before launch

- `hello@gmottomotive.com` in `about.html` — swap for the real address.
- Pricing figures on `index.html` and `pricing.html` — pilot structure only.
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

`docs/public-apis-free.md` extracts the **Vehicle** category from the public-apis repository (18 APIs,
with auth/CORS and what each is good for) plus adjacent free APIs — recalls, fitment, MOT history,
registrations — and notes that the upstream list carries no quota data.

Maintained by GMOttomotive. CarDNA is part of the company's tools, web apps and websites.
