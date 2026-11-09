# Pricing feasibility study

Question: what should CarDNA charge so the plans are sustainable without being greedy?

Method: model the variable cost of every plan (the only real cost is European VIN lookups), then test
margin at full quota use, at typical use, and at scale. All figures in EUR.

---

## 1. Inputs

| Input | Value | Source |
|---|---:|---|
| European decode, vendor price | €0.249 at 1,000 lookups; €0.22 at 5,000 | Vincario published tiers |
| Blended vendor cost | **€0.26** per unique VIN | 70% at €0.249, 30% at €0.22 |
| Infrastructure per decode | ~€0 (Worker + KV free tier) | Cloudflare |
| Fixed infrastructure | ~€80 / year | domain + KV headroom |
| Free-tier abuse exposure | unbounded if quota is generous | this is the risk to price |

US decoding costs nothing at the source (NHTSA vPIC, public domain), so it should never be metered.
The catalogue is static files — free to serve, and it is the acquisition channel.

---

## 2. Plan economics at **full** quota use (worst case)

| Plan | Price | EU decodes included | Cost at full use | Gross margin |
|---|---:|---:|---:|---:|
| Free (old: 25/mo) | €0 | 25 | **€6.50** | **unbounded loss** |
| Free (proposed: 3 once) | €0 | 3 lifetime | €0.78 lifetime | n/a |
| Pro | €9.90 | 10 | €2.60 | **73.7%** |
| Pro (old: 100/mo) | €9.90 | 100 | €26.00 | **−163%** |
| Workshop | €39.00 | 40 | €10.40 | **73.3%** |
| Workshop (old: 500/mo) | €34.90 | 500 | €130.00 | **−272%** |
| Business | €249.00 | 450 | €117.00 | **53.0%** |

The previous quotas (25 free, 100 Pro, 500 Workshop) were **not survivable**: a single heavy Pro user
would cost more than three subscriptions. That is the "too generous" failure mode, and it is why the
price looked arbitrary.

---

## 3. Margin at **typical** use

Consumer behaviour is not full-quota behaviour. Cache hit rates help too: a VIN decoded once is free
forever after, so repeat lookups of the same car cost nothing.

| Plan | Assumed use | Decodes | Cost | Gross margin |
|---|---:|---:|---:|---:|
| Pro | 35% of quota | 3.5 | €0.91 | **90.8%** |
| Workshop | 50% of quota | 20 | €5.20 | **86.7%** |
| Business | 60% of quota | 270 | €70.20 | **71.8%** |

So the plan is **73–74% margin if every customer maxes out**, and **87–91% at normal use**. That is the
band a data product wants: never below 70%, never an obvious rip-off.

---

## 4. Overage pricing

| Plan | Overage | Cost | Margin on overage |
|---|---:|---:|---:|
| Pro | €0.99 | €0.26 | 73.7% |
| Workshop | €0.85 | €0.26 | 69.4% |
| Business | €0.55 | €0.26 | 52.7% |

€0.99 retail against a €0.26 cost is a ~3.8× markup — the same ratio Vincario itself applies between
its 100-pack (€0.49) and 5,000-pack (€0.22). Nothing greedy there; it is the normal wholesale/retail
spread.

---

## 5. LTV, CAC and payback

Assumptions: consumer churn 6%/month, workshop churn 3%/month (B2B sticks), CAC €15 consumer
(content/SEO led) and €150 workshop (sales-assisted).

| Plan | ARPU | GM% (typical) | Monthly gross profit | LTV | LTV / CAC |
|---|---:|---:|---:|---:|---:|
| Pro | €9.90 | 90.8% | €8.99 | **€150** | **10.0×** |
| Workshop | €39.00 | 86.7% | €33.81 | **€1,127** | **7.5×** |
| Business | €249.00 | 71.8% | €178.78 | €5,959 (at 3% churn) | — (sales-led) |

Anything above 3× LTV/CAC is healthy; 7–10× means the price is conservative, not extractive. Payback
is immediate (first month), which matters because there is no free cash to burn.

---

## 6. Break-even

Fixed costs are tiny (≈€680/year including tooling), so break-even is **6 paying customers**. The real
constraint is founder time, not hosting. That argues for a low entry price to build volume rather than a
high price to chase margin.

---

## 7. Revenue scenarios (monthly)

Mix assumed 80% Pro / 18% Workshop / 2% Business.

| Paying customers | Pro | Workshop | Business | MRR | ARR |
|---:|---:|---:|---:|---:|---:|
| 25 | 20 | 4 | 1 | €564 | €6.8k |
| 100 | 80 | 18 | 2 | €1,992 | €23.9k |
| 500 | 400 | 90 | 10 | €9,960 | €119.5k |
| 2,000 | 1,600 | 360 | 40 | €39,840 | €478k |

At a 3–4% free-to-paid conversion (normal for freemium), 100 payers means roughly **2,500–3,300 free
users** — a realistic first-year target for an SEO-led vehicle-data tool.

---

## 8. Competitive anchoring

| Reference | Price | What you get |
|---|---:|---|
| 7zap Garage | €9.99/mo | 200 diagrams/day, masks OEM numbers on free |
| 7zap Pro | €33–39.99/mo | direct VIN access, applicability |
| Vincario | €0.49/lookup (100 pack) → €0.22 (5,000) | European specs per VIN |
| CarAPI | $299/year | VIN decode + 6,000 calls/day |
| **CarDNA Pro** | **€9.90/mo, 10 EU decodes** | unlimited US, whole catalogue, engines |

€9.90 with ~10 European decodes is **cheaper than buying 10 lookups from Vincario directly** (€4.90 at
best price, €2.49 in bulk — so bundled value is modest, but the catalogue and engine data are the real
differentiator). It sits just under 7zap's €9.99 while giving away more on the free tier.

---

## 9. Recommended pricing

| Plan | Price | Included | Rationale |
|---|---:|---|---|
| **Free** | €0 | Unlimited US decode, all 319 brands / 5,601 models / 30,535 engines, 1 vehicle, **3 EU decodes once** | Acquisition engine; caps lifetime EU exposure at €0.78 per user |
| **Pro** | **€9.90/mo · €99/yr** | 10 EU decodes/mo, 5 vehicles, PDF/CSV export, recalls | 74% margin at full use |
| **Workshop** | **€39/mo · €390/yr**, 3 seats | 40 EU decodes/mo, 25 vehicles, bulk CSV, API key | 73% at full use, B2B pricing |
| **Business** | **from €249/mo** | 450 EU decodes/mo, unlimited seats, SLA, invoice | Volume buyers at €0.55/decode |

**Why not cheaper:** below €9.90 the EU quota has to drop under 10 to keep margin, which makes the paid
tier feel pointless against free.
**Why not dearer:** without the parts catalogue you cannot charge 7zap's Pro money (€33+); €9.90 is the
ceiling of credibility until diagrams and fitment exist.

---

## 10. Risks that move these numbers

1. **Free-tier abuse.** Every free EU decode is a cash cost. Keep it to a one-time trial and require a
   vehicle save or an account before the second one.
2. **Vendor price change.** If Vincario raises prices, overage absorbs it; quotas would shrink.
3. **Cache hit rate.** Repeat VINs are free. Instrument unique-vs-total decode ratio; above 40% repeats
   the margin assumptions improve.
4. **Workshop behaviour.** A shop doing 200 unique EU cars a month must be pushed to Business, not
   allowed to sit on Workshop. Overage at €0.85 does that naturally.
5. **Currency.** Vendor prices are EUR; if you sell in GBP/USD, add a 3–5% FX buffer.
