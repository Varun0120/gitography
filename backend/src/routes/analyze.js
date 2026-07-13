// POST /analyze
// Body: { "repoUrl": "https://github.com/owner/repo" }
//
// SECURITY MINDSET (interview gold):
// The URL comes from an untrusted stranger on the internet.
// We validate it strictly BEFORE it goes anywhere near a shell command.
// Never build shell strings from user input - that's how command injection happens.

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { cloneRepo, cleanup, getCommitHash } from "../services/cloner.js";
import { walkFiles } from "../services/fileWalker.js";
import { buildGraph } from "../services/parser.js";
import { getCachedGraph, saveGraph } from "../services/cache.js";
import { computeStats } from "../services/stats.js";
import { buildFolderGraph } from "../services/folderGraph.js";

// package.json's "main" field is the most reliable entry-point signal a
// repo can give us - read it if present. Best-effort: a missing/malformed
// package.json just means computeStats falls back to its own heuristics.
function readPackageMain(clonePath) {
  try {
    const pkgPath = join(clonePath, "package.json");
    if (!existsSync(pkgPath)) return null;
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    return typeof pkg.main === "string" ? pkg.main.replace(/^\.\//, "") : null;
  } catch {
    return null;
  }
}

// Strict GitHub URL pattern: https://github.com/owner/repo (nothing else)
// Rejects: extra paths, query strings, ../ tricks, non-github hosts
const GITHUB_URL_RE = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(\.git)?$/;

export async function analyzeRoute(req, res) {
  const { repoUrl } = req.body ?? {};

  // 1. Validate input
  if (!repoUrl || typeof repoUrl !== "string") {
    return res.status(400).json({ error: "repoUrl is required" });
  }
  const match = repoUrl.trim().match(GITHUB_URL_RE);
  if (!match) {
    return res.status(400).json({
      error: "Invalid URL. Expected format: https://github.com/owner/repo",
    });
  }
  const [, owner, repo] = match;

  let clonePath = null;
  try {
    // 2. Shallow clone into a sandboxed temp dir (see cloner.js for the limits)
    clonePath = await cloneRepo(owner, repo);
    const repoKey = `${owner}/${repo}`;
    const commitHash = await getCommitHash(clonePath);

    // 2b. Cache check - same repo + same commit = identical files, so if
    // we've already analyzed this exact commit before, skip straight to it.
    // The whole 2.0 response payload is cached as one JSONB blob, so every
    // page (Overview/Map/Tour/Health) reads from a single cache hit.
    const cached = await getCachedGraph(repoKey, commitHash);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    // 3. Walk the tree, collect JS/TS files (respecting MAX_FILES cap)
    const result = walkFiles(clonePath);

    if (result.truncated) {
      return res.status(413).json({
        error: `Repo exceeds the ${process.env.MAX_FILES || 500}-file limit for V1.`,
        fileCount: result.files.length,
      });
    }

    // 4. Parse every file with ts-morph and build the file-level import graph.
    const fileGraph = buildGraph(clonePath, result.files);

    // 5. Derive folder-level graph + human-meaningful stats from the same data.
    const folderGraph = buildFolderGraph(fileGraph.nodes, fileGraph.edges);
    const packageMain = readPackageMain(clonePath);
    const stats = computeStats(fileGraph.nodes, fileGraph.edges, packageMain);

    const payload = {
      repo: repoKey,
      fileCount: result.files.length,
      fileGraph,
      folderGraph,
      stats,
      techStack: [], // populated in 2.0 Week 3 (tech stack detector)
      ai: null,      // populated in 2.0 Week 3 (Gemini) - null is the graceful-degradation state
    };

    // 6. Save to cache for next time, keyed by this exact commit.
    await saveGraph(repoKey, commitHash, payload);

    return res.json({ ...payload, cached: false });
  } catch (err) {
    console.error("analyze failed:", err.message);
    // Map known failures to friendly messages
    if (err.code === "CLONE_TIMEOUT") {
      return res.status(504).json({ error: "Clone timed out. Repo may be too large." });
    }
    if (err.code === "CLONE_FAILED") {
      return res.status(422).json({ error: "Could not clone. Is the repo public and the URL correct?" });
    }
    if (err.code === "REPO_TOO_LARGE") {
      return res.status(413).json({ error: err.message });
    }
    return res.status(500).json({ error: "Analysis failed unexpectedly." });
  } finally {
    // ALWAYS delete the clone - success or failure.
    // Untrusted code should live on our server for seconds, not minutes.
    if (clonePath) await cleanup(clonePath);
  }
}
