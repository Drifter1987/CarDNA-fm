# EU VIN decoding — licence cost and integration

CarDNA currently runs two layers: NHTSA vPIC (US, full detail) and a structural decoder (any market,
identity only). Adding **full European specifications** means paying for a data source. Here is what
that costs and how the integration works.

---

## 1. Prices (verified from vendor pages, 2026)

### Vincario / vindecoder.eu — the practical choice

| Volume (VIN lookups, prepaid) | Price per lookup | Total |
|---|---|---:|
| 100 | €0.49 | €49 |
| 500 | €0.298 | €149 |
| 1,000 | €0.249 | €249 |
| 5,000 | €0.22 | €1,100 |
| 10,000+ | custom | — |

- **3 free lookups per month**, no card, to build against.
- **Invalid or unrecognised VINs are not charged** — important, because EU VINs fail often.
- Rate limit **60 lookups/minute** on the top plan.
- Monthly quota; overage billed at the same per-lookup price; no annual billing; 1-month minimum.
- Returns ~50 fields: make, model, body, series, drive, fuel, gears, emission standard, brakes,
  suspension, dimensions, wheelbase, weights, CO2, check digit, sequential number.

### Other providers, for comparison

| Provider | Published price | Note |
|---|---|---|
| **RapidAPI VIN decoder** | **$69/month, up to 3,000 decodes** | Cheap fixed cost, variable data quality |
| **CarAPI Premium** | **$299/year**, VIN decode included, 6,000 calls/day | Absurdly cheap per call if coverage holds — worth a trial |
| **MarketCheck** | $749/month + usage | Enterprise |
| **VehicleDatabases** | $100–$2,500 packs ($0.05–$0.25/credit) | Volume dependent |
| **Vincario subscriptions** | $49–$1,099/month | Higher tiers than prepaid |

**Reality check:** €0.22–€0.49 per decode is the market rate. Consumer pricing (Pro at €9/month) only
works if a user decodes a handful of cars — which is exactly why the cache below matters.

---

## 2. How the integration works

The API is a **signed GET**:

```
https://api.vincario.com/3.2/{apiKey}/{controlSum}/decode/{VIN}.json
controlSum = first 10 chars of sha1("VIN|decode|apiKey|secretKey")
```

Because the secret is part of the URL, **the request cannot be made from the browser** — the key would
be public and the endpoint is not CORS-open. CarDNA needs a thin proxy:

```
static site  ──fetch──▶  /api/vin/{VIN}   (serverless function or Worker)
                              │  signed request, key in env vars
                              ▼
                        api.vincario.com
                              │
                        KV cache (permanent, VIN never changes)
```

### Cloudflare Worker sketch

