// stats.js - derive human-meaningful facts from the raw file graph.
// Pure functions, no I/O - same { nodes, edges } shape parser.js builds.

const SUPPORT_FOLDER_RE = /^(test|tests|__tests__|spec|specs|docs|doc|examples|example|demo|fixtures|scripts|sandbox)$/i;
const ENTRY_CANDIDATES = ["index.js", "index.ts", "main.js", "main.ts", "app.js", "app.ts"];

function topFolder(path) {
  const slash = path.indexOf("/");
  return slash === -1 ? "(root)" : path.slice(0, slash);
}

function computeDegrees(nodes, edges) {
  const inDeg = new Map(nodes.map((n) => [n.id, 0]));
  const outDeg = new Map(nodes.map((n) => [n.id, 0]));
  for (const e of edges) {
    outDeg.set(e.from, (outDeg.get(e.from) ?? 0) + 1);
    inDeg.set(e.to, (inDeg.get(e.to) ?? 0) + 1);
  }
  return { inDeg, outDeg };
}

// DFS cycle detection with a recursion-stack ("gray set"). A back-edge to
// a node currently on the stack means the path from that node back to
// itself is a cycle - classic A imports B imports C imports A.
function findCycles(nodes, edges) {
  const adj = new Map(nodes.map((n) => [n.id, []]));
  for (const e of edges) {
    if (adj.has(e.from)) adj.get(e.from).push(e.to);
  }
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map(nodes.map((n) => [n.id, WHITE]));
  const stack = [];
  const cycles = [];
  const seen = new Set();

  function dfs(u) {
    color.set(u, GRAY);
    stack.push(u);
    for (const v of adj.get(u) || []) {
      if (color.get(v) === GRAY) {
        const idx = stack.indexOf(v);
        const cycle = stack.slice(idx);
        const key = [...cycle].sort().join("|");
        if (!seen.has(key)) {
          seen.add(key);
          cycles.push(cycle);
        }
      } else if (color.get(v) === WHITE) {
        dfs(v);
      }
    }
    stack.pop();
    color.set(u, BLACK);
  }

  for (const n of nodes) {
    if (color.get(n.id) === WHITE) dfs(n.id);
  }
  return cycles;
}

export function computeStats(nodes, edges, packageMain = null) {
  const { inDeg, outDeg } = computeDegrees(nodes, edges);
  const knownPaths = new Set(nodes.map((n) => n.path));

  // Core folder: the busiest non-support folder - "the engine room".
  // Computed before entryPoint below, since one of the entry-point
  // fallbacks looks for an index file inside this folder.
  const folderCounts = new Map();
  for (const n of nodes) {
    const f = topFolder(n.path);
    if (SUPPORT_FOLDER_RE.test(f)) continue;
    folderCounts.set(f, (folderCounts.get(f) ?? 0) + 1);
  }
  const coreFolder = [...folderCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Entry point, in priority order:
  //  1. package.json's "main" field - the actual source of truth for what
  //     a repo considers its entry point.
  //  2. A conventional filename at the repo root (index.js, main.js, ...).
  //  3. That same conventional filename inside the core folder (e.g.
  //     lib/index.js) - common for libraries with no root-level entry file.
  //  4. Fallback: among NON-support files only, whichever imports the most
  //     others. Restricting to non-support files matters - without it, a
  //     test file that imports lots of test helpers can win by accident.
  let entryPoint = null;
  if (packageMain && knownPaths.has(packageMain)) {
    entryPoint = packageMain;
  }
  if (!entryPoint) {
    for (const name of ENTRY_CANDIDATES) {
      if (knownPaths.has(name)) { entryPoint = name; break; }
    }
  }
  if (!entryPoint && coreFolder) {
    for (const name of ENTRY_CANDIDATES) {
      const candidate = `${coreFolder}/${name}`;
      if (knownPaths.has(candidate)) { entryPoint = candidate; break; }
    }
  }
  if (!entryPoint) {
    const nonSupport = nodes.filter((n) => !SUPPORT_FOLDER_RE.test(topFolder(n.path)));
    const pool = nonSupport.length > 0 ? nonSupport : nodes;
    if (pool.length > 0) {
      entryPoint = [...pool].sort((a, b) => (outDeg.get(b.id) ?? 0) - (outDeg.get(a.id) ?? 0))[0].path;
    }
  }

  // Top file: highest in-degree - the file the most other files depend on.
  const topFile = nodes.length
    ? [...nodes].sort((a, b) => (inDeg.get(b.id) ?? 0) - (inDeg.get(a.id) ?? 0))[0].path
    : null;

  // Orphan = a file nothing imports and that imports nothing itself - a
  // real "dead code" signal ONLY inside core folders. Test/docs/examples
  // files are standalone by nature (a test file isn't "dead" just because
  // nothing imports it), so support folders are excluded here entirely -
  // otherwise every repo's test suite inflates this number meaninglessly.
  const orphans = nodes
    .filter((n) => !SUPPORT_FOLDER_RE.test(topFolder(n.path)))
    .filter((n) => (inDeg.get(n.id) ?? 0) === 0 && (outDeg.get(n.id) ?? 0) === 0)
    .map((n) => n.path);

  const cycles = findCycles(nodes, edges);

  // Health score formula (Gitography 2.0 blueprint): start at 100,
  // -2 per orphan file (max -20), -8 per circular chain (max -30),
  // +10 for having one clear entry point.
  let healthScore = 100;
  healthScore -= Math.min(20, orphans.length * 2);
  healthScore -= Math.min(30, cycles.length * 8);
  if (entryPoint) healthScore += 10;
  healthScore = Math.max(0, Math.min(100, healthScore));

  return { entryPoint, coreFolder, topFile, healthScore, orphans, cycles };
}
