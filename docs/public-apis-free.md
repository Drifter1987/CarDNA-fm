# Free APIs from `public-apis/public-apis` — the vehicle slice

Source: [github.com/public-apis/public-apis](https://github.com/public-apis/public-apis).

**The full list is now downloaded into the repo, and there is a browser tool that converts it:**

| File | What it is |
|---|---|
| `data/public-apis-README.md` | The complete upstream catalogue — 2,896 lines, ~2,000 APIs, 51 categories |
| `tools/parse-public-apis.html` | Parses it in the browser; shows counts and a preview, and downloads `public-apis.json` / `public-apis.csv` |

Open **`tools/parse-public-apis.html`** on the site (it needs the folder served over http, same as the
rest of the app), press **Download JSON** or **Download CSV**. No Python, no npm, no build step — the
parser is ~120 lines of vanilla JavaScript running on the page.

There is no hosted JSON any more — `api.publicapis.org` no longer resolves — so the README is the
canonical dataset and this tool is the bridge.

Two things to know before the tables:

1. **The list has ~2,000 APIs across 51 categories**, and its columns are **Name · Description · Auth ·
   HTTPS · CORS**. There is **no quota column** — the repo never states rate limits or free-tier
   volumes. Anything below marked *not stated* means exactly that: the limit lives in each provider's
   own docs.
2. **"Vehicle" is a real category**, and it is the one that matters here. It is reproduced in full;
   the second table is a short, hand-picked set from the categories adjacent to this product.

---

## 1. Vehicle — the full category

| API | What it does | Auth | HTTPS | CORS | Quota | Fit for CarDNA |
|---|---|---|---|---|---|---|
| [Auto Body Shop Directory](https://autobodyshopnear.com/developers/body-shop-api) | Find auto body shops by ZIP, city, location or profile | No | Yes | No | not stated | Workshop directory, later |
| [Bike Reliability](https://bikereliability.co.uk/developers) | UK motorcycle reliability ranked by first-time MOT pass rates | No | Yes | Yes | not stated | Niche content / SEO |
| [BoltPatternHQ](https://boltpatternhq.com/mcp/) | Wheel fitment: bolt pattern (PCD), offset, centre bore | No | Yes | Yes | not stated | **Strong** — wheel fitment is a real gap |
| [Brazilian Vehicles and Prices](https://deividfortuna.github.io/fipe/) | Vehicle models and FIPE prices (Brazil) | No | Yes | No | not stated | Brazil market only |
| [CarSpecs](https://carspecsapi.com/docs) | Specs for 70,000+ trims since 1945 + VIN decoder | `apiKey` | Yes | No | not stated (paid tiers) | **Supplier candidate** — trim-level specs |
| [CarVector](https://carvector.io/docs) | Specs, images, recalls, DTC codes, 1925–2029 | `apiKey` | Yes | Yes | not stated | **Supplier candidate** — images + DTC |
| [Helipaddy sites](https://helipaddy.com/api/) | Helicopter/drone landing site directory | `apiKey` | Yes | Unknown | not stated | Irrelevant |
| [Kelley Blue Book](http://developer.kbb.com/#!/data/1-Default) | Vehicle info, pricing, configuration | `apiKey` | Yes | No | not stated (commercial) | Valuation, if you add prices |
| [Mercedes-Benz](https://developer.mercedes-benz.com/apis) | Telematics, remote functions, configurator, dealers | `apiKey` | Yes | No | not stated | Later: connected-car features |
| [NHTSA](https://vpic.nhtsa.dot.gov/api/) | NHTSA Product Information Catalog and Vehicle Listing (vPIC) | No | Yes | Unknown | **no key, no published quota** | **In production** — the decoder's backbone |
| [NHTSA Edge VIN Decoder](https://data.ai-kit.net) | Decodes US VINs offline from the vPIC dataset, from edge locations | No | Yes | Yes | not stated | Alternative to calling vPIC directly |
| [NHTSA Vehicle Recalls](https://rapidapi.com/crisp-point-studio-crisp-point-studio-default/api/live-nhtsa-vehicle-recalls) | Recalls by year/make/model with component, consequence, remedy | `apiKey` | Yes | Unknown | not stated | **Strong** — free recall layer for every vehicle page |
| [ProblemsByVin](https://problemsbyvin.com/data/) | Owner complaints, recalls, failure-mileage stats by make/model/year | No | Yes | Yes | not stated | **Strong** — reliability data |
| [RevCarData](https://revcardata.com) | 86,000+ global vehicle specifications and EV metrics | `apiKey` | Yes | Yes | not stated | **Supplier candidate** — global specs |
| [SalvageAlert](https://salvagealert.com/developers/docs) | IAA/Copart/ GovDeals salvage lots, VIN history, buyer fees | `apiKey` | Yes | No | not stated | Salvage/parts sourcing |
| [Smartcar](https://smartcar.com/docs/) | Lock/unlock, odometer, location for most new cars | `OAuth` | Yes | Yes | not stated | Connected-car, much later |
| [TransparentCars](https://transparent.pt/en/api) | Fair-price valuation and road tax for used cars in Portugal | No | Yes | Yes | not stated | Portugal only |
| [Wheelwise](https://cars.limoja.ai/api/search?q=BMW&limit=1) | UK used-car listings with fair-price grade and resale forecast | No | Yes | No | not stated | Price comparison, UK |
| [WhichTrim](https://whichtrim.com/developers/) | US recalls, complaints, fuel economy, crash ratings, service bulletins, VIN decoding | `apiKey` | Yes | Yes | not stated | **Closest single competitor** — study it |

### What that table tells you

Five entries are worth an evaluation call this month, because each fills a gap CarDNA currently has:
**CarSpecs** (trim-level specs), **RevCarData** (global specs), **WhichTrim** (recalls + TSBs + VIN),
**NHTSA Vehicle Recalls** (free recall layer), **BoltPatternHQ** (wheel fitment). Note that most are
`apiKey` with unpublished pricing — the same pattern as Vincario.

---

## 2. Adjacent categories, hand-picked

| API | Category | What it does | Auth | Quota | Use in CarDNA |
|---|---|---|---|---|---|
| [NHTSA vPIC](https://vpic.nhtsa.dot.gov/api/) | Vehicle | VIN decode + make/model registry | No | no key, no quota | **Live** — decoder |
| [EPA FuelEconomy](https://www.fueleconomy.gov/feg/ws/index.shtml) | Environment | US fuel economy, engine, drive and class by year/make/model | No | free | Not wired yet; good spec enrichment |
| [Data.gov](https://api.data.gov/) | Open Data | US federal open-data catalogue | `apiKey` | free key, per-API limits | Registration, recalls, inspections |
| [Wikidata](https://www.wikidata.org/w/api.php) | Open Data | Structured model/manufacturer taxonomy, CC0 | No | generous, be polite | Already used in the pipeline |
| [Nominatim (OSM)](https://nominatim.org/release-docs/latest/api/Overview/) | Geocoding | Address → coordinates for a workshop finder | No | usage policy, ~1 req/s | Workshop locator |
| [OpenCage](https://opencagedata.com/api) | Geocoding | Commercial geocoding, generous free tier | `apiKey` | 2,500/day free (vendor) | If Nominatim isn't enough |
| [Frankfurter](https://www.frankfurter.app/docs) | Currency Exchange | ECB exchange rates, no key | No | free | EUR/USD part prices |
| [REST Countries](https://restcountries.com) | Open Data | Country metadata, ISO codes | No | free | Country grouping in the catalogue |
| [UK MOT History (DVSA)](https://documentation.history.mot.api.gov.uk/) | Government | MOT tests, mileage, advisories | `apiKey` | free key | **High value** — UK vehicle history |
| [DVLA VES](https://developer-portal.driver-vehicle-licensing.api.gov.uk/) | Government | Registration → make, colour, engine, CO2 | `apiKey` | free tier | UK lookup |
| [ECB CAR dataset](https://data.ecb.europa.eu/data/datasets/CAR) | Finance | New car registrations (ACEA), 1990+ | No | free download | Popularity ranking |

---

## 3. Browsing the other ~1,950

- **Full list:** [github.com/public-apis/public-apis](https://github.com/public-apis/public-apis) — the
  README, 51 categories, `Auth` / `HTTPS` / `CORS` columns only.
- **Searchable mirror:** [publicapis.lol](https://publicapis.lol) — the same data with filters for
  auth, HTTPS and CORS, plus live uptime.
- **No-key only:** [publicapis.lol/no-api-key](https://publicapis.lol/no-api-key) — useful because
  CarDNA is static and anything keyed needs the proxy described in
  `eu-decoder-integration.md`.
- **The repo's own API:** [github.com/davemachado/public-api](https://github.com/davemachado/public-api)
  — so you can query the catalogue programmatically instead of parsing the README.

## 4. Honest summary

The category that matters is **Vehicle**, and it is small: 18 entries, of which maybe five are worth
calling. The rest of the repository is mostly unrelated consumer APIs (anime, quotes, sports). It will
not solve the European-spec problem — nothing free does — but it does surface free **recall,
reliability and fitment** layers that would make CarDNA materially better than a decoder with an empty
second page.
