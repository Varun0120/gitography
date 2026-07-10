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
· PostgreSQL + Prisma (cache by repo+commit hash) · Docker + Docker Compose ·
Nginx reverse proxy · GitHub Actions CI/CD · Render/Railway free tier ·
Gemini free tier (optional, Onboarding Tour summaries).

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

- **Current week:** Week 1 — monorepo skeleton + sandboxed clone engine
- **Done:** `docker compose up --build` verified working (all 4 containers
  healthy). Analyzed `expressjs/express` live — 141 files returned correctly.
  Invalid URL / non-GitHub URL / missing body all return clean `400`s with
  friendly messages, not raw 500s. Full request trace (browser → nginx →
  backend → cloneRepo → walkFiles → response) explained end-to-end.
  Taught and quizzed the 7 cloner.js security decisions (+ Docker layer
  caching); user answered in their own words, corrected where needed,
  LEARNINGS.md Week 1 fully filled in.
- **Next:** Week 1 is functionally complete. Remaining checklist items:
  try a huge repo to see the size-limit error path (optional, nice-to-have
  verification); `git init` + first commit + push to a new GitHub repo.
  Then start Week 2 — the ts-morph parser.
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

1. After completing **every feature**, stop and give a 15-minute explanation:
   what we built, why we built it this way, what alternatives existed.
2. Then quiz with 3-5 interview-style questions about it and **wait for the
   user's answers**. Correct mistakes — don't just confirm.
3. Then help write the answers **in the user's own words** into
   `LEARNINGS.md` under the correct week.
4. **Never mark a feature "done" until LEARNINGS.md is updated for it.**

## Coding rules

- Follow the roadmap week by week — do not skip ahead, even if it looks easy.
- Keep the security decisions in `backend/src/services/cloner.js` intact
  (regex validation, `execFile` not `exec`, shallow clone, timeout, size cap,
  tmpfs, cleanup). If a change is needed there, flag it and explain why first.
- Explain any new dependency before adding it (cost, why it's needed, what it
  replaces).
- Prefer simple, readable code over clever code — the user has to explain
  this project in interviews.
