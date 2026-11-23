# CarDNA-fm — project tracker

> Artifact: project memory for every chat on CarDNA-fm.
> Project: CarDNA-fm (`CarDNA-fm/` inside the GMOttomotive project folder)
> Owner: GMOttomotive · Maintainer: Drifter1987
> Repository: https://github.com/Drifter1987/CarDNA-fm · branch `main`
> Public site: https://drifter1987.github.io/CarDNA-fm/
> Preview: https://cardna-fm-g2j6--preview.freemilk.app
> Last updated: 15 November 2026 — Chat 1, Turn 33

## How this file works

This is the single memory of the project. `AGENT.md` requires every chat to append to it: one section
per chat, one entry per turn, summarizing what the user asked, what the agent did, which files changed,
what was verified, which commits landed and what is still open.

Rules: append, never rewrite; corrections are dated lines; no secrets and no transcripts; mark
unverified work as unverified. `## Current state` and `## Open work` are refreshed every turn.

The tracker follows the claude-mem handoff shape (`Skills/claude-mem/claude-mem.md`): goal, current
state, files in play, what was tried and why it failed, next steps, constraints. Deep recall uses the
layered method in `Skills/claude-mem/mem-search.md`: index first, then only the records that matter.

## Project snapshot

CarDNA turns a VIN into the exact vehicle — make, model, year, engine, plant — and is the front door of
GMOttomotive's vehicle-data family.

- **Shape**: static HTML, two stylesheets, vanilla JS modules, no build step, no dependencies, no server.
- **Pages**: `index.html` (app shell with tabs), `decode`, `makes`, `pricing`, `about`, `garage`,
  `signin`, `admin`, `vault`, `legal`, `reset`, plus `tools/vin-compare.html` and
  `tools/parse-public-apis.html`.
- **Data**: NHTSA vPIC for the US record (public domain, no key); a European structural decoder inside
  `vin.js`; `data/vehicles.csv` (15,068 models), `data/engines.csv` (30,535 variants), `data/brands.json`
  and `data/catalog_car_makes.json` shipped with the site.
- **Accounts**: Supabase — Auth for sessions, PostgREST with row-level security for `profiles`,
  `vehicles`, `vault_entries` and `events`.
- **Device state**: `cardna.recent`, `cardna.garage`, `cardna.vault` in `localStorage`; the vault is
  AES-256-GCM with a PBKDF2-SHA256 key (210,000 iterations) and never leaves the browser in plaintext.
- **Plans**: Free €0 / Pro €9.90 / Workshop €39 / Business from €249, with 1 / 5 / 25 / unlimited saved
  vehicles and 3 / 10 / 40 / 450 European decodes. Exports: Markdown; +CSV, PDF; +XLSX; all four.

## Goal

One CarDNA web app that turns any VIN into the exact vehicle, keeps a saved car safe across devices, and
sells plans — with no build step, no server of ours, and one header on every page.

The current programme is the restructure in the specification: close the layout debt, make access a
database rule rather than a page rule, make a saved car survive a device switch, and collapse eleven
documents into one shell without breaking a single URL.

## Current state

**Branch** `main`, up to date with `origin/main` as of the latest status check. Latest commit `1beac6a`
(15 Nov 2026, "Free plan: 3 VIN decodes in total; upgrade link when the garage is full"), pushed, and
GitHub Pages serves it.

**Working tree — uncommitted:**

- Modified: `README.md`, `about.html`, `admin.html`, `assets/style.css`, `decode.html`, `garage.html`,
  `index.html`, `legal.html`, `makes.html`, `pricing.html`, `reset.html`, `signin.html`,
  `tools/parse-public-apis.html`, `tools/vin-compare.html`, `vault.html` — the P1 badge work (Turn 30).
- Untracked: `AGENT.md`, `CarDNA-fm-tracker.md`, `instructions.md`, `cardna-fm-plan.md`,
  `assets/preview.js`, `docs/supabase-migration.sql`, `docs/supabase-migration-2.sql`; `Skills/` is ignored.
- Both migrations have been run by the Boss in the Supabase SQL Editor, so the database is ahead of the
  repository even though the SQL lives in `docs/`.

**Confirmed working:**

- Sign-in, session refresh, profile polling (60 s plus tab focus), role and plan model.
- Role badge top-right with the view switcher; choosing a view applies app-wide and survives a reload.
- Plan grants bounded: admin up to Workshop, owner up to Business; roles are owner-only.
- Garage: local cache first, then Supabase mirror; save upserts, remove deletes; undo for removals.
- Audit rows for role, plan and block changes; console activity list.
- Sticky header on every non-app page (Turn 11).
- In the latest private preview, the shared header/footer appeared on all 13 routes, root-relative links from `/tools/` worked, the two-row phone header fit, the index tab-strip continuation cue appeared only when tabs remained hidden, and comparison-table hints behaved as expected at 390×844 and 1280×800.
- Phone header, LAY-04 (Turn 19, `?v=p20`): at 390×844 the menu button holds the corner of row one with the theme toggle beside it as one group, the account chip sits flush on the right edge of row two, and the "by GMOttomotive" sub-brand stays on one line. At 1280×800 the header is the same two rows as before (logo plus toggle and chip, nav beneath), with nothing wrapped or clipped.
- Pricing and VIN comparison table frames rendered as contained regions; the tools-page table styling rendered. Native swipe scrolling and keyboard focus were not exercised.
- Project tracking: this tracker is maintained each turn (active from Turn 13).
- Start icon, P1 (Turn 30, `?v=p26`): `assets/preview.js` and the `.preview-flag` style are live, loaded on
  all 13 pages. Nine badges are placed — six on `pricing.html` (payments, euDecode, bulkUpload, invoices,
  overage, waitlist), two on `index.html` (parts on the Catalogue tab, payments on the Pricing tab) and one
  on `decode.html` (parts). Confirmed in dark and light theme, at 1280×800 and 354×593.
- Plan limits as shipped: Free = 3 decodes in total (browser counter) and 1 saved vehicle (app plus the
  database cap trigger); Pro / Workshop / Business are staff-granted only, and their European allowances
  are sold but not yet deliverable (F-13 unbuilt).
- Surfaces, P2 (Turn 31, `?v=p29`): the commerce entry and the four account panels are built and wired to
  preview modules — paid-card checkout buttons that hand over to the waitlist, and bulk upload, API key,
  team seats and data export/deletion on the garage. Each carries its badge, each returns the final data
  shape, and each says plainly that its service is missing. Confirmed at 1280×800 (four panels in one row)
  and 390×844 (stacked), with the not-connected messages and no data written.
- P2 finished (Turn 32, `?v=p31`): the last two surfaces — recalls and the shareable report — are on
  `decode.html` in a "Safety and sharing" section, each with its badge, its VIN validation and an honest
  not-connected answer. Every flag in the registry now has a surface except `euDecode`, whose home is the
  European block that arrives with the vendor. Confirmed at 1280×800 (one row, equal height at rest) and
  354×593 (stacked, messages wrapping without clipping).
- Touch devices now get 16 px text fields at every width (`pointer: coarse`), so focusing a field no
  longer zooms the iPad or a phone showing a desktop-width page.
- **Recalls are live** (Turn 33, `?v=p33`): the decoder panel decodes the VIN at vPIC for make, model and
  year, then asks NHTSA's recall feed, and lists up to eight campaigns with component, summary, remedy,
  campaign number and date. Confirmed in the browser: 24 campaigns for a 2003 Honda Accord, 3 for a 2013
  Ford F-150, an empty-state-safe message, and the VIN-format error for garbage input. Its badge hides
  itself because its flag is now `true` — the first proof that the flag mechanism works.

**Known broken or partial:**

- The `dna-fm-brain` tab in the plan document has never been rendered on a device; only reasoned about.
- The plan's downward drift was a masthead-height feedback loop: `setMh()` read `offsetHeight` including the border, then fed it into `--mh`, which controls the masthead's own `min-height`; fixed by using `clientHeight` and removing the self-observing `ResizeObserver`. FreeMilk phone and desktop previews remain stable; Koder iOS is still unverified.
- LAY-02/LAY-03 implementation is previewed, but verification remains incomplete: 320 px and intermediate widths are still unavailable, the inspector cannot swipe or type, real Koder/iOS safe-area behavior is unknown, and non-staff Admin visibility cannot be safely tested without changing roles. Turn 19 removed the known source-level cause of 320 px overflow (grid minimum tracks wider than the container) but could not render 320 px.
- Dark theme has not been re-checked since the p20 header and grid changes; the light theme was the one inspected.
- Phone landscape at 844×390 rendered black in the inspector; the phone preview also showed a black status-bar band above the visible header. Preview-host chrome was suspected, but real-device notch/safe-area behavior is unconfirmed.
- At 1280 px, the VIN field-by-field hint remains above the empty “Run the decoders first” state, and the matrix table leaves unused space to its right. These are visual observations, not confirmed functional failures.
- Four Supabase changes now applied and confirmed in the dashboard (Turns 22–23). Behaviour — a save at
  the cap, a blocked account, a staff read of `events` — has still never been exercised.
- Incidental preview observations remain open: sign-in form remains visible while signed in; the parse-public-APIs filter may overlap results; VIN comparison sticky-header repaint after tab jumps and delayed auth chips need another look.

## Chat index

| # | Chat | Started | Status | Turns recorded |
|---|---|---|---|---|
| 1 | CarDNA-fm build and restructure | 12 Nov 2026 | active | 33 |

Add a row here when a new chat starts, and a matching `## Chat N` section below. Never renumber.

