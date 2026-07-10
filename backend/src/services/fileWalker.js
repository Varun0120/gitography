// fileWalker.js - walk the cloned repo and collect JS/TS source files
//
// Week 2 will feed this list into ts-morph to extract imports.
// For now it returns relative paths + file sizes (node size in the map later).

import { readdirSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";

const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);

// Folders that would pollute the map with noise
const IGNORED_DIRS = new Set([
  ".git", "node_modules", "dist", "build", "out", ".next",
  "coverage", ".cache", "vendor",
]);

const MAX_FILES = Number(process.env.MAX_FILES || 500);

export function walkFiles(rootDir) {
  const files = [];
  let truncated = false;

  const stack = [rootDir];
  while (stack.length) {
    if (files.length > MAX_FILES) {
      truncated = true;
      break;
    }
    const current = stack.pop();
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue; // unreadable dir - skip, don't crash
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name) && !entry.name.startsWith(".")) {
          stack.push(join(current, entry.name));
        }
      } else if (entry.isFile() && SOURCE_EXTENSIONS.has(extname(entry.name))) {
        const full = join(current, entry.name);
        files.push({
          path: relative(rootDir, full),   // e.g. "src/routes/analyze.js"
          size: statSync(full).size,       // bytes - node size in the map
        });
      }
    }
  }

  return { files, truncated };
}
