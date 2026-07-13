# LEARNINGS.md — my interview preparation file

> Rule: after every feature, I spend 15 minutes writing what was built and WHY,
> in my own words. If I can't explain it here, I don't understand it yet.

---

## Week 1 — Skeleton & clone engine

### What we built
A 4-container app (postgres, backend, frontend, nginx) run with
`docker compose up --build`. Nginx is the only door open to the outside
world, at `localhost:8080`. When I paste a GitHub URL and hit Analyze, the
backend safely clones that repo into a temporary RAM folder, lists all its
JS/TS files, and deletes the clone — every time, success or failure. I
verified this live: analyzing `expressjs/express` correctly returned 141
files, and typing a bad/non-GitHub URL returned a clean error message
instead of crashing.

### Questions I must be able to answer
- Why `execFile` instead of `exec`? What is command injection?
- Why a shallow clone (`--depth 1`)? What does it skip?
- Why does the clone directory use tmpfs (RAM disk)?
- Why does the backend container have CPU/memory limits?
- Why is Postgres not exposed on any public port?
- What is Docker layer caching and why does the Dockerfile copy package.json first?
- Why does nginx sit in front instead of exposing frontend/backend directly?

### My answers

**execFile vs exec / command injection:** There are two separate safety
steps. First, we check the URL itself — a strict pattern only lets in
things shaped like `https://github.com/owner/repo`, so junk/malicious URLs
get rejected right away. Second — and this is what execFile is actually
for — even a URL that *looks* fine could contain sneaky characters. `exec`
hands our whole command as one sentence to a translator program (the
shell), and that translator can misread special characters as "run this
extra command too" — that's command injection. `execFile` instead hands
git separate sealed boxes (`git`, `clone`, the URL) that can never be
misread as new instructions, no matter what's inside them.

**Shallow clone (`--depth 1`):** A normal git clone downloads not just
today's files but the entire history of every change ever made to the
project — for a big repo that history alone can be gigabytes, even though
the current files are small. We only need the code as it looks *right now*
to draw the map, so `--depth 1` tells git "skip all the old history, just
give me the latest snapshot." Much faster and smaller.

**tmpfs (RAM disk):** The clone folder is backed by RAM, not the normal
hard drive. It's like doing a stranger's paperwork on a whiteboard instead
of filing it on paper — the moment the container restarts, everything on
it is wiped clean automatically, so a stranger's code can never quietly
linger on our server permanently.