## Chat 1 — CarDNA-fm build and restructure

One long chat, compacted once. Turns 1–3 survive only as a summary; the entries below are the
surviving record, not a transcript.

### Turn 1 — Badge to the top-right, role dropdown, app-wide role view

- **Input**: Move the owner/admin/sign-out badge to the top-right corner, keep its shape, replace the
  "Admin" label with "Role", open a dropdown on press; the label shows the selected role and choosing a
  role switches the whole app to that view; remove role and status badges and selectors from everywhere
  else. Also: admins may grant Free / Pro / Workshop, owners everything through Business; try assigning
  plans and testing vehicle limits.
- **Output**: Role and plan control consolidated into one badge and one dropdown; role preview stored
  locally and applied app-wide by reloading into the chosen view; console gained plan grants within
  bound, role control, blocking with a reason, and recent activity. Badge hidden for visitors, exactly
  one per page.
- **Files**: `assets/auth.js`, `assets/admin.js`, `assets/style.css`, `index.html`, `admin.html`,
  `garage.html`, `decode.html`, `vault.html`, `pricing.html`, `signin.html`, `reset.html`.
- **Verified**: Not at this point — implementation only.
- **Commits**: `72f1495`, `501af9a`, `bbcc726`, `68e1448` and neighbours.
- **Open**: Behaviour untested; four pages still had no account chip or sign-out.

### Turn 2 — Test the badge on the preview, fix what the test found

- **Input**: Test the new features on the preview already open in the browser; then "Continue".
- **Output**: Badge confirmed top-right with its pill shape and `ROLE · OWNER`; dropdown lists Owner,
  Admin and User × four plans with the current one ticked; selection switches the view app-wide and
  persists across index, garage, pricing and admin. Fixes: console kicker/intro/footer follow the view;
  the open menu closes on scroll; the garage limit line reads as a sentence rather than "3 of 1 saved
  vehicles".
- **Files**: `assets/admin.js`, `admin.html`, `assets/auth.js`, `assets/garage.js`, `assets/style.css`.
- **Verified**: On the preview at phone width. One inspector mistake pressed Sign out and ended the
  session; the user signed back in and the remaining checks were run afterwards.
- **Commits**: batch `85ff5fc` came later (Turn 3).
- **Open**: Tablet width untested; the badge sits on a second row on pages with a menu button.

### Turn 3 — Commit and deploy to GitHub Pages

- **Input**: "Fix, commit, deploy on live so I can check it on GitHub Pages."
- **Output**: Commit `85ff5fc` on `main`; cache-bust moved to `?v=p13`; preview republished. Deliberately
  left the hamburger in the corner on menu pages and explained the trade-off.
- **Files**: the 13 HTML pages, `assets/style.css`, `assets/auth.js`, `assets/admin.js`, `assets/garage.js`.
- **Verified**: Not opened on the live site by the agent — the user checked it themselves.
- **Commits**: `85ff5fc`, pushed.
- **Open**: None from this turn.

### Turn 4 — "Why do we have lots of HTML files?"

- **Input**: An earlier question in the session about why the project has many HTML files; did the agent
  still recall it?
- **Output**: Honest answer that the earlier question was lost in compaction. Explained the cause: no
  build step and no router, so each page is a file; `index.html` is an app shell that duplicates Decode,
  Brands and Pricing. Costs: copied header and footer, shared changes in many files, a version bump
  touching 13 files, and header behaviour that differs by page. Recommended injecting one shared header
  and footer from `auth.js` or `app.js` rather than folding pages together.
- **Files**: none.
- **Verified**: Read from the repository.
- **Commits**: none.
- **Open**: The shared header is still item `LAY-03` in the plan.

### Turn 5 — "Install the top web-app-design / website-building skills with 50,000+ stars"

- **Input**: Search GitHub for the top `/web-app-design` and `/website-building` skills with 50,000+
  stars and install them on FreeMilk; report when finished.
- **Output**: Researched GitHub directly. Found no repository with either name at that scale. Reported the
  real contenders: `pbakaus/impeccable` (109,317 stars, the genuine design skill), `nexu-io/open-design`
  (107,475, a design workspace app), `cathrynlavery/diagram-design` (66,835, diagrams). Explained that
  FreeMilk has no skill install action and that Impeccable installs through `npx`, which is unavailable.
  Offered two options: vendor the skill files into the project, or run the critique and audit directly.
- **Files**: none.
- **Verified**: GitHub API and repository pages.
- **Commits**: none.
- **Open**: User chose the vendor path in the next turn.

### Turn 6 — Where skills live on the iPhone; rename to CarDNA-fm

- **Input**: Is there a FreeMilk directory to save or copy skills to? Then: rename the project to
  `CarDNA-fm` and use `CarDNA-fm/Skills/{skill_name}/{skill_name}.md`.
- **Output**: Explained the two writable places: the project repository (versioned, read by coding tools)
  and `/scratchpad` (this chat only, appears under Artifacts). Renamed `CarDNA/` to `CarDNA-fm/`, keeping
  git history, branch and remote intact, and re-tagged the repository as a web app. Downloaded
  `pbakaus/impeccable` v4.9.0 `SKILL.md` byte for byte into `Skills/impeccable/impeccable.md`. Renamed the
  path references in both READMEs.
- **Files**: `CarDNA-fm/` (rename), `Skills/impeccable/impeccable.md`, `README.md`, `CarDNA-fm/README.md`.
- **Verified**: File count and content of the downloaded skill; git state after the rename.
- **Commits**: none.
- **Open**: The skill file alone does not carry Impeccable's `reference/` or `scripts/` folders.

### Turn 7 — Add .gitignore and copy two more skills

- **Input**: "Add gitignore. Copy nexu-io/open-design. Copy cathrynlavery/diagram-design."
- **Output**: Added `Skills/` to `.gitignore` so no skill is ever committed to the public repository.
  Copied `diagram-design` v2.6 (MIT, 399 lines, ~45 diagram types) and the `frontend-design` skill from
  `nexu-io/open-design` (plus its `LICENSE.txt`, since that skill carries its own licence).
- **Files**: `.gitignore`, `Skills/diagram-design/diagram-design.md`,
  `Skills/frontend-design/frontend-design.md`, `Skills/frontend-design/LICENSE.txt`.
- **Verified**: Files downloaded byte for byte; `git status` confirms `Skills/` is ignored.
- **Commits**: none.
- **Open**: The instructions-only copies cannot run their `scripts/` or `assets/`.

### Turn 8 — "Back to the plan, what next for the app?"

- **Input**: What was the plan for the app, next?
- **Output**: Read the plan document and corrected its statuses against the git log. Reported done
  (roles, plans, badge, limits, exports, sync groundwork) and open, in order: one shared header and
  footer (`LAY-03`, the cause of most rough edges), layout leftovers, sync polish including the unverified
  SQL, blocking enforced in the database, one app shell, then later platform work. Recommended starting
  with the shared header.
- **Files**: none.
- **Verified**: `git log` and the plan document.
- **Commits**: none.
- **Open**: The plan itself was still the old 3D node map.

### Turn 9 — Turn the plan into a full specification

- **Input**: "Using the 3 skills, update the html plan file into a structured and more professional full
  spec plan."
- **Output**: Replaced the 3D node map with a 2,000-line specification: document control, context,
  measurable goals, permission and plan matrices, a baseline counted from git, architecture with four
  SVG figures (topology, data model, cross-device sequence, roadmap), **33 numbered requirements** with
  acceptance criteria and evidence, delivery gates, risk register, seven owner decisions, definition of
  done with both proof scenarios, and appendices including the four unconfirmed database changes.
- **Files**: `/scratchpad/cardna-restructure-plan.html`.
- **Verified**: Hand-checked HTML and corrected the baseline counts (9 shipped / 11 partial / 11 not
  built / 2 blocked); not rendered.
- **Commits**: none — it is a scratchpad artifact.
- **Open**: The page has never been visually checked.

### Turn 10 — Add the dna-fm-brain tab

- **Input**: "Add to the plan a new tab, call it dna-fm-brain, a three.js viewport of the app's
  architecture, make it clean and organized."
- **Output**: Added a view-switching tab pair (Specification / dna-fm-brain) to the document, plus a
  full-viewport Three.js scene: five labelled layers (Interface, Client modules, Browser storage,
  Supabase, External services), 21 nodes, 19 curved edges, HTML labels instead of sprites, a filterable
  legend, a detail panel linking each node back to its requirement IDs, Iso/Front/Plan presets, an
  optional Drift, hover and selection, responsive label hiding, a paused loop when hidden, and a
  graceful message when WebGL or the CDN is unavailable. Three.js r137 classic build, loaded lazily.
  Document bumped to v2.1.
- **Files**: `/scratchpad/cardna-restructure-plan.html`.
- **Verified**: Not rendered — scratchpad files are not served, and opening the browser would have
  disturbed the session.
- **Commits**: none.
- **Open**: The scene, camera framing and label spacing are reasoned, not seen.

### Turn 11 — "The page keeps scrolling downwards" — sticky header and the scroll container

- **Input**: The page keeps scrolling downwards; check what the issue is.
- **Output**: Sent the web inspector to the page the browser had open and found it was `garage.html`, not
  the plan. Measured it: no idle drift, no blank tail, document 1,909 pt at a 593 pt viewport — but the
  sticky header **never pinned**, and `body` was a scroll container. Cause: `overflow-x: hidden` on both
  `html` and `body` makes `overflow-y` compute to `auto`, so `body` becomes a scroll container with
  `height:auto`; `position: sticky` then resolves against a box that never scrolls, and on iOS the page
  scrolls in two chained layers. Fix: `overflow-x: clip` (with the old `hidden` kept as a fallback),
  `?v=p14` on all 13 pages, preview published. Verified on garage, pricing and decode: the header pins
  at y=0 through to the bottom, scrolling stops at the footer, no page-level horizontal scroll.