```js
async function sha1(text) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export default {
  async fetch(request, env) {
    const vin = (new URL(request.url).searchParams.get("vin") || "").toUpperCase();
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
      return Response.json({ error: "invalid vin" }, { status: 400 });
    }

    const cached = await env.VIN_CACHE.get(vin);
    if (cached) return Response.json(JSON.parse(cached), { headers: { "x-cache": "hit" } });

    const sum = (await sha1(`${vin}|decode|${env.VI_KEY}|${env.VI_SECRET}`)).slice(0, 10);
    const upstream = await fetch(
      `https://api.vincario.com/3.2/${env.VI_KEY}/${sum}/decode/${vin}.json`,
      { headers: { Accept: "application/json" } }
    );
    if (!upstream.ok) return Response.json({ error: "upstream" }, { status: 502 });

    const text = await upstream.text();
    await env.VIN_CACHE.put(vin, text, { expirationTtl: 60 * 60 * 24 * 365 });
    return Response.json(JSON.parse(text), { headers: { "x-cache": "miss" } });
  }
};
```

### Client side (small change in `assets/vin.js`)

```js
// only for non-North-American VINs, or when vPIC returns almost nothing
if (structural.region !== "North America" || Object.keys(fields).length < 3) {
  const res = await fetch(`/api/vin/${vin}`);
  if (res.ok) {
    const eu = await res.json();
    // map eu.decode[] labels onto the same 104-field schema, then re-render
  }
}
```

The structural decode stays as the **offline fallback**: if the proxy is down or the quota is spent,
the user still gets manufacturer, year and plant instead of an error.

---

## 3. What it costs in practice

| Scenario | Unique decodes/month | At €0.249 | At €0.22 |
|---|---:|---:|---:|
| Pilot / testing | 100 | €25 | — |
| Early users (5k lookups, 60% unique) | 3,000 | €747 | €660 |
| Growth (20k lookups, 60% unique) | 12,000 | custom | ~€2,640 |

Two levers cut this hard:

1. **Cache every VIN permanently.** A VIN never changes, so a cache hit is free forever. A parts site
   sees heavy repeat traffic on the same vehicles.
2. **Only call EU when needed.** North American VINs already resolve through vPIC for free; the
   structural decoder tells you the region before you spend a cent.

With those two, a consumer product can sit comfortably under €100/month for a long time.

---

## 4. Recommendation

1. **Start with Vincario's 3 free lookups** and their 100-pack (€49) to validate coverage on real
   European VINs — particularly Audi/BMW/Mercedes/PSA/Renault.
2. **Trial CarAPI's $299/year** in parallel; if its European data holds up it is an order of magnitude
   cheaper at volume.
3. Build the proxy + KV cache **before** going live, not after — the cache is the whole business case.
4. Keep the static site as the free layer. EU full specs become a **Pro** feature, which finally gives
   the €9 tier something it costs money to provide.

## 5. Compliance notes

- Store the EU result with a `source` and `fetched_at` column so you can prove provenance and expiry.
- Do not resell raw API responses as your own database; check the vendor's terms on storage and
  redistribution.
- GDPR: a VIN is not personal data on its own, but do not join it to registration or owner data.


---

## 6. Using "100 free decoders" — what is possible and what is not

There are indeed dozens of free VIN sites and iOS apps. Two very different ideas hide behind
"link them to our app":

### 6a. Linking *out* (fine)

A "decode elsewhere" list — deep links to other free decoders — is legal, cheap and even useful as a
trust signal: it tells the user you are not holding their VIN hostage. It brings no data back, only
goodwill and SEO. If you build it, keep it collapsed and clearly secondary.

### 6b. Using their free trials as your backend (not viable)

Every free tier is **per account, per user**, not a resale licence. Pooling 100 free accounts to feed
your app means:

- **Breach of contract** — every one of those terms of service forbids automated, commercial or
  redistributive use of a free consumer tier.
- **Account fraud** — opening many accounts to exceed a per-user quota is the textbook definition,
  and providers fingerprint devices, IPs and payment instruments to detect it.
- **No rights to the data** — even where the decode is free, storing and redistributing the *result*
  is licensed separately. Without a licence you own nothing you can build a product on.
- **It breaks constantly** — trials expire, quotas tighten, CAPTCHAs appear, APIs change without
  notice. You would be building a business on a foundation designed to stop exactly this.
- **Legal exposure** — contract, and in some jurisdictions computer-misuse and interference claims.

Scraping those apps' UIs is the same problem with extra steps: the data is behind a login or a trial
wall, so it is access-control circumvention, not public data.

### 6c. What "free at the source" actually gives you

| Source | Cost | Limits | Usable in production? |
|---|---|---|---|
| NHTSA vPIC | Free | No key, no quota | **Yes** — already the backbone |
| Structural WMI decode (offline) | Free | Identity only | **Yes** — already shipped |
| Wikidata, KBA, EPA, DVSA, DVLA | Free | Per-source | Yes, with attribution |
| Vincario free tier | Free | **3 lookups/month** | Development and QA only |
| Cardog/corgi (open source) | Free | US data, 23 MB bundle | Yes, offline US |
| Wal33D WMI database | Free | Manufacturer + year | Yes |
| Free tiers of RapidAPI/CarAPI/MarketCheck | Free or cheap | Per-account, non-redistributive | Only under their paid terms |

### 6d. The legitimate multi-provider pattern

```
VIN ──▶ structural decode (free, offline)
          │
          ├── North America ──▶ vPIC (free, unlimited)
          │
          └── elsewhere ──▶ cache ──▶ provider waterfall
                                    1. cheapest licensed provider
                                    2. next, only if 1 has no record
                                    (each with its own quota + budget guard)
```

Rules that keep it legal and cheap:

1. **One account per provider**, key in a proxy, quotas respected programmatically.
2. **Budget guard** per provider so a traffic spike cannot blow the month.
3. **Permanent cache** keyed by VIN — pay once per vehicle, ever.
4. **Only call paid providers** when the free layers cannot answer.
5. **Attribute** wherever the licence asks (CC BY, ODbL).
6. **Never** present another service's trial output as your own database.

The honest summary: free decoders are free *for a person decoding their own car*. They are not a free
data feed. The way to compete with them is to be better on the free layer (unlimited identity, no
account, full field schema) and to charge only where the data genuinely costs money.
