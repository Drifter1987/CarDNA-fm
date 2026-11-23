# instructions.md — the rules for building CarDNA-fm

**This file is the authority.** It merges and supersedes `AGENT.md`. Read it at the start of every
session, before touching code. When this file and any other disagree, this file wins; when the Boss
(the repository owner) says something that disagrees with it, the Boss wins, and this file is corrected
in the same turn.

The four documents below are the only reference for this project. Nothing else — no chat history, no
memory of an earlier session, no comment in passing — overrides them:

| File | Holds |
|---|---|
| `instructions.md` (this file) | How to work: authority, standards, placeholder policy, constraints, quality floor |
| `cardna-fm-plan.md` | What to build: the plan matrix, the feature registry, the wiring contracts, the build order |
| `README.md` | What the product is, in public: pages, assets, data, honest status of every feature |
| `CarDNA-fm-tracker.md` | What happened: every turn, every decision, what is verified, what is open |

**If a fact is not in one of those four files, it is not a fact about this project yet.**

---

## 1. The Boss rule

- The Boss is the repository owner. They set scope, they approve spend, and they decide anything that
  costs money or touches a third party.
- An agent may change code and these documents freely. It may not change what the product promises
  without the Boss, and it never commits, pushes, deploys, merges or opens a pull request unless asked.
- Decisions the Boss has to make are listed in `CarDNA-fm-tracker.md` under **Blockers and owner
  decisions**, numbered `D-n`. A decision that is recorded there is not re-litigated in passing.

## 2. Documentation and dependency upkeep (mandatory, every turn)

- **Every turn that changes behaviour changes the documents in the same turn.** At minimum
  `CarDNA-fm-tracker.md`; and `cardna-fm-plan.md` when a feature's status, wiring point or build order
  moves; and `README.md` when what the product does, or honestly claims to do, changes.
- **No stale statement is left standing.** If a turn proves a line in any of the four documents wrong,
  that line is corrected there and then — not "noted for later".
- **Dependencies are updated with the change that needs them**, never left half-migrated. This project
  has no third-party runtime dependencies by design (see §5); the rule applies to the things that do
  act like dependencies: asset version strings, the Supabase schema, the RLS policies, and the external
  APIs in §6.
- **One asset version constant per release.** Bump `?v=` in every HTML page together, in the same
  change. A page left behind is a bug, not a detail.
- **The schema lives in the repository.** Any SQL the product depends on is written into `docs/` as an
  idempotent file and referenced here; it is never left only in a chat message or in a dashboard.

## 3. The build standard: frontend complete, backend wired later

The frontend is built **as if every paid feature, licence and integration already exists**. A missing
backend is a wiring gap, never a design gap.

**What that means in practice**

1. Every screen has all of its states, for real: `loading`, `empty`, `error`, `success`, `locked`
   (the plan does not include this), and `unavailable` (the integration is not wired yet). A state may
   be simulated with fixed data; it may not be missing.
2. Every interactive control does something visible. No dead buttons, no `href="#"`, no disabled
   control without a reason written next to it.
3. Locked features show what the plan would give and the exact path to it, in the product's own voice.
4. Copy, layout, colour and spacing for a paid feature are finished **before** the backend exists, so
   going live is a swap of a function body, not a redesign.
5. Data shapes are the final ones. A placeholder returns the same object a real integration will
   return — same keys, same types, same errors — so the view never changes when the wiring lands.
6. Nothing pretends to be real. A feature that is not live is marked with the placeholder flag (§4) and
   the copy says what is true ("Available with the European data layer" is honest; a fake spec sheet is
   not).

**Definition of done for any frontend change** — all of these, checked and stated:

- All six states present on every surface touched.
- 320 / 390 / 768 / 1024 / 1280 / 1440 px, dark and light theme.
- Keyboard: focus order, visible focus ring, Escape closes panels, no focus traps.
- Reduced motion shows the same information with no animation.
- No console errors. No network request that 404s.
- The four documents updated (§2).

## 4. The placeholder convention — the start icon

A feature that is fully built in the interface but not wired is marked with a **start icon**: one small
glyph placed immediately above the feature, with a visible label on the control and an accessible
description. It is an honesty marker, not decoration.

**The contract, so that going live is one flag:**

- One module, `assets/preview.js`, exposes `window.CarDNAPreview`:
  - `.flags` — an object of `{ payments: false, euDecode: false, parts: false, … }`, one key per
    feature ID in `cardna-fm-plan.md`.
  - `.isOn(id)` — whether that feature is wired.
  - `.label(id)` — the human text for the badge. The default, for every feature, is **"Coming soon"**: a
    plain availability label, with no apology and no reason in the badge itself. A feature's own page
    copy may say more (what it will do, which plan it belongs to); the badge does not. It returns an
    empty string once the feature is live, so a surface can ask without checking the flag first.
  - `.scan()` — fills every `[data-preview]` element on the page and hides the badge when its flag
    turns true. Called once on load and after any dynamic render; the `data-preview` attribute stays
    put, so calling it twice is harmless.