**CPU/memory limits on the backend:** This container is the one room that
lets strangers walk in (it clones and reads other people's code), so no
matter how big the app grows later, this specific container always stays
locked to 1 CPU / 512MB. That way even a huge or malicious repo can't hog
resources and take down the rest of the app.

**Postgres not exposed:** Only nginx has a port open to the outside world
(`8080`). Postgres has no port mapping at all, so it can only be reached by
other containers talking to it internally as `postgres:5432` — there's
literally no door for anyone outside the Docker network to knock on.

**Docker layer caching:** Docker builds an image in steps ("layers") and
reuses ones that haven't changed. The Dockerfile copies `package.json`
first and runs `npm install` before copying the rest of the source code —
so if I only change my own code (not dependencies), Docker skips
re-running `npm install` and reuses the cached layer, making rebuilds much
faster.

**Why nginx sits in front:** Nginx is like the receptionist at the front
desk of a building — it's the only door open to the street. The frontend
and backend rooms have no doors to the outside at all; visitors ask the
receptionist for what they want and it quietly routes them internally
(`/api/*` to the backend, everything else to the frontend). That means we
only have one door to lock down and watch, instead of three.

---

## Week 2 — The parser
### What we built
Added `ts-morph` to the backend and wrote `parser.js`, which reads every
JS/TS file the Week 1 file walker found, builds its AST, and pulls out
every import — both modern `import ... from "./x"` (ESM) and older
`const x = require("./x")` (CommonJS), since real repos like Express still
use the old style. Each import gets resolved to a real file on disk
(handling extensionless imports, folders with an `index` file, and
skipping npm packages). `POST /analyze` now returns a real graph —
`{ nodes: [{id, path, size}], edges: [{from, to}] }` — instead of a flat
file list. Added a Postgres `graph_cache` table keyed by `(repo,
commit_hash)`, so re-analyzing a commit we've already parsed skips parsing
entirely and returns instantly with `cached: true`.

Verified live: `expressjs/express` first returned 0 edges (a real bug —
our parser only recognized `import`, not `require`) — fixed by detecting
`require()` calls too, then it correctly returned 141 nodes / 158 edges.
Cache tested with a real hit/miss cycle (2.29s miss → 1.09s hit) and
confirmed the actual row stored in Postgres.

### Questions I must be able to answer
- What is an AST? Why is parsing better than regex for finding imports?
- How does ts-morph resolve `import x from "./utils"` to an actual file?
- Why does the cache key use commit hash instead of just the repo name?
- Why does detecting `require(...)` require scanning for call expressions
  instead of a dedicated AST node like `import` has?

### My answers

**AST / regex vs parsing:** An AST (Abstract Syntax Tree) is a tree that
represents the grammatical structure of code — like a grammar teacher
diagramming a sentence into subject/verb/object, but for code. Regex can't
reliably find every import because imports come in many valid shapes
(`import x`, `import {a,b}`, multi-line, `require(...)`, text that merely
looks like an import inside a comment or string) — a pattern search either
misses real ones or matches fake ones. ts-morph uses the same grammar
engine as the real TypeScript compiler, so it understands meaning, not
just text shape.

**How ts-morph resolves imports:** ts-morph itself just tells us the raw
import string (e.g. `"./utils"`) — resolving *that* to a real file on disk
is logic I wrote myself in `resolveImportPath()`: try the path as-is, then
try appending each extension (`.ts`, `.js`, etc.), then if it's a folder,
look for its `index` file. Only relative paths (starting with `.`) get
resolved — bare names like `"express"` are npm packages, not files in the
repo.

**Why commit hash, not just repo name:** The cache has to guarantee
correctness, not just speed. If I cached by repo name alone, a new commit
pushed tomorrow would incorrectly get served yesterday's stale graph.
`commit_hash` is a fingerprint of the exact code — same hash always means
identical files, so it's always safe to reuse; a different hash
automatically causes a fresh parse, with no manual cache-expiry logic
needed.

**Why require() needs a different detection method:** `require(...)`
isn't special language syntax the way `import` is — it's just a normal
function call that happens to be named `require`. There's no dedicated
"this is an import" AST node for it like `ImportDeclaration`. So the code
scans every function-call node in the file and checks whether the function
being called is literally named `require` with one string argument.

---

---

## Week 3 — The map (Cytoscape.js) + Design System overhaul

### What we built
Added `cytoscape` to the frontend and built `GraphView.jsx`: a force-directed
(`cose` layout) interactive graph where nodes = files (colored by folder,
sized by connection count) and edges = imports, with click-to-inspect side
panel and a debounced search box that highlights/zooms to matches.

Tested live on a real 227-file repo (`axios/axios`) and found it genuinely
unreadable — a dense "hairball" of same-weight edges plus a confusing grid
of disconnected dots at the bottom. Root-caused and fixed:
- **Orphan grid** — files with zero connections have nothing pulling on
  them in a force layout, so Cytoscape dumps them in a fallback grid. Fixed
  by excluding degree-0 nodes from the physics simulation entirely and
  listing them separately in a collapsible panel instead.
- **Edge clutter** — every edge was the same brightness, so 150+ edges on
  screen were all equally illegible. Fixed by dimming edges to near-zero
  opacity by default and only lighting them up (accent blue) when their
  node is hovered or selected.
- **No labels** — nothing was identifiable without clicking. Fixed with
  always-on labels for the top 10 "hub" (most-connected) files, plus
  hover-to-reveal labels for everything else.
- **A real flexbox+canvas resize feedback loop** — the side panel appeared
  to "slide sideways forever." Root cause: Cytoscape resizes its `<canvas>`
  to match its container, but the flex column tried to grow to fit the
  canvas's own pixel size, which had just been resized to match the
  column — each resize retriggered the other. Fixed with `minWidth: 0` on
  the flex item, the standard fix for this exact category of bug.

Then adopted a full **Design System** (dark theme, one accent color
`#4D9FFF`, restricted 3-color-plus-gray folder palette instead of a
10-color rainbow, 4/8/12/16/24/32px spacing scale, Inter font, hover states
on every interactive element, skeleton loaders instead of spinners) and
applied it globally via `theme.js` (shared constants) + `globals.css`
(hover/skeleton CSS Cytoscape/inline-styles can't express).

### Questions I must be able to answer
- Why does a force-directed layout put disconnected nodes in a grid, and
  why is that actually useful information rather than a bug?
- What problem does dimming edges by default and highlighting on
  hover/select actually solve?
- What was the real root cause of the "sliding side panel" bug, and why
  did `minWidth: 0` fix it?
- Why cap the folder color palette at 3 colors instead of one per folder?

### My answers
(deferred — continuing to build first, will come back and answer before
this feature is marked fully done, per the "never mark done until
LEARNINGS.md is answered" rule)

---

## Gitography 2.0 — Week 1: multi-page skeleton

### What we built
A second, larger redesign: after the restyled force-graph still proved
hard to parse on a 227-file repo, pivoted from "one page trying to show
everything" to a 6-page guided app (Home, Overview, Map, Tour, Health,
History), governed by three rules — words before pictures, the **30-Shape
Law** (no screen ever shows more than ~30 visual items), and one idea per
page.

Built this week: all 6 Next.js App Router routes exist (`/`,
`/r/[owner]/[repo]`, `/map`, `/tour`, `/health`, `/history`); a persistent
top bar with Overview/Map/Tour/Health tabs and a Simple/Developer toggle
(`RepoDataContext.jsx` + `layout.jsx`); the Home page (hero, input, 3
example-repo chips, honest-stage "progress theater" while analyzing); and
the Overview page with real derived stats (no AI yet) — stat cards for
entry point, core folder, most-relied-upon file, and a health score, plus
a tiny static mini-map (max 8 folder boxes) as an appetizer for the full
Map page.

Backend `POST /analyze` response shape changed to
`{ fileGraph, folderGraph, stats, techStack, ai, cached }` — one call, one
cached row, every future page reads from it. New: `stats.js` (entry-point
detection, core folder, top file, orphan/cycle detection, health score
formula) and `folderGraph.js` (aggregates the file graph into one box per
top-level folder). Found and fixed a real bug live: entry-point detection
first picked a *test file* on `expressjs/cors` because the fallback
heuristic considered all files, not just non-test ones — fixed with a
priority chain (package.json's `main` field → conventional root filename →
index file inside the core folder → highest out-degree among non-support
files only).

Verified end-to-end on `axios/axios`: correct entry point (`index.js`),
core folder (`lib/`), top file (`lib/utils.js`), health score (90/100),
and an accurate 8-folder mini-map with the START badge correctly placed on
the `(root)/` box.

### Questions I must be able to answer
- Why does `app/r/[owner]/[repo]/page.jsx` match both `/r/axios/axios` and
  `/r/expressjs/express`?
- Why does the top bar only need to be written once, in `layout.jsx`,
  instead of once per page?
- Why did we have to `TRUNCATE` the `graph_cache` table after changing the
  `/analyze` response shape — what would have broken if we hadn't?
- What was wrong with the original entry-point detection logic, and what
  fixed it?

### My answers
(deferred — continuing to build first, will come back and answer before
this feature is marked fully done)
