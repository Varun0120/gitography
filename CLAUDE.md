# Gitography — Project Memory

> Read this file at the start of every session. Update the **Progress Tracker**
> at the end of every session — that's the whole point of this file.

## What Gitography is

"AI agents can answer questions about code — Gitography lets you SEE it.
Instant, visual, exact, no setup." (updated pitch, replaces the original
"Google Maps for a codebase" line as of the UI/UX overhaul below — the
Google Maps framing is still used informally as shorthand for the product
concept, but this is the pitch to lead with.)

Solo portfolio project, fresher (0-1 yr), ~90% AI-assisted coding, 1-2 hrs/day,
zero budget. Two source PDFs live at repo root: `codemap-project-blueprint.pdf`
(v1 — algorithms, security, backend, original week-by-week roadmap, all still
valid) and `gitography-2.0-redesign-blueprint.pdf` (v2 — **replaces v1's
visual/UX sections and week-by-week roadmap**; see below). This file is the
condensed, load-bearing summary of both, kept in sync.

## Locked V1 scope (do not deviate without discussing first)

- **JS/TS only.** Every language needs its own parser; V1 ships one language
  well instead of many badly. Architecture stays extensible for Python/Java
  later (V3+, via tree-sitter).
- **File-level import graph, not function-level.** `profile.js imports auth.js`
  = one arrow. Function-level would be 15,000-30,000 edges on a real repo —
  an unreadable hairball, and call-resolution is a genuinely hard CS problem.
  Zoom-in to function-level is V2+.
- **500-file cap.** Free-tier hosting has ~512MB RAM; parsing is RAM-hungry.
  The cap protects the server from crashing on huge repos (e.g. VS Code's
  7,000+ files) — "a lift saying max 8 persons."
- **AI-assisted, human-owned understanding.** Claude writes most code, but the
  user must be able to re-explain every file in their own words. This is
  enforced by the Teaching Workflow below — non-negotiable.

## The 5 V1 sub-tools (all built on the same import graph)

| Sub-tool | Algorithm | One-liner |
|---|---|---|
| Blast Radius | Reverse BFS/DFS from selected node | "Bomb-damage preview before you edit a file" |
| Dead Code Finder | Nodes with in-degree = 0 (excl. entry points/config) | "Metal detector for zombie files" |
| Circular Dependency Alarm | DFS w/ recursion stack, or Tarjan's SCC | Classic DSA interview topic, built on your own project |
| Onboarding Tour | Topological sort from entry point; optional Gemini one-liners | "Tour guide for a new codebase" |
| Knowledge Map | git blame aggregation, majority author per file | Reveals bus-factor risk; opt-in for public repos |

## V2 — 3 product modes (built after V1 ships)

1. **Time Machine** (signature/viral feature) — slider over sampled git
   snapshots (release tags or monthly, not all commits), animates the graph
   evolving over time. File-level only.
2. **Compare Mode** — two graphs side by side (branches/repos/before-after),
   diffed: new files green, deleted red. Shares its engine with Time Machine.
3. **Code City** — Three.js 3D city: file = building, height = size,
   district = folder, red = hotspot. Pure spectacle, built last (hardest).

4. **Export map as AI-agent context** — feed the dependency graph to coding
   agents (Claude Code, Copilot, etc.) so they don't have to re-derive repo
   structure from scratch, saving their tokens.

Parked for V3+: Ask-the-Map AI chat, Live Mode (webhooks), Repo Report Card,
PR Impact Bot, multi-repo/org map, Hotspot Heatmap, function-level zoom,
Python/Java via tree-sitter.

## Tech stack (all zero cost)

Next.js 15 (React 19) · Cytoscape.js (graph render) · Three.js (V2 Code City)
· Node.js + Express · **ts-morph** (TS AST parser — the heart of the project)
· PostgreSQL, accessed via the raw `pg` client (cache by repo+commit hash —
see Decision Log) · Docker + Docker Compose · Nginx reverse proxy · GitHub
Actions CI/CD · Render/Railway free tier · Gemini free tier (optional,
Onboarding Tour summaries).

