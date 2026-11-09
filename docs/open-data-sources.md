# Open data sources for vehicle catalogues

Research notes for expanding CarDNA beyond the current 319 brands / 5,601 models. Everything here
was found and read during this session. **Licences are the first column that matters** — two of the
best datasets are share-alike, which changes what you can ship.

---

## 1. Vehicle taxonomies — makes, models, generations, engines

| Source | What's inside | Format | Licence | Use it for |
|---|---|---|---|---|
| **gor3a/vehicle-makes-models** | **164 makes, 2,621 models, 7,169 generations, 30,390 engine variants**, plus raw spec sheets | JSON, CSV, SQLite | **ODbL** (share-alike) | **Merged** — `data/engines.csv`, 30,535 variants served as the generation/engine layer |
| **vehiclesdb/vehiclesdb** — *in use* | 15,068 models / 933 makes / 6 kinds, reconciled from 14 registers | JSON, CSV, Parquet, SQLite | CC BY 4.0 | Current catalogue spine; also has per-country popularity ranks |
| **vbalagovic/cars-dataset** | 54,000+ variants across 370+ brands, 86-item feature lists, EUR prices | JSON, CSV, REST API | Check repo (API is commercial) | Breadth and equipment lists |
| **lifeofcapo/car-api** (`auto-parts-db`) | 100+ brands, 2,000+ models **with generations from 1968**, 1,200+ parts | npm package / JS objects | Check repo | A ready-made JS shape for brands → models → generations → parts |
| **T33R0/ddpc-vehicle-specs** | EPA-sourced autos + 29K motorcycles, 48 typed fields, EV columns (battery, range, kWh/100mi, MPGe) | CSV, JSON | EPA-derived, check repo | Clean typed specs; no editorial text |
| **jmcph4/open-engine-data** | Engine technical specs | JSON/CSV | Check repo | Engine-level detail |
| **abhionlyone/us-car-models-data** | US models 1992–2026 (specs behind a paid tier) | CSV | Mixed | Year coverage; not free end-to-end |
| **serhatkildaci/global-car-models**, **ilyasozkurt/automobile-models-and-specs** | Brand → model lists | CSV, JSON, YAML, SQL | Check repo | Quick cross-checks |
| **Wikidata** | Model taxonomy, production dates, manufacturers | SPARQL | CC0 | Pre-1981 coverage and disambiguation |
| **Kaggle "Global Car Make and Model List"** | Make/model pairs | CSV | Varies per upload | Fast prototyping only |

**Licence trap:** gor3a is **ODbL**. If you merge it into a database you distribute (and a static JSON
catalogue *is* a distributed database), the derived database must be offered under ODbL too. That is a
bigger commitment than CC BY 4.0 — decide deliberately before merging.

---

## 2. Vehicle imagery — for make/model recognition and photos

| Source | What's inside | Format | Licence | Use it for |
|---|---|---|---|---|
| **VMMRdb** (faezetta/VMMRdb) | **9,170 classes, 291,752 images**, models built 1950–2016, labelled make + model + year | Images + labels, Dropbox | Research use (cite CVPRW 2017) | Training a "what car is this" model, or mapping images to your catalogue |
| **Stanford Cars** | 16,185 images, **196 classes** (make/model/year) | Images | Research | Small, clean benchmark |
| **CompCars** | 200,000+ images, 1,716 models, viewpoint annotations | Images | Research | Fine-grained classification |
| **Ultralytics carparts-seg** | 3,833 labelled images, **22 part classes** (bumper, hood, mirror, wheel…), 133 MB | YOLO dataset | **AGPL-3.0** | Teaching the app to recognise a part from a photo (the "camera" feature every parts site wants) |

---

## 3. VIN decoding — open-source libraries

| Library | What it does | Language | Licence | Note |
|---|---|---|---|---|
| **cardog-ai/corgi** | Fully offline VIN decode from a **bundled 23 MB SQLite** version of vPIC | TypeScript | Check repo | ~100 ms; would make CarDNA's decoder work with no network at all |
| **Wal33D/nhtsa-vin-decoder** | API wrapper + **2,015+ WMI codes offline**, manufacturer-specific decoders (Mercedes, Ford, GM, Toyota) | Python, TS, Java, Android | MIT (per badge) | Best starting point for a JS offline decoder |
| **WALL-E/vin-decoder** | WMI CSV data other projects build on | CSV/JS | Check repo | Raw WMI layer |
| **samsullivandelgobbo/vPIC-dl** | Downloads the vPIC database locally | Python | Check repo | Refresh pipeline |
| **way-platform/vin-go** | ISO 3779 / SAE J1044 parsing + OEM-specific rules | Go | Check repo | Standards-correct parsing reference |
| **dmuhia136/obd_vin_decoder** | Offline ISO 3779 decode with NHTSA fallback | Dart | Check repo | Flutter path |
| **NHTSA vPIC** — *in use* | Authoritative API + bulk DB dumps (179 MB MSSQL backup) | REST, SQL | Public domain | Source of truth |

---

## 4. Registration and market data — the demand side

