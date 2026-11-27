# cardna-fm-plan.md — what CarDNA-fm is and what gets built

The build plan and feature registry. `instructions.md` says **how** to work; this file says **what** to
build, in what order, and exactly where each feature becomes real. When the two disagree about process,
`instructions.md` wins; about scope, this file is the record.

---

## 1. The product

CarDNA turns a VIN into the exact vehicle and keeps what you find. One account, four work surfaces:
the decoder, the garage, the vault, and the staff console. The public front door is the decoder; the
catalogue (319 brands, 5,601 models, 30,535 engine variants) is served as static files and makes no
network request; the parts layer, the European data and the paid plans are the licensed, metered part.

**Positioning that constrains every decision:** knowing what car you own is free; the data that costs us
money is metered and never blocks a paid user mid-task.

## 2. The standard

Frontend complete, backend wired later, per `instructions.md` §3. Concretely, for this app:

- A signed-out visitor, a Free user, a Pro user, a Workshop technician and a Business admin each see a
  complete, coherent interface — including the features their plan does not include.
- Every paid surface shows its locked state, its price line, and its path forward.
- Every not-yet-wired feature is finished in layout, copy, states and data shape, and carries the start
  icon of `instructions.md` §4.
- Going live for any feature changes one flag and one function body. It never changes a class name, a
  layout, or a sentence of copy.

## 3. Plans and entitlements — one source of truth

`PLAN_LIMITS` in `assets/auth.js` is authoritative. This table mirrors it; both change together.

| Capability | Free | Pro | Workshop | Business | Enforced today |
|---|---|---|---|---|---|
| Price | €0 | €9.90/mo · €99/yr | €39/mo · €390/yr | from €249/mo | shown only (no checkout) |
| VIN decodes | 3 in total, US or EU | US unlimited · 10 EU/mo | US unlimited · 40 EU/mo | US unlimited · 450 EU/mo | Free yes (client); EU no |
| Extra EU decodes | — | €0.99 each | €0.85 each | €0.55 each | no |
| Saved vehicles | 1 | 5 | 25 | unlimited | yes (app + DB trigger) |
| Brands, models, engines | all | all | all | all | yes |
| European full spec | counts toward the 3 | 10/mo | 40/mo | 450/mo | **not wired** |
| Recalls and complaints | — | included | included | included | **not wired** (data is free) |
| Exports | Md | + CSV, PDF | + XLSX | + XLSX | yes |
| Bulk VIN upload | — | — | CSV | CSV + API | **not built** |
| API key | — | — | yes | yes | **not built** |
| Seats | 1 | 1 | 3 | unlimited | **not built** |
| Invoice billing / SLA | — | — | — | yes | **not built** |

Roles: `user` (the app), `admin` (manage users, grants up to Workshop), `owner` (everything, grants up to
Business, changes roles). The database default role string is `member`, which the app normalises to
`user` — never reintroduce a third string.

## 4. Feature registry

`Status` is one of **live**, **live (limited)** (works, with a known ceiling such as the default
mailer), **frontend-only** (built, unwired, flagged), or **not started**. A feature ID never changes.
Each row's `Flag` is the key in `CarDNAPreview.flags` (`instructions.md` §4); a live feature has no
flag. Every flagged feature carries the badge text **"Coming soon"**, decided by the Boss in Turn 29, so
the wording is the same on every surface.