## Design System (non-negotiable — applies to ALL frontend work from here on)

Adopted after the raw Week 3 force-graph tested unreadable on a real repo
(axios/axios, 227 files) and the user requested a full UI/UX overhaul
rather than incremental tuning. Every future frontend change must follow
this — not just new features, edits to existing UI too.

- **Theme:** dark. Background `#0B0E14`, cards `#151A23`, borders `#232B38`
  (1px). Never pure black.
- **Text:** `#E6EBF2` primary, `#8A94A6` secondary. Font: Inter (Google
  Fonts). 14px base, 20px section titles, 600 weight for headings only.
- **ONE accent color:** `#4D9FFF` (buttons, links, highlights). Semantic
  colors only beyond that: green `#3FB68B` (healthy), amber `#E5A455`
  (warnings), red `#E5615C` (errors). No rainbow palettes anywhere.
- **Spacing scale:** 4/8/12/16/24/32px only. Cards: 12px radius, 20px
  padding. Generous whitespace — when in doubt, add space.
- Every interactive element needs a hover state. Every async action needs a
  loading **skeleton** (not a spinner). Every empty/error state needs a
  friendly message.
- **Graph styling specifically:** edges curved, 1px, `#2A3341` at 40%
  opacity by default, accent-colored at 100% only on hover/selection. Node
  labels sit in small dark pill chips (`#151A23` bg, 4px 8px padding) so
  they stay readable over lines. Support folders (tests/docs/examples)
  always gray `#4A5568`; core folders use accent-tinted colors. Max 3 node
  colors visible at once.

## Gitography 2.0 — multi-page redesign (supersedes the single-page "Simple-mode dashboard" plan)

Triggered by the same root cause as the design system above (raw force-graph
unreadable on real repos) but the fix went further than restyling: the whole
app becomes a 6-page guided flow instead of one page trying to show
everything at once.

**Three laws (govern every future UI decision):**
1. **Words first, pictures second** — every screen leads with a plain-English
   sentence; visuals support it, never replace it.
2. **The 30-Shape Law** — no view ever renders more than ~30 visual elements.
   227 files → first view shows ~7-10 folders, not 227 circles. Everything
   deeper is one click away.
3. **One idea per page** — Overview = "what is this?", Map = "how is it
   arranged?", Tour = "where do I start reading?", Health = "what's broken?".
   Never mixed on one screen.

**Routes (Next.js App Router):**
| Route | Page |
|---|---|
| `/` | Home — paste a link, 3 example chips (axios/express/chalk), honest-stage progress while analyzing |
| `/r/[owner]/[repo]` | Overview (default after Analyze) — AI summary, tech stack chips, 4 stat cards, tiny static mini-map (max 8 boxes), links to Tour/Health |
| `/r/[owner]/[repo]/map` | Map — the neighborhood explorer (see below) |
| `/r/[owner]/[repo]/tour` | Tour — guided story walkthrough, topological order, ?stop=N in URL |
| `/r/[owner]/[repo]/health` | Health — checkup report, score /100 |
| `/history` | History — past analyses table from `graph_cache` |

Persistent top bar after a repo is analyzed: logo, repo name, [Overview]
[Map] [Tour] [Health] tabs, and a global **Simple/Developer** toggle
(Simple is always the default). Developer mode swaps the Map page for the
existing Week 3 Cytoscape force-graph (kept as-is, zero rework) and shows
raw numbers on Health instead of prose.

**Map page — the big rethink, 3 levels, boxes not circles:**
- **Level 1 (default, ≤10 boxes):** top-level folders as labeled city-block
  boxes, START badge on the entry point, one aggregated arrow per
  folder-pair max. Core folders accent-tinted, support folders
  (tests/docs/examples/scripts) always gray.
- **Level 2 (click a folder):** top-down tree of that folder's direct files
  + subfolders (each subfolder collapses into one box) — never >30 shapes.
- **Level 3 (click a file):** that file centered, its direct
  imports/importers only (one hop, never more) — this is a scoped-down
  version of what the Week 3 side panel already showed.

