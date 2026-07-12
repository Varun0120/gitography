# Gitography — Project Memory

> Read this file at the start of every session. Update the **Progress Tracker**
> at the end of every session — that's the whole point of this file.

## What Gitography is

"Gitography is a web tool that helps developers understand any unfamiliar GitHub
repo by generating a visual, clickable map of how files and functions connect
— without spending days reading code manually." Google Maps for a codebase.
Solo portfolio project, fresher (0-1 yr), ~90% AI-assisted coding, 1-2 hrs/day,
zero budget. Full detail lives in `codemap-project-blueprint.pdf` (repo root)
— this file is the condensed, load-bearing summary.

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

## Decision Log (deliberate deviations from the original blueprint)

- **Postgres client: raw `pg`, not Prisma.** The blueprint originally named
  Prisma. Decided against it in Week 2: `graph_cache` is one table with a
  dead-simple shape (repo, commit_hash, graph, created_at) — Prisma's
  schema file, migration system, and generated client are overhead for a
  query that's 3 lines of parameterized SQL. Bonus for interviews: "I wrote
  a parameterized query with `$1`/`$2` to prevent SQL injection" is a
  stronger, more concrete answer than "Prisma handled it." Revisit only if
  the schema grows enough relationships that hand-written SQL gets
  genuinely repetitive.

## Week-by-week roadmap

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

- **Current week:** Week 2 — ts-morph parser + Postgres caching (functionally
  complete, LEARNINGS.md filled in)
- **Done (Week 1):** `docker compose up --build` verified, Express analyzed
  live, friendly error handling confirmed, full request trace explained,
  7 cloner.js security decisions taught/quizzed, LEARNINGS.md Week 1 filled
  in. Project renamed CodeMap → **Gitography**; pushed to
  `github.com/Varun0120/gitography` (branch `main`).
- **Done (Week 2):** Added `ts-morph`; wrote `backend/src/services/parser.js`
  — extracts imports from both ESM (`import`) and CommonJS (`require`,
  including re-exports and dynamic `import()`), resolves relative paths
  (extensionless, folder→index, node_modules/unresolvable skipped).
  `POST /analyze` now returns `{ repo, fileCount, nodes, edges, cached }`.
  Added `db.js` (Postgres pool + `graph_cache` table, created on backend
  startup) and `cache.js` (get/save by `(repo, commit_hash)` key); added
  `getCommitHash()` to `cloner.js`. Verified end-to-end: found and fixed a
  real bug (Express returned 0 edges until `require()` detection was added;
  now 141 nodes/158 edges), confirmed cache miss→hit cycle (2.29s → 1.09s)
  with the actual Postgres row inspected, confirmed a second distinct repo
  cache-misses correctly, confirmed invalid-URL error path still works.
  Taught/quizzed AST vs regex, ESM vs CommonJS, why commit-hash (not repo
  name) is the cache key, and require() detection via CallExpression scan.
  Beginner Teaching Mode (5-point explain, ask-depth-first) adopted as a
  standing rule for the rest of the project.
- **Next:** Commit + push Week 2 work. Then start Week 3 — Cytoscape.js
  interactive map rendering (color by folder, node size by connections,
  click → side panel, search).
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