- One markup pattern, nothing bespoke:
  ```html
  <span class="preview-flag" data-preview="payments"></span>
  ```
  The module supplies the glyph and the label; the page supplies placement only. `aria-describedby`
  points at the badge's text, so a screen reader hears "Coming soon" as well as the control.
- One style block, `.preview-flag`, in `assets/style.css`: 11 px mono, uppercase, dim, a small outline
  star, "Coming soon" text, 8 px above the element it describes, left-aligned, never on a primary button,
  never animated. The label is one word group, so the badge reads the same on every surface.
- **Turning a feature live = set its flag to `true` and implement the function named in its wiring
  contract.** No CSS change, no copy rewrite, no layout change. If going live requires restyling, the
  frontend was not finished and that is a defect.

The features carrying the icon today, and the exact function behind each, are in
`cardna-fm-plan.md` §4 and §4.1. The module is `assets/preview.js`; it is loaded on all thirteen pages,
so placing a badge is one span and nothing else. The label is authored as "Coming soon" and upper-cased
by CSS, matching the rest of the mono micro-labels.

## 5. Project constraints

- **Static site, no build step, no bundler, no framework migration, and no third-party runtime
  dependency** unless the Boss asks for one.
- **Two hosts only:** GitHub Pages for files, Supabase for accounts and rows. A third platform — a
  payment processor's webhook, a decoder vendor's proxy, an email provider — enters only as a decision
  (`D-n`) and, when it does, it is documented here before the code is written.
- `assets/supabase-config.js` holds the project URL and the publishable key. **Never** commit a secret,
  a database password, a service-role key or a vendor token. Server-side calls run in a Supabase edge
  function with its secret set in the dashboard.
- Never commit generated or exported data: `private/`, `*.cardna`, `cardna-vault-*`, `cardna-vins-*`.
  `Skills/` is git-ignored.
- Plans and quotas have exactly one source of truth: `PLAN_LIMITS` in `assets/auth.js`. The plan matrix
  in `cardna-fm-plan.md`, the pricing pages and `docs/pricing-feasibility.md` mirror it — change them
  together or not at all.
- Commit only when asked. Push only commits the Boss has seen. Nothing generated by a tool is committed
  by habit.

## 6. External APIs and their cost

| Integration | Purpose | Cost | State |
|---|---|---|---|
| NHTSA vPIC | US VIN decode | free, public domain | live |
| NHTSA recalls | Open recalls per vehicle | free | live (panel; export next) |
| Static catalogue (`data/*.csv`) | Brands, models, engines | free, in the repository | live |
| European full-spec vendor | European factory data | €0.22–€0.49 per lookup | not contracted |
| Licensed parts catalogue | Diagrams, OEM numbers, fitment | licence, not signed | not contracted |
| Payment processor | Checkout and invoices | per-transaction fee | not chosen |
| Transactional email | Verification, recovery | free tier or cheap | default mailer only |

No integration may be presented to a user as working before it is in this table as **live**.

## 7. The tracker rule

`CarDNA-fm-tracker.md` is the project's memory and it is not optional.

- **One section per chat**; a new chat appends a row to the index and a new `## Chat N` section. Earlier
  chats are never rewritten.
- **One entry per turn**, in the shape: Input / Output / Files / Verified / Commits / Open.
- **Append, never rewrite.** A correction is a new dated line beginning "Correction —".
- **`## Current state` and `## Open work` are refreshed every turn**, not only when a phase lands.
- **Verified means verified.** If it was not checked, write "not verified" and say who has to check it.
  Never imply a test that did not happen.
- After a compaction, write the surviving record into the tracker before doing anything else.

## 8. Session routine

1. Read this file, then `cardna-fm-plan.md`, then the tracker's **Current state** and **Open work**.
2. Check `git status` and `git log` — believe the repository, not a remembered summary.
3. Pick work from `cardna-fm-plan.md` §7 (build order) or from the tracker's open work, in that order.
4. Before claiming anything is finished: the §3 definition of done, the §2 documentation update, and
   the tracker entry.
5. End a turn with facts: what changed, where, what was checked, what was not, what the Boss must do.

## 9. Standing decisions

The full log lives in `CarDNA-fm-tracker.md`. These are the ones that shape every turn:

- `D1` no build step, no framework, no dependency.
- `D2` two hosts only; a third enters by decision, documented here first.
- `D3` role preview is read-only and local; no impersonation.
- `D4` plans and quotas per `PLAN_LIMITS`.
- `D5` admin grants up to Workshop, owner up to Business, roles owner-only.
- `D9` **(new)** the four documents are the only reference; `instructions.md` outranks the rest.
- `D10` **(new)** every unwired feature ships frontend-complete behind the start icon of §4.
- `D11` **(new)** going live is wiring only: flag plus function, never a redesign.