**Tour page:** stop list + narration panel, order from topological sort
(pure graph algorithm, already plannable without AI), narration lines from
the same Gemini call as Overview (`tourStops` in the JSON). Keyboard
arrows, `?stop=2` in the URL so a tour link is shareable.

**Health page:** score starts at 100; -2 per orphan file (max -20), -8 per
circular dependency chain (max -30), +10 for a single clear entry point.
This page **is** the Dead Code Finder + Circular Dependency Alarm sub-tools
from the v1 blueprint, presented as a report instead of graph decoration —
same underlying algorithms (in-degree 0 detection, DFS cycle detection),
different presentation layer.

**Backend response shape (`POST /analyze` — this changes):**
```
{ fileGraph, folderGraph, stats: { entryPoint, coreFolder, topFile, healthScore, orphans[], cycles[] },
  techStack[], ai: { overview, folderDescriptions, tourStops }, cached }
```
One call, cached as one `graph_cache` row, every page reads from it — no
per-page API calls.

**New backend pieces (none built yet):**
- `backend/src/services/ai-summarizer.js` — ONE Gemini call per
  repo+commit: first 100 README lines + `package.json` + folder list +
  top-10 hubs (never full source). Strict JSON out:
  `{ overview, folderDescriptions, tourStops }`. Cached in a new
  `graph_cache` column. **Must degrade gracefully** — if the call fails or
  no key is configured, every page still renders fully from derived data
  (stat cards, map, tour, health all work without AI; only the AI summary
  strip and per-file narration lines are skipped/replaced with a derived
  one-liner, e.g. "A JavaScript library. Core: lib/, 54 files."). **Gemini
  API key status: user does not have a key yet** — build this piece now
  with the graceful-degradation path fully working, wire the real call
  behind `process.env.GEMINI_API_KEY`, add the var name (not a real key)
  to `.env.example`, but do not block other work on getting a key.
- Tech stack detector — dictionary of ~40 known deps → plain-English
  one-liners ("React - builds the buttons and screens you see"); unknown
  deps batched into the same Gemini call.
- `health.js` — orphan detection (in-degree 0, excluding entry/config
  files), cycle detection (DFS), score formula above.
- `GET /repos/recent` — for the History page, straight from `graph_cache`.

**Jargon tooltips:** static glossary (~30 terms), dotted underline, plain
English on hover. No AI calls on hover — this is a static lookup table, not
a live feature.

**New frontend dependency, confirmed:** `cytoscape-dagre` — Cytoscape.js
has no built-in hierarchical/top-down layout algorithm; dagre adds one, used
for the Level 1/2 box map and (unchanged) the Developer-mode force-graph
stays on `cose`.

**2.0 build schedule (target: resume-ready in 6-8 weeks) — replaces the v1
week-by-week roadmap below for everything UI-related; v1's algorithm/backend
weeks (parser, caching, sub-tool algorithms) remain valid, just resequenced
into this schedule's pages:**
| Week | Ship | Checkpoint |
|---|---|---|
| 1 | Multi-page skeleton (6 routes + topbar + Simple/Developer toggle), design system applied globally, Home page complete, Overview with derived stats (no AI yet) | Screenshot review of Home + Overview |
| 2 | Map page: Level 1 neighborhoods, Level 2 folder tree, Level 3 file focus; Developer toggle wired to existing force-graph | Screenshot review of all 3 map levels |
| 3 | Gemini integration + Tour page + tech stack cards + Health page | Full click-through demo on axios + express |
| 4 | History page, jargon tooltips, polish pass (skeletons, empty states, mobile check) | "5-year-old test" — show someone non-technical, watch them use it |
| 5 | DevOps: multi-stage builds, GitHub Actions CI/CD, deploy LIVE, HTTPS, uptime check | Public URL works from a phone |
| 6 | README with GIFs + architecture diagram, LEARNINGS.md final, 90s demo video, resume bullet drafted | Send README + video for review |
| 7-8 | Buffer. If clear: Story-mode polish, one V2 teaser, Show HN draft | — |

