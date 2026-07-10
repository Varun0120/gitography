# Gitography 🗺️

> Gitography is a web tool that helps developers understand any unfamiliar GitHub
> repo by generating a visual, clickable map of how files connect — without
> spending days reading code manually.

**Status: Week 1 — skeleton + clone engine** (see `codemap-project-blueprint.pdf` for the full plan)

## Run it

Requirements: Docker Desktop (or Docker Engine + Compose).

```bash
docker compose up --build
```

Then open **http://localhost:8080**, paste a small public repo
(try `https://github.com/expressjs/express`) and hit Analyze.

## Architecture (Week 1)

```
browser ──> nginx :8080 ──┬──> /api/* ──> backend :4000 ──> git clone (sandboxed tmpfs)
                          └──> /*     ──> frontend :3000        │
                                          postgres <────────────┘ (caching arrives Week 2)
```

## Project structure

```
codemap/
├── docker-compose.yml      # 4 services: postgres, backend, frontend, nginx
├── nginx/nginx.conf        # reverse proxy: /api -> backend, / -> frontend
├── backend/
│   ├── Dockerfile
│   └── src/
│       ├── index.js               # Express app
│       ├── routes/analyze.js      # POST /analyze — validation + orchestration
│       └── services/
│           ├── cloner.js          # sandboxed shallow clone (the security story)
│           └── fileWalker.js      # collect JS/TS files
├── frontend/
│   ├── Dockerfile
│   └── app/                       # Next.js: URL input + results list
└── LEARNINGS.md                   # interview prep — fill it every week!
```

## Week 1 checklist

- [x] Run `docker compose up --build` successfully
- [x] Analyze the Express repo and see its file list
- [x] Try an invalid URL — see the friendly error
- [ ] Try a huge repo — see the size-limit error
- [ ] Read every file in `backend/src` and understand each line
- [ ] Fill in the Week 1 section of LEARNINGS.md
- [ ] Push to a new GitHub repo (first commit!)

## Security decisions (already in the code — learn them)

1. **Strict URL validation** — regex allows only `https://github.com/owner/repo`
2. **`execFile`, never `exec`** — no shell, no command injection
3. **Shallow clone + timeout + size cap** — untrusted repos can't exhaust us
4. **tmpfs clone dir** — untrusted code lives in RAM, wiped on restart
5. **Container resource limits** — 512MB / 1 CPU cap on the parser
6. **Non-root container user** — least privilege
7. **Postgres unexposed** — only reachable inside the Docker network

## Roadmap

Week 2: ts-morph parser → real dependency graph • Week 3: interactive map (Cytoscape.js)
Week 4-5: Blast Radius, Dead Code, Circular Deps, Onboarding Tour, Knowledge Map
Week 7: CI/CD + deploy • V2: Time Machine, Compare Mode, Code City