- **Files**: `assets/style.css`, all 13 HTML pages.
- **Verified**: Web inspector, phone viewport. Real iOS gesture behaviour could not be observed.
- **Commits**: none — uncommitted.
- **Open**: Pricing comparison table overflows the right edge and its inner scroll does not engage;
  garage header is 179 pt tall on a phone; the user should confirm the feel on the device.

### Turn 12 — Tracker, AGENT.md and the claude-mem skill

- **Input**: Create an artifact called `{project_name}-tracker.md` holding every detail of the project's
  chats, with every input and output summarized for every chat; add that as an instruction inside
  `AGENT.md`; copy the claude-mem skill from GitHub and use it for the task.
- **Output**: Copied the claude-mem skill from `thedotmack/claude-mem` — the handoff skill (the method
  used here) as `Skills/claude-mem/claude-mem.md`, and its companion memory-search skill as
  `Skills/claude-mem/mem-search.md`. Wrote `CarDNA-fm-tracker.md` (this file) with the project snapshot,
  current state, the chat index and the twelve turns. Wrote `AGENT.md` with the tracker rule, the
  per-turn format, the project constraints and the quality floor.
- **Files**: `Skills/claude-mem/claude-mem.md`, `Skills/claude-mem/mem-search.md`, `AGENT.md`,
  `CarDNA-fm-tracker.md`.
- **Verified**: Skill files downloaded byte for byte from the upstream repository.
- **Commits**: none.
- **Open**: The tracker and AGENT.md are uncommitted; `Skills/` stays ignored by git.

### Turn 13 — Tracking starts for real

- **Input**: "Start tracking from now on as I said before. Use the skill claude-mem and tell me what you
  created using it."
- **Output**: First turn written under the rule in `AGENT.md`, using the claude-mem handoff method —
  what was asked, what changed, what was checked, what is open. Appended this entry to Chat 1, raised the
  turn count to 13, refreshed `Last updated`, added the untracked `AGENT.md` and tracker to Current
  state, and logged the turn in the verification and change logs. No product code changed; the only file
  touched is this tracker.
- **Files**: `CarDNA-fm-tracker.md`.
- **Verified**: Re-read the file after writing — chat index, turn entry, verification row and
  change-log row all present and consistent.
- **Commits**: none.
- **Open**: The tracker, `AGENT.md` and the `p14` scroll fix are still uncommitted; no commit was asked
  for.

### Turn 14 — Stop the plan drifting on load

- **Input**: The HTML plan scrolls downward by itself on open in Koder on iOS and desktop and keeps drifting; asked to diagnose and fix, with an optional FreeMilk preview/browser test.
- **Output**: Read the complete 3,037-line plan and found no load-time document-scroll command in Specification view; the `scrollIntoView` calls only run after explicit architecture-view actions. The strongest source-level suspect was smooth global scrolling combined with restored scroll position. Added early manual history scroll restoration, a one-time top reset only when there is no URL fragment, and changed global scrolling to `auto`; explicit in-page navigation remains smooth. Published a temporary plan copy to the private preview and removed that copy from the repository afterward.
- **Files**: `/scratchpad/cardna-restructure-plan.html`, `CarDNA-fm-tracker.md`; temporary `CarDNA-fm/plan-preview.html` was published then deleted.
- **Verified**: Static source review; FreeMilk preview publish succeeded. Browser inspector was unavailable (temporary AI service error), so scroll movement was not observed; Koder/iOS and desktop behavior remain unverified.
- **Commits**: none.
- **Open**: User should reopen the plan in Koder and desktop to confirm it starts at the top and stays still. The preview deployment contains the temporary page at `/plan-preview.html` until another publish replaces it.

### Turn 15 — Fix the masthead height feedback loop; verify in preview

- **Input**: Shared two screenshots showing the masthead, tab bar and cover moving progressively downward; challenged the earlier diagnosis and asked for a temporary GitHub deployment plus FreeMilk browser testing.
- **Output**: Correction to Turn 14: the smooth-scroll/history-restoration theory was wrong. The screenshots exposed the cause: `setMh()` measured `mast.offsetHeight` (including the 1 px bottom border) and assigned it to `--mh`, while `--mh` controls `.mast-inner`'s own `min-height`; a `ResizeObserver` watched that masthead, creating a one-pixel growth feedback loop. Changed the measurement to `mast.clientHeight` (excludes the border) and removed the masthead `ResizeObserver`; the existing window resize handler still recalculates the value. Restored the original smooth-scroll behavior. Published the temporary plan copy to the private FreeMilk preview and used the browser inspector at phone and desktop widths.
- **Files**: `/scratchpad/cardna-restructure-plan.html`, `CarDNA-fm-tracker.md`; temporary `CarDNA-fm/plan-preview.html` was published then deleted from the working tree.
- **Verified**: FreeMilk inspector: at phone and desktop, masthead/tab/cover positions and page height stayed stable through idle observation; scrolling and resize/rotate round trips did not accumulate drift. Browser tool has no console, so it could not conclusively inspect the earlier ResizeObserver warning. Koder iOS remains unverified.
- **Commits**: none.
- **Open**: Confirm the fix in Koder on iOS. A public GitHub Pages deployment was not made: the repo is public and the document labels itself internal, and deleting a pushed page would not remove it from Git history. The private FreeMilk preview has the temporary page at `/plan-preview.html` until the next publish replaces it.

### Turn 16 — Keep the plan preview private

- **Input**: Declined GitHub Pages publication and instructed that the plan remain in the private FreeMilk preview only.
- **Output**: Did not publish or push the internal plan to GitHub. The tested private preview at `/plan-preview.html` remains the test surface until the next preview publish replaces it.
- **Files**: `CarDNA-fm-tracker.md`.
- **Verified**: The preview had already loaded and passed phone and desktop idle/scroll checks in Turn 15; no new browser run in this turn.
- **Commits**: none.
- **Open**: Koder iOS confirmation remains.

### Turn 17 — Resume LAY-02/LAY-03 implementation verification

- **Input**: Asked to continue from the compacted handover: audit LAY-02 before LAY-03, preserve the existing static app and internal-only plan, then publish/inspect the private preview where possible. Earlier safety constraints remain: do not sign out, change roles/plans, submit VINs/forms, or alter garage/vault data; do not commit, push, or publish the plan publicly.
- **Output**: Restored the compacted record to the tracker. The prior turn had added the shared shell, mobile table containment, safe-area support and `viewport-fit=cover`; its latest safe-area edits had not yet been published. Began resuming verification; no latest-preview result recorded yet.
- **Files**: `CarDNA-fm-tracker.md`; prior turn's app edits are listed in Current state and below.
- **Verified**: Read `AGENT.md`, tracker, README, handoff skill, and git status. LAY-02/LAY-03 preview checks described in the compacted record were performed before the final safe-area edits; latest working tree not yet re-published or re-inspected.
- **Commits**: none; no push or public deployment.
- **Open**: Review the full diff and all 13 route shell/script references; publish the current working tree to the private preview; inspect the phone safe-area and shared shell; continue widths and route checks available. Keep Koder/iOS, 320 px, and non-staff Admin checks marked unverified unless actually tested.

### Turn 18 — Complete the handover and stop project work

- **Input**: “Continue the current request from where the summary leaves off. If it was finished, say so briefly.” The carried-forward request was to stop project work and prepare an accurate handover; no further implementation was authorized.
- **Output**: Read `AGENT.md`, this tracker, and the claude-mem handoff method; checked current git status and recent history. Refreshed the live state and open-work sections with the completed Turn 17 preview results and the remaining verification limits. Correction to Turn 17's preliminary entry: the current app tree was subsequently published to the private preview and inspected; it is not still awaiting publication. No app, plan, account, garage, or vault data was changed in this turn.
- **Files**: `CarDNA-fm-tracker.md`.
- **Verified**: Read the three handoff/project files; `git status` confirms the listed working tree and branch `main`; `git log` confirms `85ff5fc` remains the latest commit. The 390×844 and 1280×800 preview observations are carried forward from the previous session summary; no new publish, browser inspection, build or test was run in this turn.
- **Commits**: none; no push or public deployment.
- **Open**: Project work remains stopped until the user asks to resume. On resumption, continue with LAY-02 before LAY-03, observing the safety constraints and verification limits in `## Open work`.

### Turn 19 — LAY-02 at 320 px from source; mobile header and console table polish