| ID | Feature | Surface | Status | Flag |
|---|---|---|---|---|
| F-01 | US VIN decode, 104-field vPIC result | `decode.html`, index tab | live | — |
| F-02 | European structural decode fallback (WMI, year, plant) | `decode.html` | live | — |
| F-03 | Catalogue browse and search | `makes.html`, index tab | live | — |
| F-04 | Garage: save, sync, retry queue, undo | `garage.html`, decoder | live | — |
| F-05 | Private vault, AES-256-GCM | `vault.html` | live | — |
| F-06 | Exports: MD, CSV, PDF, XLSX | `garage.html` | live | — |
| F-07 | Accounts, roles, plans, profile polling | all | live | — |
| F-08 | Free limits: 3 decodes, 1 vehicle | decode, garage | live | — |
| F-09 | Pricing page and comparison table | `pricing.html`, index | live | — |
| F-10 | Staff console: grants, blocking, activity | `admin.html` | live | — |
| F-11 | Theme toggle, reduced motion, keyboard tabs | all | live | — |
| F-12 | Checkout and plan purchase | pricing, app-wide upgrade entry | frontend-only | `payments` |
| F-13 | European full-spec decode (vendor proxy) | `decode.html` | frontend-only | `euDecode` |
| F-14 | Overage billing per extra EU decode | pricing, garage, decode | frontend-only | `overage` |
| F-15 | Licensed parts catalogue: diagrams, OEM numbers, fitment | `index.html` Catalogue tab | frontend-only | `parts` |
| F-16 | Recalls and complaints on a vehicle | `decode.html`, exports | live | — |
| F-17 | Bulk VIN upload (CSV) | `garage.html` | frontend-only | `bulkUpload` |
| F-18 | Customer API key and API | `garage.html`, admin | frontend-only | `apiKeys` |
| F-19 | Seats and team invitations | `garage.html`, admin | frontend-only | `seats` |
| F-20 | Invoice billing, annual terms, SLA | `pricing.html`, admin | frontend-only | `invoices` |
| F-21 | Email verification and password recovery | `signin.html`, `reset.html` | live (limited: default mailer) | — |
| F-22 | Waitlist / pilot capture | `pricing.html`, `about.html` | live | — |
| F-23 | Public shareable VIN report | `decode.html` → `report.html?vin=<vin>` | live (limited) | — |
| F-24 | Owner analytics dashboard | `admin.html` | live | — |
| F-25 | Self-serve data export and account deletion | `garage.html` | live (limited: deletion untested, owner refused in SQL) | — |
| F-26 | Server-side entitlement check (decode count) | invisible | SQL ready (`docs/supabase-decode-log-cache-delete.sql`); client wiring next | — |
| F-27 | Server-side VIN cache (`decode_cache`) | invisible | live: vPIC answers are read from and written to `decode_cache.payload` by `assets/vin.js` for signed-in decodes; the report reads it. Proved in Turn 43 (a signed-in decode filled the cache and the report rendered it). | — |
| F-28 | One account's cloud storage (`cardna_cloud`) | `garage.html`, `vault.html` | live: `assets/cloud.js` mirrors recent lookups and the vault ciphertext per account, queues an offline change and states honestly when the table is missing. Saved vehicles were already per account in `vehicles`. `docs/supabase-user-cloud.sql` has been run and the garage and vault pages confirm it. Design, cost and the metering answer: `docs/cloud-storage.md`. | — |
| F-29 | Owner's "log in as" view of one account (`cardna_act_as`) | `admin.html` | live and verified in the browser (Turn 47): `assets/actas.js` and a button that only the owner account sees (the database refuses anyone else by role **and** address), showing that account's profile, plan, cars, recent lookups, encrypted vault and decode count **read-only**, with a banner and a way back. Each use is written to `events` as `act_as` / `act_as_end`. It is not a Supabase session: that needs the service-role key on a server (`D-15`). `docs/supabase-owner-act-as.sql` has been run. | — |

### 4.1 Where the icon stands today

The module (`assets/preview.js`) and the style (`.preview-flag`) are built and loaded on all fourteen
pages, so placing a badge is now one span and nothing else. P1 placed nine of them:

| Page | Flag | Marks |
|---|---|---|
| `pricing.html` | `payments` | the four plan cards — nothing can be bought online yet |
| `pricing.html` | `euDecode` | the Pro card's bullet list (the European allowance) |
| `pricing.html` | `bulkUpload` | the Workshop card's bullet list |
| `pricing.html` | `invoices` | the Business card's bullet list |
| `pricing.html` | `overage` | the per-lookup overage paragraph |
| `pricing.html` | `waitlist` | the "Nothing is charged yet" band |
| `index.html` | `parts` | the Catalogue tab |
| `index.html` | `payments` | the Pricing tab |
| `decode.html` | `parts` | the "What we do not show" notice |

### 4.2 Placed in P2 — the surfaces behind the flags

Built in Turn 31, each with its badge, its states and a module that already returns the final shape:

| Page | Flag | Surface | Module |
|---|---|---|---|
| `garage.html` | `bulkUpload` | Bulk VIN upload: a real CSV parse and per-row validation, then an honest "not connected" | `assets/bulk.js` |
| `garage.html` | `apiKeys` | API key panel, Workshop and Business only | `assets/api.js` |
| `garage.html` | `seats` | Team seats: invitation field, gated by `PLAN_LIMITS[plan].seats` | `assets/team.js` |
| `garage.html` | `gdpr` | Data export and account deletion with a typed confirmation | `assets/account.js` |
| `pricing.html` | `waitlist` | The waitlist panel; the paid cards' buttons fill it in — **now live**, so its badge is hidden | `assets/waitlist.js` |
| `pricing.html` | `payments` / `overage` / `invoices` | Checkout entry on each paid card, through the billing module | `assets/billing.js` |
| `decode.html` | `recalls` | Recalls and complaints: a VIN field and the campaign list it returns — **now live**, so its badge is hidden | `assets/vehicle.js` |
| `decode.html` | `shareReport` | The shareable report: a link to `report.html?vin=…`, built by `assets/report.js`, rendered by `assets/report-view.js` from `decode_cache` |

The runtime is `assets/surfaces.js`: one `<div class="surface" data-surface data-call data-needs>` per
panel, one `[data-arg]` per argument, one `[data-surface-run]` per action, and the states (locked,
working, not-connected, done, error) are decided in one place. A lower plan sees the locked sentence
before pressing anything, from `data-needs`, which reads `PLAN_LIMITS` through `CarDNAAuth.limitsNow()`.

**Every flag now has a surface** except `euDecode`, whose home is the European block inside the decode
result and which therefore carries its badge on the Pro card until F-13's vendor exists. `recalls` is the
first flag to be turned off: it went live in Turn 33 (vPIC decode for make/model/year, then NHTSA's recall
query), and its badge disappeared because `CarDNAPreview.flags.recalls` is now `true` — the mechanism
working exactly as §4 of `instructions.md` promises.

## 5. Wiring contracts

Each contract is the whole job of going live. Implement the function, set the flag to `true`, delete
nothing else. Data shapes are final now; the view must not change when the real answer arrives.

### F-12 · Checkout and plan purchase — `payments`

- **Entry points:** pricing cards, the "Upgrade to save more vehicles" link, the "Upgrade to keep
  decoding" wall, the console's manual grant.
- **Module:** `assets/billing.js` exposes `window.CarDNABilling` →
  `startCheckout(planId, interval)` returning `{ ok, url, error }`, and `portalUrl()`.
- **Placeholder behaviour:** `startCheckout` resolves `{ ok:false, error:"preview" }`; the view then
  shows the waitlist state (F-22), never an error tone.
- **Backend:** Stripe Payment Links or Checkout Session; a `billing-webhook` edge function verifies the
  signature and writes `profiles.plan`, `profiles.plan_interval`, `profiles.renews_at`, and an `events`
  row of kind `billing`.
- **Secret:** `STRIPE_SECRET_KEY` in the edge function environment, never in the repository.
- **Done when:** a test-mode purchase moves an account from Free to Pro and the app shows it within one
  poll (60 s) or on reload.

### F-13 · European full-spec decode — `euDecode`

- **Entry point:** the European specifications block of the decode result, and the export.
- **Module:** `window.CarDNAEuDecode.lookup(vin)` → `{ ok, fields, source, cached, remaining }`.
- **Placeholder behaviour:** returns `{ ok:false, error:"preview" }`; the block renders its unavailable
  state with the start icon and the plan's allowance, never an empty table.
- **Backend:** `eu-decode` edge function with the vendor request signed server-side; permanent cache in
  `public.decode_cache` (see F-27); entitlement and quota decrement in the same transaction.
- **Cost:** €0.22–€0.49 per lookup — see `docs/pricing-feasibility.md` and
  `docs/eu-decoder-integration.md`.
- **Done when:** a cached VIN costs nothing, a fresh one decrements the plan's EU allowance, and an
  exhausted quota offers overage (F-14) rather than a wall.

### F-16 · Recalls and complaints — `recalls`

- **Entry point:** a panel on `decode.html`, and the exported record.
- **Module:** `window.CarDNAVehicle.recalls({ vin })` → `{ ok, recalls:[{ campaign, component, summary, remedy, date }] }`.
- **Placeholder behaviour:** validates the VIN, then answers `{ ok:false, error:"preview" }` with the reason.
- **Cost:** none — NHTSA's public API, already used in `tools/vin-compare.html`.
- **Done when:** a VIN with a recall shows it, a VIN without shows the empty state, and the export
  carries the same list. All three now hold: the panel is live (Turn 33), every campaign is listed and
  folded to one line (Turn 43), and every export — Markdown, CSV, XLSX and the print-to-PDF view —
  carries a Recalls section, looked up during `prepare()` in `assets/export.js` (Turn 36).