| Source | What's inside | Format | Licence | Use it for |
|---|---|---|---|---|
| **ECB "CAR" dataset (ACEA)** | New passenger car and commercial vehicle registrations, **1990 onward**, euro area + UK/CH/NO/DK/SE | CSV (zipped) | ECB terms (free reuse with attribution) | Market-size and model-popularity signals |
| **ACEA statistics** | Registrations by country and manufacturer | Web tables | Free with attribution | Sanity-checking coverage |
| **Statbel (Belgium)** | Monthly registrations CSV since 2013, new + used, plates | CSV | Open | National popularity |
| **UK vehicle licensing statistics** | Detailed vehicle population CSVs | CSV | OGL | UK parc by make/model |
| **Government of Jersey** | Every registered vehicle: year, **make, model, colour, fuel** | CSV | Open | A complete tiny market — useful as a test set |
| **OECD** | Passenger car registrations indicator | API/CSV | OECD terms | Long-run series |
| **KBA FZ10 (Germany)** | New registrations by make and model series | CSV | DL-DE-BY-2.0 | Germany, the biggest EU market |

---

## 5. Recalls, safety and efficiency — free government layers

| Source | What's inside | Format | Licence |
|---|---|---|---|
| **NHTSA recalls / complaints / safety ratings** | Recalls, complaints, star ratings by year/make/model | REST | Public domain |
| **EPA FuelEconomy** — *in use* | Every US configuration with MPG, engine, drive, class | CSV (zip), API | Public domain |
| **EEA (EU) CO₂ monitoring** | New-car CO₂, mass, power by manufacturer | CSV | Free reuse |
| **DVSA MOT History (UK)** | MOT tests, mileage, advisories per registration | REST, free key | OGL |

---

## 6. Parts data — what genuinely does not exist in the open

| Attempt | Reality |
|---|---|
| **erenulas/CarPartsStoreDatabase** | A relational **schema** for a parts shop, not a dataset |
| **lifeofcapo/car-api** | 1,200+ parts — a demo size, no OEM numbers or fitment |
| **AWS bedrock-agent-carpart-lookup** | A reference architecture, not data |
| **Ultralytics carparts-seg** | Part *images*, not part numbers |
| **Hollander / Part-Interchange** | Paid, licensed interchange |
| **TecAlliance / TecDoc** | Paid, licensed — the real answer |

There is no open OEM catalogue. Diagrams, OEM numbers, supersessions and fitment are licensed assets;
`../docs/data-acquisition-plan.md` covers the acquisition route.

---

## 7. What I would add next, in order

1. **gor3a** for generations + engines — but only after deciding on **ODbL share-alike**. If you are
   not ready to license the whole catalogue that way, use vehiclesdb + your own curated generations.
2. **Wal33D's WMI database** (or cardog/corgi) to make the VIN decoder work **offline**, consistent
   with the "static" promise. This is the highest-value change for the product: no API, no quota.
3. **ECB/ACEA registrations** to rank brands and models by real market popularity instead of
   alphabetical order — a visible quality win on the Brands page.
4. **Ultralytics carparts-seg** only if you build photo → part recognition; note the AGPL.
5. **VMMRdb** only if you build image → vehicle recognition; research licence, so not shippable
   commercially as-is.

---

## 8. Licence cheat-sheet

| Licence | What it means for CarDNA |
|---|---|
| **Public domain** (vPIC, EPA, NHTSA) | Do anything, no credit required (credit is polite) |
| **CC BY 4.0** (vehiclesdb) | Credit + link, visible — already in the footer |
| **ODbL** (gor3a) | Share-alike on the *database*: derived catalogues must be ODbL |
| **AGPL-3.0** (Ultralytics) | Network use counts as distribution; strong copyleft |
| **Research-only** (VMMRdb, CompCars, Stanford Cars) | Fine for models/experiments, not for a commercial product |
| **OGL / DL-DE-BY / ECB terms** | Free reuse with attribution |
| **Commercial** (TecDoc, OEM EPC, Hollander) | Contract required |

Nothing here was scraped; every entry is a repository, government portal or published dataset.


---

## 9. European full-spec decoding — what is actually available

Tested during this session: there is **no free, keyless API that returns full European vehicle
specifications** (model, trim, engine, equipment).

| Option | What it gives | Catch |
|---|---|---|
| **Vincario / vindecoder.eu API** | ~50 fields for European cars: make, model, body, gears, emission standard, brakes, suspension, dimensions, CO2, weights, check digit | **API key required** (free trial, then paid). Requests are signed with a sha1 control sum |
| **Zyla "Europe VIN Decoder"** | Mirror of the above style of data | Key required |
| **MarketCheck** | Basic VIN specs, EU-capable | Key required, per-call |
| **cardog/corgi (offline, 23 MB)** | Fast offline decode | Built from **US vPIC** — no European model data |
| **Wal33D WMI database** | Manufacturer + year offline | WMI only, no model/engine |
| **CarDNA structural decoder** | WMI manufacturer, market region, model year, plant code, serial, check digit | Structural only — cannot know trim or engine |

So the app currently runs two layers: vPIC (US, full detail) and the structural decoder (any market,
identity only). Adding full EU specs means signing up for a key — Vincario's free trial is the
cheapest route — and proxying it, since the signed request should not live in a public static bundle.

**Important nuance about NHTSA error codes:** they are not all failures. CarDNA classifies them:

| Code | Meaning | How the app treats it |
|---|---|---|
| 0 | clean decode | nothing shown |
| 5 | errors in a few VIN positions | blue "Partial decode" note |
| 14 | cannot resolve some characters | blue "Partial decode" note |
| 7 | manufacturer not registered for US sale | blue "Not a US-market vehicle" note |
| 1 | check digit does not calculate | red warning |
| 400 | invalid characters present | red warning |

The first three characters identify the **manufacturer** only. They are never used to decide whether a
VIN is valid — that judgement comes from vPIC's error codes plus the check digit rule, which only
applies to North American VINs.
