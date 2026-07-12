// cache.js - read/write the graph_cache table.
// Cache key = (repo, commit_hash): the same commit of the same repo always
// has the same file contents, so its graph never needs to be recomputed.

import { pool } from "./db.js";

export async function getCachedGraph(repo, commitHash) {
  const { rows } = await pool.query(
    "SELECT graph FROM graph_cache WHERE repo = $1 AND commit_hash = $2",
    [repo, commitHash]
  );
  return rows[0]?.graph ?? null;
}

export async function saveGraph(repo, commitHash, graph) {
  await pool.query(
    `INSERT INTO graph_cache (repo, commit_hash, graph)
     VALUES ($1, $2, $3)
     ON CONFLICT (repo, commit_hash) DO NOTHING`,
    [repo, commitHash, graph]
  );
}
