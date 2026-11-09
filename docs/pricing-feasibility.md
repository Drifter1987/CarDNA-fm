# Pricing feasibility study

What CarDNA should charge, and what each plan actually earns. All figures in EUR, per customer, per
month.

## 1. The only real cost

European lookups are bought at **€0.26 each** (blended: €0.249 at 1,000, €0.22 at 5,000). US decoding
(NHTSA vPIC) and the static catalogue cost nothing per use, and hosting is about €7 a month in total. So:

**net profit = price − €0.26 × European decodes used**

## 2. Net profit per plan

Typical use assumes 35% (Pro), 50% (Workshop) and 60% (Business) of the quota. Full quota is the worst
case, where the customer maxes the plan out.

| Plan | Price / month | EU decodes | Net profit, typical month | Net profit, full quota | Margin typical / worst |
|---|---:|---:|---:|---:|---:|
| Free | €0 | 3, once | −€0.78 once | — | — |
| Pro | €9.90 | 10 | **€8.99** | **€7.30** | 91% / 74% |
| Workshop | €39.00 | 40 | **€33.80** | **€28.60** | 87% / 73% |
| Business | €249.00 | 450 | **€178.80** | **€132.00** | 72% / 53% |

That is the whole business — there is no other variable cost. At scale, 100 paying customers
(80 Pro, 18 Workshop, 2 Business) net about **€1,685 a month**; 500 net about **€8,400 a month**.

## 3. Overage

| Plan | Price per EU decode | Net profit |
|---|---:|---:|
| Pro | €0.99 | €0.73 |
| Workshop | €0.85 | €0.59 |
| Business | €0.55 | €0.29 |

## 4. Three stingier mindsets

The same plans on less generous terms. Net profit is for a typical month.

| Mindset | Pro | Workshop | Business |
|---|---|---|---|
| **A — less generous** | €11.90 · 6 EU · net €11.35 | €45 · 25 EU · net €41.75 | €329 · 300 EU · net €282.20 |
| **B — lesser generous** | €14.90 · 5 EU · net €14.45 | €59 · 20 EU · net €56.40 | €449 · 200 EU · net €417.80 |
| **C — least generous** | €19 · 3 EU · net €18.73 | €79 · 12 EU · net €77.44 | €649 · 100 EU · net €633.40 |

Free is one decode once under A, and none at all under B and C.

## 5. Why not go stingier

Net profit per customer rises all the way to C. That is the trap:

- **The customer can check the price.** C sells at €6.33 a lookup; the same data costs €0.49 direct from
  Vincario.
- **Free is the demonstration.** Take European data out of free and the reason to upgrade goes with it:
  conversion falls from ~3.5% to ~1.2% and Pro churn rises from 6% to 15% a month.
- **The free sample is cheap.** Three decodes cost €0.78 once, about 5% of a €15 acquisition cost.

Those roughly cancel the margin gain. At 3,000 free users, A nets about €2,000 a month, the recommended
set €1,770, B €1,800 and C €1,500.

## 6. Recommendation

Free: unlimited US, the whole catalogue, 3 European decodes once. Pro €9.90/mo or €99/yr, 10 EU decodes.
Workshop €39/mo or €390/yr, 40 EU decodes, 3 seats. Business from €249, 450 EU decodes. Break-even is six
paying customers.

A is the one defensible experiment if the free sample has to shrink. Otherwise keep the quotas as the
lever and the prices where they are.
