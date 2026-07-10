// POST /analyze
// Body: { "repoUrl": "https://github.com/owner/repo" }
//
// SECURITY MINDSET (interview gold):
// The URL comes from an untrusted stranger on the internet.
// We validate it strictly BEFORE it goes anywhere near a shell command.
// Never build shell strings from user input - that's how command injection happens.

import { cloneRepo, cleanup } from "../services/cloner.js";
import { walkFiles } from "../services/fileWalker.js";

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

    // 3. Walk the tree, collect JS/TS files (respecting MAX_FILES cap)
    const result = walkFiles(clonePath);

    if (result.truncated) {
      return res.status(413).json({
        error: `Repo exceeds the ${process.env.MAX_FILES || 500}-file limit for V1.`,
        fileCount: result.files.length,
      });
    }

    // Week 1 output: the file list.
    // Week 2 will parse these files with ts-morph and return { nodes, edges }.
    return res.json({
      repo: `${owner}/${repo}`,
      fileCount: result.files.length,
      files: result.files,
    });
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
    // 4. ALWAYS delete the clone - success or failure.
    // Untrusted code should live on our server for seconds, not minutes.
    if (clonePath) await cleanup(clonePath);
  }
}
