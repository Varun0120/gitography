// cloner.js - safely clone an untrusted repo
//
// THE FOUR SAFETY LAYERS (explain these in interviews):
// 1. execFile (not exec)  -> arguments passed as an array, NO shell involved,
//                            so user input can never inject shell commands.
// 2. --depth 1            -> shallow clone: only the latest snapshot, not the
//                            full history. 10-100x faster and smaller.
// 3. Timeout              -> a giant repo can't hang our server forever.
// 4. Size check + cleanup -> if it's too big we delete it immediately, and we
//                            ALWAYS delete after analysis (see analyze.js).
//
// Extra layer from docker-compose.yml: the clone dir is a tmpfs (RAM disk)
// with a 200MB cap, and the whole container is limited to 512MB RAM / 1 CPU.

import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { promisify } from "node:util";
import { join } from "node:path";
import { statSync, readdirSync } from "node:fs";

const execFileAsync = promisify(execFile);

const CLONE_BASE = "/tmp/codemap-clones";
const CLONE_TIMEOUT_MS = Number(process.env.CLONE_TIMEOUT_MS || 60_000);
const MAX_REPO_MB = Number(process.env.MAX_REPO_MB || 100);

export async function cloneRepo(owner, repo) {
  // Unique temp dir per request, e.g. /tmp/codemap-clones/clone-Xy12ab
  const dir = await mkdtemp(join(CLONE_BASE, "clone-"));
  const url = `https://github.com/${owner}/${repo}.git`;

  try {
    await execFileAsync(
      "git",
      [
        "clone",
        "--depth", "1",          // shallow: latest commit only
        "--single-branch",        // default branch only
        "--no-tags",              // skip tags
        url,
        dir,
      ],
      {
        timeout: CLONE_TIMEOUT_MS,
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: "0", // never hang asking for credentials
        },
      }
    );
  } catch (err) {
    await cleanup(dir);
    if (err.killed) {
      const e = new Error("clone timeout");
      e.code = "CLONE_TIMEOUT";
      throw e;
    }
    const e = new Error("clone failed");
    e.code = "CLONE_FAILED";
    throw e;
  }

  // Size guard: refuse to analyze monsters
  const sizeMb = dirSizeMb(dir);
  if (sizeMb > MAX_REPO_MB) {
    await cleanup(dir);
    const e = new Error(`Repo is ${Math.round(sizeMb)}MB - over the ${MAX_REPO_MB}MB V1 limit.`);
    e.code = "REPO_TOO_LARGE";
    throw e;
  }

  return dir;
}

export async function cleanup(dir) {
  try {
    await rm(dir, { recursive: true, force: true });
  } catch {
    // Best effort - tmpfs also wipes itself when the container restarts
  }
}

// Recursively sum directory size (skips .git to measure actual code size)
function dirSizeMb(dir) {
  let bytes = 0;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.name === ".git") continue;
      const full = join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) bytes += statSync(full).size;
    }
  }
  return bytes / (1024 * 1024);
}