- **Input**: "Start" — resume the plan at LAY-02 verification, private preview only, owner-account read-only rules unchanged (no sign out, no role or plan changes, no VIN or form submissions, no garage or vault changes).
- **Output**: Audited the stylesheet for the remaining source-level causes of 320 px horizontal overflow and fixed them: the shared card grids (`grid-2`, `grid-3`, `grid-4`, `tiers`) now use `minmax(min(<px>, 100%), 1fr)`, so no grid track can be wider than its container — at 320 px the `.container` content box is 272 px, narrower than the old 300 px minimum track, which is why `about.html`, `legal.html` and `admin.html` could clip. Hardened the garage download menu to `min(280px, calc(100vw - 32px))`. Rebuilt the ≤760 px header as flex (a first attempt used a two-row grid whose wide account chip widened the second column and wrapped "by GMOttomotive" at 390 px): menu button keeps the corner of row one, the theme toggle sits beside it, and the account chip keeps the right edge of row two, with its own auto margin only at ≤560 px. CON-01: the admin accounts table now sits in a labelled, focusable region and its swipe hint is hidden at 761 px and above. The two `about.html` comparison tables gained the same swipe hint and labelled focusable regions. Asset version bumped `?v=p17` → `?v=p20` across all 13 pages. Published the private preview three times while iterating; the final publish is `?v=p20`.
- **Files**: `assets/style.css`, `admin.html`, `about.html`; version-only edits in `index.html`, `decode.html`, `garage.html`, `makes.html`, `pricing.html`, `vault.html`, `legal.html`, `signin.html`, `reset.html`, `tools/vin-compare.html`, `tools/parse-public-apis.html`.
- **Verified**: Private preview, browser inspector. Phone 390×844 on about, legal and index: two-row header, menu button in the corner with the toggle grouped beside it, chip flush with the 24 px right content edge, sub-brand on one line, no overlap or clipping; about's tables show the swipe hint and stay contained in their frames; legal's card grid is one column; index's tab strip keeps its right-edge fade. Desktop 1280×800 on about and pricing: header unchanged in two rows, Why/How still two columns, the principles cards four-plus-two, both about tables fully visible with the hints hidden, no hint above the pricing table, nothing past the right edge. Not verified: 320 px and any width the inspector cannot set, dark theme, native swipe and keyboard focus, real Koder/iOS safe-area behaviour, non-staff Admin visibility (would need a role change).
- **Commits**: none; no push and no public deployment.
- **Correction —** `vault.html` was missed in the first version bump and carried `?v=p18` after the others had moved; corrected to `?v=p20` before the final publish, so all 13 pages now load one asset version.
- **Open**: 320 px still cannot be rendered here — the fix is reasoned from source and confirmed at 390 px only. Dark theme needs a pass. The remaining LAY-03 behavioural checks (active-link marking on each route, auth/Admin link visibility for non-staff) were not re-run this turn.

### Turn 20 — Phase 2: the database rules written as one migration

- **Input**: "Let's move to the next step" — the next item in Open work is the four unconfirmed Supabase changes (SYN-04, SYN-07, ACC-04, ACC-05).
- **Output**: The agent cannot run SQL against Supabase, so it wrote the changes as one idempotent file for the owner to paste into the SQL Editor: a preflight that stops with a clear message if `profiles`, `vehicles` or `events` is missing; a dated safety copy of `vehicles` (decision D-2); `vehicles.deleted_at` with a partial index; two security-definer helpers (`cardna_is_active`, `cardna_is_staff`); a before-insert/update trigger enforcing the plan cap with the same numbers as `PLAN_LIMITS` (1 / 5 / 25 / unlimited), counting only live rows and letting a re-save of an existing car through; RESTRICTIVE policies requiring an active account on `vehicles` and, if it exists, `vault_entries`; and a staff-read policy on `events`. No site code changed: `garage.js` already writes `deleted_at`, filters on it, and falls back without it.
- **Files**: `docs/supabase-migration.sql` (new).
- **Verified**: Not verified. The SQL has not been run and could not be run here; it was checked against how `garage.js`, `auth.js` and `admin.js` use the tables, but the real table definitions were not visible (no schema file is in the repository), so column names and types (`profiles.status`, `profiles.plan`, `events.detail`) are assumed from the code. The vault is stored locally today, so the `vault_entries` step may only print a notice.
- **Commits**: none; no push or public deployment.
- **Open**: Owner action D-2 — run the file, then check the three read-only queries at its end. After that: confirm a garage save at the cap is refused with a visible message (the UI currently ignores a server refusal and keeps the local copy — SYN-03 will need to surface it), and that a blocked test account reads nothing. The blocked and cap behaviours should be tested with a throwaway account, not the owner's.

### Turn 21 — Look at the local browser

- **Input**: "Check the local browser and confirm what you see."
- **Output**: Ran a read-only inspection of the chat's shared browser. It was not on the CarDNA preview: it had the Supabase dashboard for the CarDNA project open (project ref matches `assets/supabase-config.js`), signed in to the owner's Supabase account, with the SQL Editor open and the text of `docs/supabase-migration.sql` pasted in (scrolled to its last lines, 144–154). No result grid and no "Running" state were visible, so the file appears pasted but not run. Overview page behind it showed status Healthy, Nano compute, no migrations, no backups, no connected repository.
- **Files**: `CarDNA-fm-tracker.md`.
- **Verified**: Observation only, at 354×593. The inspector clicked nothing (no Run, no navigation). Whether the pasted text is the complete file, whether it is saved as a snippet, and whether it has ever been run are all unknown from what was visible. The CarDNA site itself was not looked at this turn.
- **Commits**: none.
- **Open**: The owner decides whether to press Run (D-2). Supabase's dashboard may show a warning for destructive-looking statements; the file's only drops are its own policy and trigger names. Report the outcome so Turn 20's migration can be marked confirmed or fixed.

### Turn 22 — Verify the migration in Supabase

