// db.js - Postgres connection pool + one-time table setup.
//
// A "pool" keeps a handful of open connections ready to reuse instead of
// opening/closing a new one for every request - opening a DB connection is
// slow, so we pay that cost once at startup, not on every /analyze call.

import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Runs once when the backend container starts. CREATE TABLE IF NOT EXISTS
// is safe to run every time - it's a no-op if the table already exists,
// which matters because the container restarts on every `docker compose up`.
export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS graph_cache (
      repo        TEXT NOT NULL,
      commit_hash TEXT NOT NULL,
      graph       JSONB NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (repo, commit_hash)
    );
  `);
}