**Definition of done:** deployed at a public URL, all 6 pages work desktop
+ mobile, axios/express/chalk all analyze cleanly, AI failure degrades
gracefully, README has GIFs + architecture diagram, LEARNINGS.md covers
every week, 90s video exists, resume bullet written.

**Resume bullet (drafted in the blueprint):** "Built and deployed
Gitography — a full-stack tool (Next.js, Node, PostgreSQL, Docker, GitHub
Actions CI/CD) that turns any GitHub repo into a plain-English, visual
explanation: AI summary, guided reading tour, and architecture health
report. Designed a progressive-disclosure UI after real usability testing
showed raw dependency graphs fail non-expert users."

## Decision Log (deliberate deviations from the original blueprint)

- **Gitography 2.0 multi-page redesign, superseding the single-page
  "Simple-mode dashboard" plan from the previous session.** That plan (AI
  summary strip + stat cards + dagre map bolted onto the existing one-page
  layout) was mid-implementation (Stage 1: design system, done) when the
  user delivered a full second blueprint (`gitography-2.0-redesign-blueprint.pdf`)
  diagnosing that even a restyled single page can't fix "227 files on one
  screen" — the real fix is 6 focused pages + the 30-Shape Law. This is a
  deliberate, user-directed pivot on top of an already-deliberate pivot;
  the v1 blueprint's algorithms/security/parser/caching work all remain
  valid, only the UI/UX plan and roadmap sequencing changed (twice now).
  Current build order follows the 2.0 build schedule above, not the older
  4-stage plan.
- **UI/UX overhaul + design system, ahead of the Week-by-week roadmap.**
  The v1 blueprint's roadmap put Gemini in Week 5 (Onboarding Tour) and
  treated the graph UI as "done" after Week 3. The user requested jumping
  this forward after Week 3's raw graph proved unreadable on real repos —
  deliberate, user-directed, not silent drift.
- **Postgres client: raw `pg`, not Prisma.** The blueprint originally named
  Prisma. Decided against it in Week 2: `graph_cache` is one table with a
  dead-simple shape (repo, commit_hash, graph, created_at) — Prisma's
  schema file, migration system, and generated client are overhead for a
  query that's 3 lines of parameterized SQL. Bonus for interviews: "I wrote
  a parameterized query with `$1`/`$2` to prevent SQL injection" is a
  stronger, more concrete answer than "Prisma handled it." Revisit only if
  the schema grows enough relationships that hand-written SQL gets
  genuinely repetitive.

## Week-by-week roadmap (v1 — algorithms/backend still valid; UI/UX weeks superseded by the 2.0 build schedule above)

| Week | Build | Must understand for interviews |
|---|---|---|
| 1 | Monorepo skeleton, Docker Compose (postgres+api+frontend+nginx), sandboxed shallow clone (`POST /analyze`) | Child processes, shallow clone, sandboxing untrusted repos |
| 2 | ts-morph parser: walk JS/TS, extract imports, resolve paths/aliases, exclude node_modules, output graph JSON, cache in Postgres by repo+commit | What an AST is; why parsing beats regex |
| 3 | Cytoscape.js force layout map: color by folder, size by connections, click → side panel, search | Graph layout basics; canvas vs SVG at 500 nodes |
| 4 | Sub-tools part 1: Blast Radius, Dead Code, Circular Deps | Reverse BFS, in-degree, cycle detection — all classic DSA |
| 5 | Sub-tools part 2: Knowledge Map (git blame), Onboarding Tour (topo sort + optional Gemini) | Topological sort; git plumbing |
| 6 | Polish/hardening: loading states, friendly errors, rate limiting, cache UX | Defensive programming; UX for slow ops |
| 7 | DevOps: multi-stage Dockerfiles, resource-limited parser container, Nginx+HTTPS, GitHub Actions pipeline, deploy | Multi-stage builds, container resource limits, pipeline design |
| 8 | Showcase: README, LEARNINGS.md finalized, 90s demo video | Telling the story: problem → decisions → tradeoffs → results |
| 9-10 | Buffer. If ahead: start Time Machine snapshot engine | Honest scheduling |
| V2 | Time Machine → Compare Mode → Code City → launch (Show HN, r/webdev, dev.to, LinkedIn/X) | ~6-8 more weeks at same pace |

