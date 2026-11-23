# AGENT.md — how to work on CarDNA-fm

> **Superseded.** This file was replaced by `instructions.md` (the working rules) and
> `cardna-fm-plan.md` (what to build). It is kept for history only; where it disagrees with
> `instructions.md`, `instructions.md` wins. Do not add to this file.

Read this before touching anything. It is the working agreement for every agent session on this
project, not a description of the product (that is `README.md`).

## 0. Start here, every session

1. Read `README.md` — what the site is and what each file does.
2. Read `CarDNA-fm-tracker.md` — the project's memory: every chat, every turn, what was done,
   what was verified, what is open. It is the source of truth when a chat has been compacted.
3. Read `Skills/claude-mem/claude-mem.md` — the handoff method this project uses to write the tracker.
4. Check `git status` and `git log` before believing anything about the current state.

## 1. The tracker rule (non-negotiable)

**This project has exactly one memory file: `CarDNA-fm-tracker.md`.** Every chat must keep it current.
A chat that ends without an entry is a chat whose work is lost.

### What goes in, per turn

For every user input and every agent output, append a summary to the chat's turn log:

- **Input** — what the user asked, in their own words where the wording matters, plus anything they
  decided or refused.
- **Output** — what the agent actually did: files changed, behaviour added or fixed, commands run,
  what was published.
- **Files** — paths touched, relative to the repository root.
- **Verified** — what was checked, how, and with what result. If it was not checked, write
  "not verified". Never imply a test that did not happen.
- **Commits** — hashes, and whether they were pushed.
- **Open** — what is left, including anything the user must do.

### What never goes in

- Passwords, API keys, tokens, session cookies, personal data, or full transcripts.
- Guesses presented as facts. If something is unconfirmed — an SQL migration, a device behaviour, a
  preview result — write it as unconfirmed and say who has to confirm it.

### Rules of the file

- **Append, never rewrite.** History stays. Corrections are a new dated line: "Correction — …".
- **One section per chat.** A new chat adds a row to the index and a new `## Chat N` section; it never
  edits an earlier chat's turns.
- **One entry per turn**, even small ones. A one-line turn deserves a one-line entry.
- **Keep the two live sections current.** `## Current state` and `## Open work` are updated at the end
  of every turn, not only when a phase lands.
- **After a compaction**, before doing anything else, write the surviving record of that chat into the
  tracker. The summary is the only thing left of the earlier turns.
- **Length**: summary, not replay. Aim for a paragraph per turn, not a transcript.

### Format

```markdown
### Turn N — <short title>

- **Input**: …
- **Output**: …
- **Files**: …
- **Verified**: …
- **Commits**: …
- **Open**: …
```

The tracker also follows the claude-mem handoff shape — goal, current state, files in play, what has
been tried and why it failed, next steps, constraints — because that is what a fresh agent needs first.

## 2. Project constraints

- Static site. No build step, no bundler, no framework migration, no dependencies. Files are served as
  written by GitHub Pages.
- Two hosts only: GitHub Pages for files, Supabase for accounts and rows. Never add a third platform
  without the owner asking for it.
- `assets/supabase-config.js` holds the project URL and the publishable key. **Never** put a secret or a
  database password in the repository.
- Never commit generated or exported data: `private/`, `*.cardna`, `cardna-vault-*`, `cardna-vins-*`,
  and `Skills/` are in `.gitignore`.
- Plans are Free / Pro / Workshop / Business with 1 / 5 / 25 / unlimited saved vehicles, 3 / 10 / 40 /
  450 European decodes, and Markdown / +CSV+PDF / +XLSX exports. These numbers live in
  `assets/auth.js` (`PLAN_LIMITS`) and `docs/pricing-feasibility.md` — change both or neither.
- Commit only when the user asks. Push only commits they have seen.

## 3. Quality floor

- Check the page at 320, 390, 768, 1024, 1280 and 1440 before calling layout work done.
- Keyboard pass: sign in, switch role, save a vehicle, export, sign out.
- Reduced motion must show the same information with no animation.
- One asset version constant per release: bump `?v=` in every page together.
- Never claim something was tested in a browser unless it was. Say what you could not check.

## 4. Skills in this repository

`Skills/` holds working notes for agents. They are not shipped and not loaded by FreeMilk; they are
there so a coding session that reads the folder has the method.

| Skill | File | Use it for |
|---|---|---|
| claude-mem (handoff) | `Skills/claude-mem/claude-mem.md` | Writing the tracker and handoffs: goal, state, tried-and-failed, next steps |
| claude-mem (mem-search) | `Skills/claude-mem/mem-search.md` | Layered recall — search, timeline, then fetch only the records that matter |
| impeccable | `Skills/impeccable/impeccable.md` | Design critique, audit, polish, copy, layout |
| frontend-design | `Skills/frontend-design/frontend-design.md` | Committed visual direction, production frontend craft |
| diagram-design | `Skills/diagram-design/diagram-design.md` | Architecture, data model and sequence diagrams as SVG |

## 5. Where the plan lives

The restructuring plan is `/scratchpad/cardna-restructure-plan.html` — a specification with 33 numbered
requirements, acceptance criteria, gates and a 3D architecture viewport (the `dna-fm-brain` tab). Its
requirement IDs are stable and are referenced by the tracker and by commit messages.

Superseded: the v1.0 3D node map. The tracker wins over any earlier chat summary.