### F-15 · Licensed parts catalogue — `parts`

- **Entry point:** the Catalogue tab, and a "parts for this VIN" block on the decode result.
- **Module:** `window.CarDNAParts.forVin(vin)` → `{ ok, assemblies:[…], diagrams:[…], partNumbers:[…] }`.
- **Placeholder behaviour:** the honest explainer already on the home page, marked with the start icon,
  with a waitlist link. There are no invented part numbers anywhere, ever.
- **Backend:** a licensed dataset served as static JSON behind the plan gate, or an edge function if the
  licence forbids bulk distribution.
- **Done when:** a licensed guide resolves a VIN to assemblies and the licence terms are recorded in
  `README.md` and `legal.html`.

### F-17 · Bulk VIN upload — `bulkUpload`

- **Entry point:** `garage.html`, Workshop and Business only.
- **Module:** `window.CarDNABulk.upload(file)` → `{ ok, accepted, rejected:[{ vin, reason }] }`.
- **Placeholder behaviour:** the file picker accepts a CSV, reports a preview of what *would* happen,
  and stops with the locked state.
- **Backend:** none needed — parse in the browser, then the existing garage `submit()` path per VIN.
- **Done when:** a 50-row CSV lands in the account with per-row rejections named.

### F-18 · Customer API key — `apiKeys`

- **Entry point:** `garage.html` and the console, Workshop and Business only.
- **Module:** `window.CarDNAApi.key()` → `{ ok, key, created, lastUsed }`.
- **Backend:** `api_keys` table (hashed key, owner, plan, scopes) and an `api-gateway` edge function
  enforcing the same entitlement rule as the app.
- **Done when:** a key decodes a VIN and the call appears in `events`.

### F-19 · Seats and invitations — `seats`

- **Entry point:** `garage.html` team panel, console.
- **Module:** `window.CarDNATeam.invite(email)` → `{ ok, invited }`.
- **Backend:** `seats` table plus an `invite` edge function sending the F-21 email.
- **Done when:** a Workshop account invites two technicians who see the same shared garage, and the
  third invite is refused.

### F-20 · Invoice billing and SLA — `invoices`

- **Entry point:** the Business card and the console.
- **Module:** `window.CarDNABilling.invoice()` → `{ ok, url, dueDate }`.
- **Placeholder:** "on request" copy, no fake invoice numbers.
- **Done when:** an invoice is issued by the processor or by hand and recorded on the account.

### F-21 · Email — `email`

- **Entry points:** sign-up confirmation, password recovery, invitations.
- **Placeholder today:** the default Supabase mailer (rate-limited); recovery only works from a signed-in
  session.
- **Wiring:** custom SMTP in the Supabase dashboard; nothing in the repository changes except copy.
- **Done when:** a recovery email arrives from the product domain and verification is required at sign-up.

### F-22 · Waitlist — `waitlist`

- **Entry points:** every upgrade path, every "pilot" button, every parts-catalogue tease.
- **Module:** `window.CarDNAWaitlist.join(interest, email)` → `{ ok }`.
- **Backend:** `waitlist` table (email, interest, plan, created_at), insert-only for `authenticated` and
  `anon`. The SQL is `docs/supabase-waitlist.sql` and the module is already wired to it: once the table
  exists, addresses are stored with no code change. Until then the insert fails and the panel says
  "nothing was stored" with the contact address.
- **Done when:** a signup survives a reload, the console can read it, and no email client opens.

### F-23 · Public shareable report — `shareReport`

- **Entry point:** the shareable-report panel on `decode.html`.
- **Module:** `window.CarDNAReport.share({ vin })` → `{ ok, url, message, html }`. The URL is
  `report.html?vin=<vin>`. GitHub Pages cannot serve `/r/<vin>`, so the report is a page with a query,
  not a path. `assets/report-view.js` renders it.
- **Wiring as built (Turn 40, render fixed Turn 42):** the link is built and shown; the report page reads
  `public.decode_cache` (`select=payload`) anonymously, flattens vPIC's `Results` into fields, and shows
  the filed record only. A VIN nobody has decoded while signed in shows an honest "no report yet" state
  with a link to the decoder.
- **Privacy:** the filed record only. The link carries nothing but the VIN; never the note, the garage
  label or the account.