## Progress Tracker

> **UPDATE THIS AT THE END OF EVERY SESSION.** This is the single source of
> truth for "where are we."

- **Current week:** Gitography 2.0 — Week 1 (multi-page skeleton) functionally
  complete and verified live; LEARNINGS.md written but "My answers" for
  Week 3 and 2.0-Week 1 quizzes are **deferred** (user chose to keep
  building first, answer later — do not forget to circle back).
- **Done (Week 1, v1):** `docker compose up --build` verified, Express
  analyzed live, friendly error handling confirmed, full request trace
  explained, 7 cloner.js security decisions taught/quizzed, LEARNINGS.md
  Week 1 filled in. Project renamed CodeMap → **Gitography**; pushed to
  `github.com/Varun0120/gitography` (branch `main`).
- **Done (Week 2, v1):** Added `ts-morph`; wrote `parser.js` — extracts
  imports from both ESM and CommonJS, resolves relative paths. Added
  Postgres caching by `(repo, commit_hash)`. Found/fixed a real bug
  (Express returned 0 edges until `require()` detection was added).
  LEARNINGS.md Week 2 fully answered.
- **Done (Week 3, v1) + Design System overhaul:** Built `GraphView.jsx`
  (Cytoscape `cose` force layout, color-by-folder, size-by-degree, click
  side panel, debounced search). Tested on `axios/axios` (227 files),
  found it unreadable, root-caused and fixed: orphan nodes excluded from
  the physics simulation (were dumped in a fallback grid), edges dimmed by
  default and highlighted only on hover/select, hub-file labels added, and
  a real flexbox+canvas resize feedback loop fixed with `minWidth: 0`.
  Adopted the Design System (dark theme, one accent color, 3-color-max
  folder palette, Inter, skeleton loaders) — `theme.js` + `globals.css`,
  applied globally.
- **Done (Gitography 2.0 — Week 1):** Full pivot from single-page to
  6-route multi-page app per the 2.0 blueprint (three laws: words-first,
  30-Shape Law, one-idea-per-page). Built: all 6 Next.js App Router routes
  exist (`/`, `/r/[owner]/[repo]`, `/map`, `/tour`, `/health`, `/history`);
  `RepoDataContext.jsx` + `layout.jsx` (shared top bar, tabs, Simple/
  Developer toggle, one fetch shared across all repo-scoped pages); Home
  page (hero, input, 3 example chips, honest-stage progress theater);
  Overview page (derived stat cards, 8-box mini-map with START badge, CTAs
  to Tour/Health — no AI yet, `ai: null` is the graceful-degradation
  state). Backend `POST /analyze` response shape changed to
  `{ fileGraph, folderGraph, stats, techStack, ai, cached }` — new
  `stats.js` (entry point/core folder/top file/orphans/cycles/health
  score) and `folderGraph.js` (file graph → one box per top folder).
  Found/fixed a real bug live: entry-point detection first picked a test
  file on `expressjs/cors` (fallback heuristic considered all files, not
  just non-support ones) — fixed with a priority chain: `package.json`
  `main` field → root conventional filename → index file inside core
  folder → highest out-degree among non-support files only. `graph_cache`
  truncated once after the shape change (stale rows from the old shape
  would have broken the new frontend on a cache hit). Verified end-to-end
  in the browser on `axios/axios`: correct entry point/core folder/top
  file/health score, correct mini-map with START badge on `(root)/`, Map
  stub route renders correctly behind the topbar. `GraphView.jsx` is kept
  in place, currently unreferenced by any route — wires into `/map` as
  Developer mode in 2.0 Week 2, per explicit user choice.
- **Next:** Circle back and answer the deferred Week 3 / 2.0-Week 1
  LEARNINGS.md questions with the user. Commit + push 2.0 Week 1. Then
  2.0 Week 2 — Map page (Level 1 neighborhoods via `cytoscape-dagre`,
  Level 2 folder tree, Level 3 file focus) + wire `GraphView.jsx` into
  `/map` as Developer mode.