- **Input**: "It is ran successfully now, verify and tell me what's next on the plan."
- **Output**: Read-only inspection of the Supabase dashboard (nothing run, edited or created by the inspector). Result panel read "Success. No rows returned." Confirmed present: trigger `cardna_vehicle_cap` (before insert/update, row, enabled); functions `cardna_is_active`, `cardna_is_staff`, `cardna_vehicle_cap` (security definer); `vehicles.deleted_at` plus index `vehicles_user_live_idx`; table `vehicles_backup_20261114` (3 rows, same as `vehicles`); restrictive policy `cardna_active_only` on `vehicles` and `vault_entries`; permissive `cardna_events_staff_read` on `events`. Findings: (1) the project already had `vehicles_plan_cap` (`enforce_vehicle_cap`, with a staff bypass) and two staff-read policies on `events`, so the new cap trigger and the new events policy are duplicates, and the new cap is stricter (no staff bypass); (2) Integrations > Data API reads "0 of 6 tables exposed, 0 of 12 functions exposed" and every table is badged "API DISABLED" — not tested with a request, and the site has been reading and writing these tables (346 event rows), so it may be the dashboard's wording for SQL-managed grants; (3) `vault_entries` exists with 0 rows, so the vault is not yet mirrored to the server.
- **Files**: `docs/supabase-migration-2.sql` (new, not run) removes only the two duplicates; `CarDNA-fm-tracker.md`.
- **Verified**: Objects exist as listed, read from the dashboard. Not verified: any behaviour — no save at the cap, no blocked-account read, no staff read was exercised (those need a throwaway account and the user's go-ahead). The restrictive policy expressions on `vault_entries` read blank in the dashboard.
- **Commits**: none.
- **Open**: Owner choice: run `supabase-migration-2.sql` (single cap rule with staff bypass) or keep both. Confirm the Data API point with a harmless signed-in garage load before any further sync work.

### Turn 23 — Confirm the cleanup, then SYN-03: save status and retry queue

- **Input**: "Ran successfully, now check and continue."
- **Output**: Checked the Supabase dashboard read-only: the second migration is what ran. `cardna_vehicle_cap` (trigger and function) and `cardna_events_staff_read` are gone; `vehicles_plan_cap` (with the staff bypass), `vehicles_touch`, `profiles_touch`, the original events policies, `cardna_is_active`, `cardna_is_staff` and the restrictive `cardna_active_only` policies on `vehicles` and `vault_entries` remain. The Migrations page is empty because the SQL Editor does not record migrations. Then built SYN-03 in `assets/garage.js`: every change to the server copy (save, remove, clear) now goes through a queue kept in `localStorage` (`cardna.garage.queue`, per account). A change is `pending` (offline, 5xx, 401, 408, 429: retried with backoff from 15 s to 5 min, on `online`, and when the tab is shown) or `rejected` (any other answer, such as the cap trigger's 403: shown, retried only by hand). A 400 that names `deleted_at` still falls back to the old behaviour; other failures are no longer swallowed. `save()` now returns `sync`, a promise of `{ state, message }`. The garage page shows a per-car flag, one summary line and a "Try again" button; the decoder's save button reports "Saved here ✓" or "Saved here only" with the reason. `pull()` flushes first and no longer re-adds a car this device has already removed or one the server refused. Styles for `.sync-flag`; `?v=p21` on all 13 pages.
- **Files**: `assets/garage.js`, `assets/vin.js`, `assets/style.css`, `garage.html`, and the version bump in all 13 HTML pages.
- **Verified**: Published to the private preview (build only). Re-read the new queue code for syntax. Not verified in a browser: no save, removal, retry or offline case was exercised, because that needs a signed-in session and would change garage data, which is off limits. A mid-edit slip that deleted a `var undoBtn` declaration was caught by search and repaired before publishing.
- **Commits**: none.
- **Open**: Test with a throwaway Free account: save a second car (expect "Saved here only" with the cap message and a flag on the garage page), then Try again after a plan grant; and the same offline. The cap and blocked-account behaviour are still untested.

### Turn 24 — Live deploy, then the user's own garage test found the real bug

- **Input**: "Deploy to live first." / "I'm signed in now to a free user account. Try it out / And continue the plan."
- **Output**: Committed the layout, shell and sync-queue work (`b067d56`, only product files: AGENT.md, tracker, SQL files left uncommitted) and pushed; the GitHub Actions build and Pages deploy passed, so `https://drifter1987.github.io/CarDNA-fm/` now serves the shared shell and sync queue. The signed-in test was run in the browser on the private preview (the user's session lives there): the queue worked — the summary line reported refusals and "Try again", per-car flags named the reason, and the pending entry settled to refused on its own. But it exposed a real bug the earlier refusal had masked: the free account (3 cars, one kept, two refused) was not being capped client-side, and the badge said "Role · User" with no plan. Root cause found in Supabase: `profiles.role` defaults to `member` (DDL confirmed in the dashboard); the app only knows `user`, so `effective()` treated `member` as staff (`limitsNow()` returned null) and the client-side cap never engaged. Fixed in `assets/auth.js`: `member` is normalised to `user` in `fetchProfile` and `effective()`. `?v=p22` on all 13 pages; published to the preview.
- **Files**: 21 product files committed at `b067d56`; `assets/auth.js`, and the version bump in all 13 HTML pages, uncommitted.
- **Verified**: Pushed to live (build passed); the queue behaviour confirmed in the browser against the user's own account (read-only for data: no save, remove, retry or undo was pressed). The `member` role was read from the profiles DDL in the Supabase dashboard. Not verified: the fix itself has not been re-tested in the browser, and the badge is still read in the old session until the page is reloaded. The dashboard's "API DISABLED" badges remain unexplained but the API demonstrably works.
- **Commits**: `b067d56` pushed to `origin/main`; Pages deploy passed.
- **Open**: Reload the garage as the free user and expect: cap applied client-side (a second save refused before the server is asked), badge "Role · User · Free". The two refused rows in this account's garage are the queue working as designed; the owner decides whether to clean the sample data. Commit the `member` fix. Then continue: LAY-02/LAY-03 checks, then the plan's Phase 3 (SYN-03 is now done).

### Turn 25 — Two sample cars removed; the one-car cap confirmed end to end

- **Input**: "Free tiers must not be able to add more than one car to their garage. Remove two of them and change the logic so it doesn't allow saving more than one car at all."
- **Output**: The cap logic was already in place from the `member` fix; this turn applied it and verified it. In the user's signed-in free session on the private preview: removed the 2019 SEAT and the 2018 AUDI (leaving the 2027 AUDI the account actually keeps); each removal emptied its refused queue entry, so the red sync line vanished entirely; the limit line went from "3 of 1 … over the limit" to "1 of 1". Then tried a second save from the decoder (Ford F-150 VIN): refused client-side before any request — button reads "Garage full", hint "The Free plan keeps 1 saved vehicle. Remove one first, or move up a plan." — and a final reload showed the garage still holding exactly one car. Committed the `member` fix and the version bump as `7fdde57` and pushed; the live site now has it too. One wording nit recorded: the refusal uses "1 saved vehicle" here but "1 saved vehicle(s)" in the server's message; the garage card flag and the decoder hint come from different sources.
- **Files**: none changed this turn (data actions in the browser plus a commit of the previous turn's fix).
- **Verified**: In the browser on the preview, against the user's own account, with the actions the user explicitly authorised: two removals and one refused save. Confirmed: badge "Role · User · Free", limit line correct at 1 of 1, refused save leaves the garage unchanged. Not verified: the server-side rows after the two removals (soft delete assumed), and the offline/pending path.
- **Commits**: `7fdde57` pushed to `origin/main`.
- **Open**: Wording nit only. Next: LAY-02/LAY-03 checks, then Phase 3, then PLT-01 (needs the vendor decision).

### Turn 26 — Upgrade CTA on the free refusal; all four plans checked through the owner's role preview

- **Input**: "Add a button that says 'upgrade to save more vehicles to your garage' when user tries to save a second vehicle. Only on free tier. Check recursively whether all plans do the same." The owner signed in and authorised switching the role preview through every plan.
- **Output**: Added the CTA in `assets/vin.js`: when a save is refused at the cap, the button reads "Garage full" and — only when `effectivePlan() === "free"` — a ghost link "Upgrade to save more vehicles" to `pricing.html` is inserted after the button. Non-free refusals at the cap get the message but no CTA, as requested. `?v=p23` on all 13 pages; published to the preview. Then tested through the owner's role preview on the browser: Free refused (CTA shown), Pro saved (4 of 5, no CTA), Workshop and Business showed the already-saved state (the Honda was left in from the Pro test), owner view restored. No data was removed or cleared; the Honda added in the Pro view was deliberately left, per the test plan.
- **Files**: `assets/vin.js`; version bump in all 13 HTML pages.
- **Verified**: In the browser (owner session, role preview): free refusal with CTA and pro save confirmed verbatim. Not verified: a non-free refusal at cap (Pro 4/5 — unreachable without filling the garage to 5; Workshop 25 and Business ∞ unreachable), and whether the Pro save reached the server (no console or network).
- **Commits**: none.
- **Open**: Commit and push the CTA. Wording shipped as "Upgrade to save more vehicles" (a ghost link, not the chat's exact sentence). Two nits from the run: the role menu on `garage.html` closes the moment it opens because the page scroll closes it; and a Pro-at-cap refusal with no CTA is unproven. Next: LAY-02/LAY-03 checks, then Phase 3, then PLT-01 (vendor decision pending).

### Turn 27 — Free tier limited to 3 VIN decodes in total (US + European)

- **Input**: "1 — Limit the free tier to 3 decodes combined (eur + US). 2 — Tell me what's next. 3 — Commit and deploy."
- **Output**: Added a decode allowance. `assets/auth.js`: `PLAN_LIMITS.<plan>.decodes` (Free 3, paid plans 0 = no cap; `eu` stays the paid plans' monthly European quota) and four new functions, `decodeUsage`, `canDecode`, `recordDecode`, exported on `CarDNAAuth`. A capped plan keeps the list of VINs it has decoded, per account, in `localStorage` (`cardna.decodes`); a VIN already on the list is decoded again for free; an owner previewing a plan uses `sessionStorage` instead, so testing never uses up the real allowance. `assets/vin.js`: a decode waits for the account to resolve, then is refused with a wall ("The Free plan includes 3 VIN decodes, US or European, and all 3 are used." plus an "Upgrade to keep decoding" button to `pricing.html`) when the cap is reached; a successful decode is recorded after the vPIC answer; the hint shows "N of 3 free decodes left" / "all 3 free decodes used" on capped plans only. Pricing copy aligned: Free card, comparison table and intro on `pricing.html`, the Free card on `index.html`, the Pro card's "Everything in Free" replaced with "Unlimited US VIN decodes" on both, and the Free row of `docs/pricing-feasibility.md`. `?v=p24`.
- **Files**: `assets/auth.js`, `assets/vin.js`, `pricing.html`, `index.html`, `docs/pricing-feasibility.md`; version bump in all 13 pages.
- **Verified**: In the browser, through the owner's role preview (sessionStorage, so no real allowance was spent): Free showed "3 of 3 free decodes left", then 2, 1 and "all 3 free decodes used" across a US Honda, a US Ford (decoded with warnings) and a European Audi (partial decode); the fourth different VIN hit the wall with the upgrade button (href `pricing.html`) and no result; a repeat of a used VIN still decoded without using the allowance; Pro and Owner decoded a fourth VIN with no counter at all. Reloaded pricing page shows the new copy. Not verified: whether a malformed or failed request spends an allowance (code path: recording happens only after a successful vPIC answer); anything with a real free account's own `localStorage` list.
- **Open**: **This is a browser-level limit, not a server-side one.** Clearing site data, a different browser, or a private window starts the count again, and a determined user can bypass it. A server-side count needs a decode-event count in Supabase (`events` already records every decode, kind `decode`) enforced by a database function or the planned European decoder proxy (`PLT-01`). Recommended next, with D-5 (freeze plan prices and caps).
- **Commits**: `1beac6a` pushed to `origin/main` (includes the Turn 26 upgrade link on the free garage refusal).

### Turn 28 — Documents for the fully-wired-later build (no code built)

- **Input**: Build the frontend as if every paid feature and licence exists; put the start icon on every unwired feature; make `instructions.md`, `cardna-fm-plan.md`, `README.md` and the tracker transparent about it; add the rule that all docs and dependencies are updated and that the markdown files are the only reference unless the Boss says otherwise. "Don't build for now."
- **Output**: Created `instructions.md` (authority, the Boss rule, documentation and dependency upkeep, the frontend standard and definition of done, the placeholder convention with the start icon, constraints, the external-API table, the tracker rule, the session routine, standing decisions D9–D11). Created `cardna-fm-plan.md` (the product, the standard, the plan matrix that mirrors `PLAN_LIMITS`, the feature registry F-01…F-27 with status and flag, a wiring contract per unwired feature, what is never faked, the build order P0–P5, and the open decisions). Marked `AGENT.md` as superseded by `instructions.md` and `cardna-fm-plan.md`. Rewrote the README's "what is real" section to state the current truth: the start-icon module and most planned surfaces do not exist yet. Corrected two typos made in the plan's wiring contracts (`CarDNA Billing` and `CarDNA Team` now read `CarDNABilling` and `CarDNATeam`). No application code was changed.
- **Files**: `instructions.md` (new), `cardna-fm-plan.md` (new), `README.md`, `AGENT.md`, `CarDNA-fm-tracker.md`.
- **Verified**: The documents were re-read for the two typos; the plan's `PLAN_LIMITS` table was checked against `assets/auth.js` (Free 1 vehicle, 3 decodes; Pro 5 / 10 EU; Workshop 25 / 40 EU; Business unlimited / 450 EU). Not verified: that every planned feature ID in the README maps to a row in the plan (checked by reading, not by a script); no browser or build check, because no code changed.
- **Commits**: none.
- **Open**: (1) `assets/preview.js` and the `.preview-flag` style (P1) are not written; until they are, the start icon the documents describe does not exist on any page, and the documents say so. (2) `D-12` (payment processor), `D-13` (European vendor), `D-14` (catalogue licence) are referenced in the plan but not yet opened as numbered entries in the Blockers section — to add in the next turn. (3) The pre-existing `Current state` and `Open work` sections above still describe the layout and Supabase work as they stood before this turn; they are refreshed on the next code turn. (4) The existing Turn 27 entry's "Open" item about a server-side count still stands and is tracked as F-26.

### Turn 30 — P1: the start icon, built and placed

- **Input**: "Let's go, P1" — build the preview module, the badge style and the icon on every
  frontend-only feature, per `cardna-fm-plan.md` §7.
- **Output**: `assets/preview.js` — `window.CarDNAPreview` with `flags` (12 keys: `payments`, `euDecode`,
  `overage`, `parts`, `recalls`, `bulkUpload`, `apiKeys`, `seats`, `invoices`, `waitlist`,
  `shareReport`, `gdpr`), `isOn`, `label` (returns "Coming soon", or "" once live) and a repeatable
  `scan()` that fills every `[data-preview]` with an outline star plus the label, hides the badge when its
  flag is true, and points `aria-describedby` at the badge for any `data-preview-for` control. The module
  is loaded on all 13 pages, so placing a badge is now one span. `.preview-flag` added to
  `assets/style.css` (11 px mono, upper-cased by CSS, `--dim`, 12 px above and 8 px below, never animated).
  Nine badges placed: `pricing.html` ×6 (payments above the plan cards, euDecode in the Pro card, bulkUpload
  in Workshop, invoices in Business, overage above the pilot-pricing note, waitlist above the "Nothing is
  charged yet" band), `index.html` ×2 (parts on the Catalogue tab, payments on the Pricing tab),
  `decode.html` ×1 (parts above the "What we do not show" notice). `?v=p25` on all 13 pages.
  Two documented corrections, found while checking surfaces: **F-24 owner analytics is live**, not
  frontend-only — `admin.js` fills the KPI strip and 14-day chart from `events` for owners — and **F-21
  email is live (limited)**: recovery mail works today on Supabase's default mailer, so it must not be
  badged "Coming soon". Both statuses changed in `cardna-fm-plan.md`, the status vocabulary gained
  **live (limited)**, and a new §4.1 records where each badge sits and which flags still await a P2
  surface. `instructions.md` §4 and `README.md` updated to match.
  Two fixes from the first inspection round: the badge's text colour moved from `--dim-2` to `--dim`
  (11 px at 4.2:1 was borderline in light theme; the inspector measured ~7:1 after the change), and its
  top margin went to 12 px so it groups with the element below. Two unrelated defects the same pass
  turned up were also fixed: the "RECENT" VIN row wrapped inline with its first chip on a phone
  (`.recent .dna-key` now takes its own line) and the comparison table's "—" placeholders were too pale in
  light theme (`.compare .no` moved to `--dim`). `?v=p26` published.
- **Files**: `assets/preview.js` (new), `assets/style.css`, `pricing.html`, `index.html`, `decode.html`
  (badges) plus the script include and version bump on the other ten pages; `instructions.md`,
  `cardna-fm-plan.md`, `README.md`, `CarDNA-fm-tracker.md`.
- **Verified**: Private preview, browser inspector, read-only apart from clicking section tabs and the
  theme toggle. Pricing at 1280×800: six badges, correct positions, no overlap with the MOST POPULAR tag,
  cards still aligned, comparison table intact. Index: one badge on the Catalogue tab (above the parts
  diagram), one on the Pricing tab, tabs still switch and the dashboard renders. decode.html: one badge,
  now ~30 px below the list and ~11 px above the notice, so it groups with the notice. Phone 354×593:
  six badges, each on one line, nothing cut off or wrapped. Light theme: all badges legible. The two
  side-fixes were re-checked at phone and desktop and hold. **Not verified**: that a flag set to `true`
  hides its badge (would need a temporary code change), 320 px, and a clean browser with no RECENT row.
- **Commits**: none. Nothing pushed; no public deployment.
- **Open**: P2 — the surfaces behind the remaining flags (`recalls`, `shareReport`, `seats`, `apiKeys`,
  `gdpr`, bulk upload and the team panel on the garage), each finished with all six states and its badge.
  Then commit the batch. The distinct minor items: the Catalogue badge sits level with the right column's
  kicker rather than tight above the drawing (acceptable, recorded rather than fixed), and light theme
  still has very faint card borders on the explainer cards.

### Turn 31 — Committed P1; P2 began with commerce and the account panels

- **Input**: "Commit and push and move to p2."
- **Output**: Committed the whole P1 batch as `67ea757` and pushed to `origin/main` — the start icon, the
  nine badges, `instructions.md`, `cardna-fm-plan.md`, the tracker, `AGENT.md` as superseded, both
  migrations, and the three inspection fixes. Then began P2 with the commerce and account half:
  `assets/surfaces.js`, the runtime that gives every panel its locked / working / not-connected / done /
  error states in one place (a panel declares `data-surface`, `data-call`, `data-needs`, `data-arg` and
  `data-surface-run`; the plan gate reads `PLAN_LIMITS` through `CarDNAAuth.limitsNow()` and shows the
  locked sentence before anything is pressed). Six modules that return the final data shape and refuse
  honestly: `billing.js` (checkout, portal, invoice, overage price), `waitlist.js`, `bulk.js` (real CSV
  parsing and per-row VIN validation, then "not connected"), `api.js`, `team.js`, `account.js`.
  `garage.html` gained "Everything else your plan carries" — bulk upload, API key, team seats, and data
  export/deletion with a typed confirmation. `pricing.html`: the three paid cards' links became buttons
  that call `startCheckout`, print a plain "nothing can be charged yet" line and hand the visitor to a new
  waitlist panel with their plan preselected; the waitlist stores nothing and says so, naming the contact
  address. `?v=p29`.
  Fixed during verification: the panels were 3-up then 2-up at 1280 px (grid minimum 320 px then 280 px,
  now 250 px, so all four fit and each is the width of a pricing card); the delete-confirm field moved
  beside its button so it no longer looks like it might apply to both actions; and every text field is
  16 px on a phone, because the iOS focus zoom was cutting the right edge off the page.
- **Files**: `assets/surfaces.js`, `assets/billing.js`, `assets/waitlist.js`, `assets/bulk.js`,
  `assets/api.js`, `assets/team.js`, `assets/account.js` (all new), `garage.html`, `pricing.html`,
  `assets/style.css`, plus the version bump in all 13 pages; `cardna-fm-plan.md` §4.2, `README.md`,
  this tracker.
- **Verified**: Private preview, browser inspector, no data written. Pricing 1280×800: the three buttons
  match the old links in size; "Start Pro" prints the not-connected line, scrolls to the waitlist and sets
  the dropdown to Pro (Workshop and Business likewise); joining with a test address answers "Nothing was
  stored — the list is not connected yet. Write to hello@gmottomotive.com …" and no network call is made.
  Garage 1280×800: four panels in one row with clean copy, badges above each heading, "Show my API key"
  and "Download everything" answering with their not-connected messages and no download starting. Garage
  390×844: panels stack, inputs and file picker fit, the enlarged fields read correctly. No overflow at
  either width. **Not verified**: the locked state for a Free account on a Workshop panel (needs a plan
  change), the CSV path with a real file (the inspector cannot choose one), light theme on these panels,
  and a second inspector pass failed once with a service error before succeeding.
- **Commits**: `67ea757` (the P1 batch) pushed. The P2 work is uncommitted.
- **Open**: The remaining P2 surfaces — `recalls` and `shareReport` — then P3's free wiring. The "Your data"
  panel's confirm box still does not say which action it belongs to in words, only by position.

### Turn 32 — P2 finished: recalls and the shareable report, then documents, commit and deploy

- **Input**: "Update all documentation (tracker and others) for last turn and this turn. Commit, Deploy,
  and continue by following the plan with the next steps."
- **Output**: Finished P2 with the last two surfaces, in a new "Safety and sharing" section on
  `decode.html`: **Recalls and complaints** (`assets/vehicle.js`, flag `recalls`) and **Shareable report**
  (`assets/report.js`, flag `shareReport`). Both are `.surface` panels on the shared runtime, each with its
  badge, a VIN field and one action; both validate the VIN first ("A VIN is 17 characters and never
  contains I, O or Q.") and then answer with the reason instead of a result — the recalls module names the
  VIN and says nothing was requested, the report module says nothing was copied and shows the `/r/<vin>`
  shape it will produce. Documented the whole P2 batch: the README's status section was rewritten (it
  still described checkout, seats, bulk upload, API keys and export/deletion as "planned, not built"),
  including a table of every finished-but-unwired surface with the decision each waits on; the plan gained
  the two new rows in §4.2, a note that every flag now has a surface except `euDecode`, and its F-16/F-23
  contracts were corrected to the real entry points and signatures; the README's asset table lists the two
  new modules. Fixed the iOS/iPadOS field zoom properly: the 16 px rule now covers `(pointer: coarse)` at
  any width, because a phone showing a desktop-width page was still zooming. `?v=p31`, published, then
  committed and pushed.
- **Files**: `assets/vehicle.js`, `assets/report.js` (new), `decode.html`, `assets/style.css`, all 13 pages
  (version), `README.md`, `cardna-fm-plan.md`, this tracker.
- **Verified**: Private preview, browser inspector. decode.html at 1280×800: both panels in one row of
  equal height at rest, badges above each heading, no overflow; "Check recalls" with an empty field gives
  "Enter the VIN you want to check.", with `1HGCM82633A004352` gives the not-connected sentence naming that
  VIN; "Copy a share link" likewise, quoting `/r/1HGCM82633A004352`; `123` gives the VIN-format error, not
  the coming-soon copy. At 354×593 both stack, fields and buttons fit, messages wrap without clipping.
  Not verified: whether the clipboard really stayed empty (no clipboard access), Enter-in-field behaviour,
  and the locked state for a Free account on the gated garage panels.
- **Commits**: this turn's batch, pushed to `origin/main`; GitHub Pages build checked with `github_checks`.
- **Open**: P3's free wiring, above all recalls (one function body away) and the server-side decode count.
  Every feature now has its interface, so from here the phases are wiring, not layout.

### Turn 33 — P3's first feature: recalls went live, and the badge hid itself

- **Input**: "Update all documentation (tracker and others) for last turn and this turn. Commit, Deploy,
  and continue by following the plan with the next steps."
- **Output**: Committed and pushed the P2 batch (`a138141`, 26 files) — the surface runtime, nine preview
  modules, the garage panels, the checkout buttons and waitlist, and the documents — and checked the Pages
  build. Then took the plan's next step, P3's first free wiring: `assets/vehicle.js` is no longer a stub.
  It decodes the VIN at vPIC's `DecodeVinValues` for make, model and year (a VIN has no recall query of its
  own), then calls NHTSA's `recallsByVehicle` and maps each campaign to the contract's shape. It returns
  up to eight campaigns as HTML — component, summary, remedy, campaign number and date — plus a
  "Showing the first N of M" line; `assets/surfaces.js` gained a `[data-surface-output]` region so a rich
  answer never replaces the sentence that explains it. Make names are title-cased ("HONDA" → "Honda").
  `CarDNAPreview.flags.recalls` is now `true`, so the panel's "Coming soon" badge disappeared on its own —
  the first demonstration that §4's flag contract works as written. Records corrected to match: F-16 is
  **live (limited: the panel; the export is next)**, the instructions' API table says so, the README lists
  recalls as working, and the plan's F-16 "done when" records the half that remains. `?v=p33`.
- **Files**: `assets/vehicle.js`, `assets/surfaces.js`, `assets/style.css`, `decode.html`, `assets/preview.js`,
  all 13 pages (version), `README.md`, `cardna-fm-plan.md`, `instructions.md`, this tracker.
- **Verified**: Private preview, browser inspector, live network. `1HGCM82633A004352` → "24 campaigns on
  record for this 2003 Honda Accord." with eight entries, the truncation note, and no overflow (the card
  simply grows); `1FTFW1ET5DFC10312` → "3 campaigns on record for this 2013 Ford F-150." with no truncation
  line; `123` → the VIN-format error, with the previous list cleared. The summary is title case, contrast is
  legible, and the neighbouring share panel stays top-aligned. Not verified: a VIN with zero campaigns,
  light theme, narrower widths, and the first attempt's message-only version (which the test caught as a
  real gap between the panel's copy and its output).
- **Commits**: `a138141` pushed; this turn's recalls work committed after the same turn.
- **Open**: The export half of F-16 (the garage's Markdown/CSV/PDF/XLSX writers do not carry recalls yet);
  summary and remedy need labels, and NHTSA's mixed date formats are passed through unlabelled. Next in
  P3: the waitlist table, then the data export, then F-26/F-27.

## Approaches tried and rejected

| Approach | Why it was rejected |
|---|---|
| Installing Impeccable with `npx impeccable install` | No terminal, no Node and no package manager on this device; FreeMilk has no skill installer at all |
| Trusting an earlier chat summary for statuses | The summary was stale — the plan's baseline had to be recounted from `git log` and `auth.js` |
| ES modules and an import map for the 3D viewport | Module scripts are refused on some `file:` origins; the r137 classic build loads from anywhere, lazily, with a visible fallback |
| `overflow-x: hidden` on `html` and `body` as a horizontal-scroll backstop | It makes `body` a scroll container: sticky stops working and iOS scrolls in two chained layers. Replaced with `clip` |
| Folding `about.html` and `pricing.html` into tabs | They earn search traffic as real pages (`SHL-03`, `D-7`) |
| A two-row CSS grid for the phone header | The wide account chip set the width of the second grid column and squeezed the logo column until "by GMOttomotive" wrapped at 390 px; flex with a corner menu button and a right-aligned badge instead |
| True "sign in as the user" impersonation | Needs a server-minted token and an audit entry; the read-only preview is the safe version (`D-3`) |

## Decisions log

| # | Decision | Why |
|---|---|---|
| D1 | No build step, no framework, no dependency | GitHub Pages serves files as written; keeping it static keeps deployment to one place |
| D2 | Two hosts only: GitHub Pages and Supabase | No third platform, no server of ours to operate |
| D3 | Role preview is read-only and local | Real impersonation needs a server-minted token and an audit trail |
| D4 | Plans are Free / Pro / Workshop / Business with 1 / 5 / 25 / unlimited vehicles | The cost model in `docs/pricing-feasibility.md` only bears those quotas |
| D5 | Admin grants up to Workshop; owner up to Business; roles owner-only | Least privilege, and a visible line in the console |
| D6 | Skills live in `Skills/` and are git-ignored | Working method for agents, not shipped product |
| D7 | The plan is a generated HTML specification, not prose | Requirement IDs, acceptance criteria and gates are what keep work checkable |
| D8 | Button colour reserved for primary actions, never for decoration | Keeps "one obvious next step" true across the app |

## Open work

Taken from the specification's requirement list; statuses reflect the current working tree and latest known checks. Do not resume project work until the user asks.

1. **P3 continues — the free wiring left** (`cardna-fm-plan.md` §7). The `waitlist` table (one insert-only
   table and one function body, and the waitlist panel starts working); carrying recalls into the exports
   (the other half of F-16); the data export; then the two invisible pieces — the server-side decode count
   (`F-26`) and the VIN cache (`F-27`).
2. **Polish found while testing recalls.** Summary and remedy render as one block with no label, so a
   long campaign is hard to scan; NHTSA's dates arrive in mixed formats (`06/03/2019` next to
   `27/06/2019`) and are passed through unlabelled. Neither is wrong, both are worth a pass.
2. **Finish the P2 batch's loose ends.** The "Your data" confirm box still only says which action it
   belongs to by position; the surface grid's cards end ragged once one gains a message (by design, but
   worth a look); `assets/preview.js` hiding a badge on a live flag is still unproven.
3. **Commit and push the P2 batch** — it is committed in Turn 32 together with the documents.
3. **`LAY-02` / `LAY-03` residual checks.** 320 px and the intermediate widths, native swipe and keyboard
   traversal, active-link marking per route, and non-staff Admin visibility (needs a role change — not
   permitted). Colour and dark-theme contrast were re-checked for the badge only.
4. **Supabase behaviour, not just objects.** A save at the cap, a blocked account, and a staff read of
   `events` have never been exercised. Needs a throwaway account.
5. **`SYN-03`** — the queue, per-car status and retry are built; a browser test with a refusal and an
   offline save is still outstanding.
6. **`F-26` server-side entitlement count.** The 3-decode limit is a browser counter that clearing site
   data resets. This is the biggest gap between what the pricing page sells and what the code enforces.
7. **`PLT-01` — the European decoder proxy**, the change that makes Pro real. Needs `D-13`.
8. **`SHL-01` / `SHL-02` — one document** with hash routes and a single tab bar.
9. **`F-12` commerce** — needs `D-12`; the waitlist placeholder (`F-22`) is the free interim step.
10. **`dna-fm-brain`** — needs a real look on a device.
11. **Plan scroll fix** — stable in FreeMilk phone and desktop previews; confirm in Koder on iOS. Keep the
    internal plan in the private FreeMilk preview; do not publish it to GitHub Pages.
12. **Visual follow-up** — the VIN field-by-field hint above the empty decoder state at 1280 px, the unused
    matrix space, faint light-theme card borders, and the phone landscape black render.

## Blockers and owner decisions

- **SQL not confirmed.** `vehicles.deleted_at`, the vehicle-cap trigger, `status = 'active'` in the
  `vehicles` and `vault_entries` policies, and a staff-read policy on `events` are now in the repository
  as `docs/supabase-migration.sql` (Turn 20), but have not been run. Without them the code paths fall back silently.
- **`D-1`** badge or hamburger in the corner on menu pages — recommendation: keep the menu button.
- **`D-2`** run the four database changes, after exporting a copy of `vehicles`.
- **`D-3`** support view: read-only preview or real impersonation — recommendation: preview only.
- **`D-4`** SMTP provider and sender domain — recommendation: Resend or Brevo on the product domain.
- **`D-5`** freeze the plan prices and caps for launch.
- **`D-6`** keep `Skills/` ignored.
- **`D-7`** keep `about.html` and `pricing.html` as real pages after the shell lands.
- **`D-9`** the four documents (`instructions.md`, `cardna-fm-plan.md`, `README.md`, this tracker) are the only reference; `instructions.md` outranks the rest (decided by the Boss, Turn 28).
- **`D-10`** every unwired feature ships frontend-complete behind the start icon (Turn 28).
- **`D-11`** going live is wiring only: flag plus function, never a redesign (Turn 28).
- **`D-15`** start-icon badge text is **"Coming soon"** on every unwired feature (decided by the Boss, Turn 29). The copy on a feature's own page may say more; the badge does not.
- **`D-12`** payment processor and merchant details — planned, not yet opened for decision.
- **`D-13`** European data vendor and contract — planned, not yet opened for decision.
- **`D-14`** catalogue licence scope and terms — planned, not yet opened for decision.

## Files in play

| File | Why it matters |
|---|---|
| `assets/style.css` | The design system and every layout rule; holds the sticky-header fix |
| `assets/auth.js` | Session, profile, roles, plans, limits, badge, view switcher, polling |
| `assets/admin.js` | Console: accounts, grants, blocking, activity, per-view copy |
| `assets/garage.js` | Cache, Supabase mirror, merge, tombstones, retry queue |
| `assets/vin.js` + `assets/vin-schema.js` | Validation, vPIC decode, the 104-field schema, deep links |
| `assets/vault.js` | PBKDF2 key derivation, AES-256-GCM, encrypted import and export |
| `assets/export.js` | Markdown, CSV, XLSX and print-to-PDF, with plan gating |
| `assets/app.js` | Navigation, tab controller, delegated copy-to-clipboard |
| `assets/motion.js` / `assets/motion.css` | Reveals, tab transitions, pointer glow, the VIN scan |
| `index.html` | App shell: Overview, Decode, Brands, Catalogue, Pricing as tabs |
| `admin.html`, `garage.html`, `decode.html`, `vault.html` | The four work surfaces |
| `.gitignore` | Keeps `Skills/`, `private/` and exports out of the public repository |
| `AGENT.md` | Working agreement and the tracker rule |
| `Skills/claude-mem/` | The handoff and memory-search methods used to write this file |
| `/scratchpad/cardna-restructure-plan.html` | The 33-requirement specification and `dna-fm-brain` |

## Verification log

| Turn | What was checked | Result |
|---|---|---|
| 2 | Badge, dropdown, role switching on the preview | Passed at phone width; tablet untested |
| 3 | Commit and Pages deployment | Commit pushed; live site checked by the user |
| 24 | Live deploy of the shell and sync queue (`b067d56`) | GitHub Actions build and Pages deploy passed; live site serves the new code |
| 6 | Skill download integrity | 88 lines, byte for byte |
| 7 | `Skills/` ignored by git | Confirmed in `git status` |
| 9 | Specification counts against `git log` | Corrected to 9 / 11 / 11 / 2 |
| 11 | Sticky header on garage, pricing, decode | Pinned at y=0 throughout; scroll stops at the footer |
| 11 | Idle scroll drift and blank tail | None in a Chrome phone viewport; iOS not observable |
| 12 | claude-mem download | 6 KB and 8 KB, from `thedotmack/claude-mem` |
| 13 | Tracker written under the AGENT.md rule | Turn 13 entry, chat index count and both log tables re-read and consistent |
| 14 | Initial plan scroll investigation | First mitigation was based on an incorrect restoration/smooth-scroll hypothesis; browser inspection unavailable at that point. Corrected in Turn 15. |
| 15 | Plan masthead fix on FreeMilk preview | Phone and desktop inspector runs stayed stable through idle, scrolling and resize; Koder iOS not verified. Browser console unavailable. |
| 16 | GitHub publication decision | User declined public deployment; no GitHub file, commit or push was made. Private preview remains the test surface. |
| 17 | LAY-02/LAY-03 latest private preview | At 390×844 and 1280×800: shared shell on all 13 routes, responsive header/tab cue and comparison-table hints/frames rendered as described in Turn 17. No swipe/keyboard interaction; 320 px, phone landscape behavior, and Koder/iOS remain unverified. |
| 18 | Handover state and repository status | Read AGENT.md, tracker and handoff skill; checked git status and git log. No new build, publish or browser test. |
| 19 | LAY-02 / LAY-04 / CON-01 on the private preview | Phone 390×844 (about, legal, index): header rows correct, sub-brand one line, chip flush right, tables contained with hints, tab-strip fade intact. Desktop 1280×800 (about, pricing): layout unchanged, hints hidden, nothing past the right edge. 320 px, dark theme, swipe and keyboard remain unverified. |
| 20 | `docs/supabase-migration.sql` | Not run, not verifiable here; checked by reading against `garage.js`, `auth.js`, `admin.js`. Table definitions were not visible. |
| 33 | Recalls live, from the browser against NHTSA | Honda 1HGCM82633A004352 → "24 campaigns … 2003 Honda Accord", eight entries rendered with component/summary/remedy/campaign/date, truncation note, no overflow; Ford 1FTFW1ET5DFC10312 → "3 campaigns", no truncation line; `123` → format error with the list cleared. Title case correct. Not verified: zero-campaign VIN, light theme, narrow widths. |

## Memory pointers

- Specification: `/scratchpad/cardna-restructure-plan.html` — 33 requirements, gates, decisions.
- Economics: `docs/pricing-feasibility.md` — the €0.26 European lookup and the plan margins.
- European layer: `docs/eu-decoder-integration.md` — vendor prices and the proxy design.
- Open data: `docs/open-data-sources.md`.
- Product context: `README.md`.
- Working agreement: `AGENT.md`.
- Method: `Skills/claude-mem/claude-mem.md` for writing this file; `Skills/claude-mem/mem-search.md`
  for layered recall of past work.

## Change log of this file

| Date | Change |
|---|---|
| 13 Nov 2026 | Created. Chat 1 indexed with twelve turns, decisions, open work, blockers, files, verification log. |
| 13 Nov 2026 | Turn 13: tracking active; current state, chat index, verification and change logs updated. |
| 13 Nov 2026 | Turn 14: initial plan scroll diagnosis; corrected in Turn 15 after reviewing the user's screenshots. |
| 13 Nov 2026 | Turn 15: fixed and verified masthead height feedback loop in FreeMilk preview; GitHub Pages publish held pending informed confirmation. |
| 13 Nov 2026 | Turn 16: user declined public GitHub deployment; private FreeMilk preview retained. |
| 13 Nov 2026 | Turn 17 results reconciled after compaction; Turn 18 handover, verification limits and stopped-work status recorded. |
| 14 Nov 2026 | Turn 19: 320 px overflow fixed at source (grid minimum tracks, download menu), mobile header rebuilt as flex with the badge right-aligned on row two, admin and about tables given labelled scroll regions and hints, `?v=p20` across 13 pages, private preview inspected at 390×844 and 1280×800. |

| 14 Nov 2026 | Turn 20: Phase 2 migration written as `docs/supabase-migration.sql`; open work, blockers and chat index updated. |

| 14 Nov 2026 | Turn 21: read-only look at the browser (Supabase SQL Editor with the migration pasted, not run); chat index count updated. |

| 14 Nov 2026 | Turn 22: migration verified in the Supabase dashboard (objects present, behaviour untested); duplicates found; `docs/supabase-migration-2.sql` added; open work and chat index updated. |

| 14 Nov 2026 | Turn 23: second migration confirmed in the dashboard; SYN-03 built (sync queue, status, retry), `?v=p21`, published to the private preview; open work and chat index updated. |

| 14 Nov 2026 | Turn 24: deployed live (`b067d56`); user-account test exposed the `member` role bug, fixed in `auth.js`; `?v=p22`; open work and chat index updated. |
| 14 Nov 2026 | Turn 25: two sample cars removed from the free account's garage; the one-car cap verified end to end in the browser; `member` fix committed (`7fdde57`) and pushed live. |

| 14 Nov 2026 | Turn 26: upgrade CTA on the free-tier refusal only (`?v=p23`); all four plans exercised through the owner's role preview in the browser. |

| 14 Nov 2026 | Turn 27: Free tier capped at 3 VIN decodes in total (client-side, per account on this device); pricing copy aligned; `?v=p24`; committed and deployed. |

| 14 Nov 2026 | Turn 28: `instructions.md` and `cardna-fm-plan.md` created; `AGENT.md` marked superseded; README updated to state what is and is not built; no code changed. |

| 14 Nov 2026 | Turn 29: start-icon badge text set to "Coming soon" (`instructions.md` §4, `cardna-fm-plan.md` §4, decision D-15); no code changed. |

| 15 Nov 2026 | Turn 30: P1 built — `assets/preview.js` (12 flags, `scan`, `aria-describedby`), `.preview-flag` styles, nine badges placed across pricing, index and decode, script loaded on all 13 pages, `?v=p26`; F-21 and F-24 corrected to live, plan §4.1 added with every badge position; three inspection-found fixes (badge contrast and spacing, RECENT row wrap, table dash contrast). |

| 15 Nov 2026 | Turn 31: P1 committed and pushed (`67ea757`); P2 began — `assets/surfaces.js` runtime plus six preview modules, four account panels on the garage, checkout buttons and the waitlist panel on pricing, `?v=p29`; plan §4.2 records where each surface lives and what is left. |

| 15 Nov 2026 | Turn 32: P2 finished — recalls and share panels on `decode.html` with `vehicle.js` and `report.js`; README status section rewritten with the full finished-but-unwired table; plan §4.2 extended, F-16/F-23 contracts corrected; iOS field zoom fixed for touch devices at any width; `?v=p31`; committed, pushed and deployed. |

| 15 Nov 2026 | Turn 33: P3 began — recalls wired live through vPIC and NHTSA's recall feed, list rendering added to the surface runtime, badge removed by its own flag, F-16 marked live (limited), documents corrected, `?v=p33`. |