- **Still open:** the `?vin=` deep link through the preview sign-in hop, and the SEO/indexing claim, which
  is untested. The cache write and the copy-to-clipboard behaviour were proved in Turn 43 (the decoder's
  panel copies on submit and shows the link; the report page has its own Share button).

### F-24 · Owner analytics — `analytics`

- **Entry point:** console, owner only.
- **Module:** `window.CarDNAStats.summary(range)` → `{ decodes, signups, planMix, refusedSaves, failures }`.
- **Backend:** reads `public.events` (staff-read policy exists).
- **Done when:** a week of real activity renders without a manual SQL query.

### F-25 · Data export and deletion — `gdpr`

- **Entry point:** `garage.html` account panel.
- **Module:** `window.CarDNAAccount.exportAll()` and `.deleteAccount()`.
- **Done when:** export downloads everything the account holds, and deletion removes profile, vehicles
  and events with a final confirmation.

### F-26 / F-27 · Server-side entitlements and cache

- **F-26:** a single `entitlements` function returning the plan's remaining decodes and vehicle slots,
  read by the app instead of counting in `localStorage`. Makes F-08 a real limit.
- **F-27:** write vPIC answers into `public.decode_cache` and read them before calling NHTSA. Prerequisite
  for F-13's cost control and F-23's free repeat views.

## 6. What is never faked

- Part numbers, OEM codes, diagrams or fitment that we have not licensed.
- A European specification we have not bought.
- A price, an invoice or a payment confirmation that no processor issued.
- A decode count presented as a server rule when it is a browser counter.
- An integration listed as live anywhere in these documents.

## 7. Build order

| Phase | Work | Ends when |
|---|---|---|
| P0 | These four documents, and `AGENT.md` marked superseded | The docs match the repository |
| P1 | `assets/preview.js` + `.preview-flag` styles + the start icon on every `frontend-only` feature | Every flagged surface is labelled and every flag flips cleanly |
| P2 | Frontend completion: locked states, empty/error/loading on F-12…F-25 | A Free user can walk the whole app and never meet a dead control |
| P3 | Free wiring: F-22 waitlist, F-24 analytics, F-16 recalls, F-25 GDPR, F-23 share report, F-26 limits, F-27 cache | Each is live per its contract, no money spent |
| P4 | Commerce: F-12 checkout, F-20 invoices, F-19 seats, F-21 email | A real purchase moves a real account onto a real plan |
| P5 | Licensed data: F-15 parts catalogue, F-13 European layer, F-14 overage | Pro's promise is delivered by paid data, not by copy |

P1–P3 cost nothing beyond hosting and are safe to do before any contract is signed. P4 needs the Boss's
processor decision; P5 needs the vendor and catalogue decisions.

## 8. Open decisions this plan waits on

- Payment processor and merchant details (`D-12`, to be opened).
- European data vendor and contract (`D-13`).
- Catalogue licence scope and terms (`D-14`).
- Transactional email provider and sending domain (`D-4`).
- Freeze of prices and caps for launch (`D-5`).

Each is recorded in `CarDNA-fm-tracker.md` under **Blockers and owner decisions**; none is decided in
passing.

## 9. Publishing and branches

GitHub Pages serves `main` at `https://drifter1987.github.io/CarDNA-fm/`, and that address is the test
surface: the private preview is retired. Four rules hold it together, and they are standing decision
`D-16` in `instructions.md`:

- **The site carries the app, nothing else.** Pages builds through Jekyll, and `_config.yml` excludes
  `README.md`, `AGENT.md`, `instructions.md`, this plan, the tracker, `docs/`, `Skills/`, the internal
  parser and the research files. What is published is the pages, `assets/`, `tools/vin-compare.html` and
  the four `data/` files the pages load. A new internal file is published until it is added to that list.
- **No `.nojekyll` file.** It would switch Jekyll off and serve the whole repository again, documents
  included.
- **No personal data in a shipped file.** An address, a token or a session belongs in the database or in a
  server function, never in `assets/`. The owner address lives in `docs/supabase-owner-act-as.sql`, which
  is not published, and in the database function itself.
- **`testing` is a staging branch, not a second site.** A repository has one Pages site, so work on
  `testing` becomes visible only when it is merged into `main`. `robots.txt` disallows crawlers and
  `report.html` is `noindex` while the product is pre-launch; both flip at launch.