- **Open bugs/issues (not yet fixed, just tracked):**
  - `fileWalker.js` truncation check (`files.length > MAX_FILES`) runs once
    per directory popped off the stack, not once per file — so a truncated
    response can return somewhat more than `MAX_FILES` files. Soft cap, not
    a security issue.
  - `frontend/Dockerfile` has no `USER` directive — runs as root, unlike the
    backend's `USER node`. Lower risk since frontend doesn't touch untrusted
    repo content directly, but inconsistent with the stated security story.
  - `NEXT_PUBLIC_API_URL` is defined in docker-compose but unused in
    `frontend/app/page.jsx`, which hardcodes `/api/analyze` instead.
  - `.env.example` only documents Postgres creds — doesn't mention
    `MAX_REPO_MB`, `MAX_FILES`, `CLONE_TIMEOUT_MS`, `PORT` (all have code
    defaults, so not broken, just incomplete docs).
  - No rate-limiting on `POST /analyze` — mitigated only by per-request
    resource caps, not request throttling. Fine for Week 1 scope.
  - No git repo initialized yet in this directory.

## Teaching Workflow (non-negotiable — follow every session)

### Beginner Mode (in effect from Week 2 onward — treat the user as a total beginner)

Before writing the code for **any new thing** — a new npm package, a new
function, a new API endpoint, a new piece of logic, a new database concept,
a new file — explain it first, using all five of these, in order:

1. **SIMPLE explanation** — plain English, zero jargon, as if explaining to
   a friend with no coding background.
2. **ANALOGY** — an everyday-life comparison (e.g. an AST is "a sentence
   broken into grammar parts"; a cache is "a sticky note so you don't redo
   work").
3. **TECHNICAL explanation** — the real, correct technical term and
   definition, precise enough to say out loud in an interview.
4. **WHY THIS WAY** — why this tool/approach over the obvious alternative
   (e.g. why ts-morph instead of regex, why Postgres instead of a JSON file).
5. **WHAT HAPPENS INSIDE vs OUTSIDE** — for anything involving a
   request/response, containers, or the database: trace explicitly what the
   browser sees/sends, what the backend does internally, what leaves the
   container, what stays inside.

Keep each explanation short (a few lines per point) — clarity over length.
Explain BEFORE writing the code for that piece, not after.

**Before giving the explanation**, ask first which depth the user wants for
that specific new thing: **full explanation** (all 5 points), **simple
terms only** (just points 1-2, skip the technical/why/inside-outside
detail), or **skip** (go straight to code, no explanation this time). Don't
launch into a full explanation unprompted — ask, then match what's given.

After a full or simple explanation (not after a skip), ask: **"Do you want
to go deeper into anything here, or should I continue?"** and offer 2-3
specific optional sub-topics (e.g. "want to see a real AST tree for one
line of code?", "want to see the raw Postgres row this produces?"). Wait
for the user's choice before moving on to the next piece.

### Standard rules (still apply on top of Beginner Mode)

1. After completing **every feature**, stop and give a 15-minute explanation:
   what we built, why we built it this way, what alternatives existed.
2. Then quiz with 3-5 interview-style questions about it and **wait for the
   user's answers**. Correct mistakes — don't just confirm.
3. Then help write the answers **in the user's own words** into
   `LEARNINGS.md` under the correct week.
4. **Never mark a feature "done" until LEARNINGS.md is updated for it.**
5. Update the Progress Tracker at the end of every session.

## Coding rules

- Follow the roadmap week by week — do not skip ahead, even if it looks easy.
- Keep the security decisions in `backend/src/services/cloner.js` intact
  (regex validation, `execFile` not `exec`, shallow clone, timeout, size cap,
  tmpfs, cleanup). If a change is needed there, flag it and explain why first.
- Explain any new dependency before adding it (cost, why it's needed, what it
  replaces).
- Prefer simple, readable code over clever code — the user has to explain
  this project in interviews.
