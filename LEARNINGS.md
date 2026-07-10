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
### Questions I must be able to answer
- What is an AST? Why is parsing better than regex for finding imports?
- How does ts-morph resolve `import x from "./utils"` to an actual file?
### My answers

---

## Week 3 — The map
(continue the same pattern every week...)
