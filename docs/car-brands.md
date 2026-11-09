# Car brands and models — where the list comes from

## Short version

`makes.html` renders **315 car brands and 5,541 models**, grouped by country, entirely from one JSON
file shipped with the site. Opening a brand makes no network request. The data is **VehiclesDB**, an
open catalogue reconciled from 14 national vehicle registries, published under **CC BY 4.0**.

## Why the NHTSA registry is not the brand list

`GetAllMakes` from NHTSA returns **12,423 manufacturers**, which is a regulatory roll, not a brand
list. It includes trailer and trailer-kit builders (the largest group), motorcycle and powersports
makers, bus body builders, incomplete-chassis upfitters, low-speed EV start-ups, coachbuilders and
replica shops — entries like `#1 ALPINE CUSTOMS`, `1/OFF KUSTOMS, LLC` and `102 IRONWORKS, INC.`

Filtering by the `car` vehicle type gives 195 makes and still contains coachbuilders while missing
real marques filed as SUV/MPV (Land Rover, Jeep). Curating by hand worked, but it was editorial and
US-biased.

## The source now used

**VehiclesDB** — https://github.com/vehiclesdb/vehiclesdb — an open dataset reconciled from official
registers in 14 countries:

| Kind | Models | Makes |
|---|---:|---:|
| car | 5,541 | 315 |
| motorcycle | 6,033 | 266 |
| moped | 1,399 | 315 |
| van | 739 | 130 |
| truck | 947 | 95 |
| bus | 409 | 94 |

Files shipped in this repo:

| File | Size | What it is |
|---|---:|---|
| `data/vehicles.csv` | 1.1 MB | The whole catalogue, one row per model (15,068 rows) |
| `data/catalog_car_makes.json` | 66 KB | Make metadata including ISO country codes |
| `data/brands.json` | small | Curated parent-group overlay (Volkswagen Group, Stellantis, Geely…) |

The page fetches all three, filters makes whose `kinds` include `car`, filters each make's models to
`kind === "car"`, and joins the country codes to display names. Parent groups come from the overlay
and are optional: a brand without a match simply shows no parent.

## Licence — attribution is required

CC BY 4.0 requires **visible credit and a link** wherever the data is shown. Every page footer carries:

> Vehicle data by [VehiclesDB](https://vehiclesdb.com) (CC BY 4.0) · VIN: NHTSA vPIC

Do not remove it. The upstream register notices are also listed in the dataset's `ATTRIBUTION.md`;
if you add another country's register data, add its notice too.

## Refreshing the data

Replace the two downloaded files from a newer VehiclesDB release:

```bash
curl -sSLO https://raw.githubusercontent.com/vehiclesdb/vehiclesdb/main/dist/vehicles.csv
curl -sSLO https://raw.githubusercontent.com/vehiclesdb/vehiclesdb/main/catalog/car/makes.json
mv vehicles.csv catalog_car_makes.json CarDNA/data/
```

Nothing else changes: the page reads `kind`, `make_slug`, `make_name`, `model_name` and `countries`
from the CSV, and `countries` from the makes file.

**Use the CSV, not `vehicles.min.json`.** The minified build packs each make as `[slug, name, kinds]`
with no models nested, so a parser written against the pretty JSON silently drops every make — that is
exactly the bug that once left the page showing only the four hand-added marques.

## Limits to know about

- **Model names, not configurations.** "Corolla" is one row. The year/engine/body breakdown is what
  the VIN decoder gives you, and what the licensed catalogue will give you next.
- **Country is the registering market**, not necessarily the marque's origin, and a make can be
  registered in several countries — the page shows the first known one.
- **Coverage varies by market.** The dataset reconciles 14 registers, so a marque sold only outside
  those markets may be absent or thin.
- **VIN decoding is still a live lookup.** The catalogue is static; `decode.html` calls NHTSA vPIC
  because that is a decode service, not a dataset. Everything else works offline once the page loads.


## Additions carried in the catalogue

Four marques the open registers miss are appended **directly to `data/catalog_car_makes.json`** as
ordinary make objects with an extra `models` array. The page merges any make that carries inline
models and is not already in the dataset, so there is no second file and no extra fetch.

| Marque | Country | Models added |
|---|---|---:|
| Koenigsegg | Sweden | 13 |
| Tatra | Czechia | 17 |
| Rimac | Croatia | 4 |
| Maruti Suzuki | India | 26 |

That takes the page from 315 to **319 brands** and from 5,541 to **5,601 models**.

A display-name map in `assets/makes.js` fixes the dataset's spellings:
"De Lorean" → **DeLorean**, "Vinfast" → **VinFast**, "Nio" → **NIO**, "A.m.c." → **AMC**.

To add another marque, append one object to the makes file before its closing bracket:

```json
{
  "id": "zenvo",
  "slug": "zenvo",
  "name": "Zenvo",
  "kinds": ["car"],
  "countries": ["dk"],
  "models": ["ST1", "TSR-S", "Aurora"]
}
```

The `countries` array is ISO 3166-1 alpha-2 and drives the country grouping. Model lists added this
way are hand-curated, so they are nameplates rather than a full production history.



## Generations and engines — the second dataset

The catalogue now has two layers:

| Layer | Source | Licence | File | Size |
|---|---|---|---|---|
| Makes → models | VehiclesDB | CC BY 4.0 | `data/vehicles.csv` | 1.1 MB |
| Generations → engines | gor3a/vehicle-makes-models | **ODbL** | `data/engines.csv` | 5.0 MB |

`engines.csv` carries 30,535 engine variants across 23 columns: make, model, generation,
generation years, body type, engine label, fuel, cylinders, displacement, power, torque,
transmission, drivetrain, 0–100, top speed, economy and dimensions (length/width/height/wheelbase/
weight).

**How it loads:** it is fetched *lazily* the first time a brand is opened, parsed once into a
`make|model` index, and cached in memory for the session. The page never blocks on it — models render
immediately from `vehicles.csv`, then chips gain an engine count and become clickable when the richer
data arrives.

**How it reads:** open a brand → click a model → the panel lists every generation (with year range and
body) and, under each, the engine variants with power, torque, displacement, drivetrain, 0–100 and top
speed.

### Licence: this one is share-alike

ODbL is not attribution-only. Serving a *derived* database built from it obliges you to offer that
derived database under ODbL. CarDNA ships the file unmodified and credits it in every footer, which is
the compliant minimum; if you later merge these rows into a modified catalogue, that merged catalogue
must be ODbL too. Decide before you change the file rather than after.

### Known gaps in the match

gor3a covers 164 makes, VehiclesDB covers 315. The join is on make + model name, so a brand that only
exists in the VehiclesDB set simply shows no generation data — models stay clickable-off rather than
erroring. Marque spelling differences (VW vs Volkswagen, Škoda) mean a few badges will be missing even
where data exists.
