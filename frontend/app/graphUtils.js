// graphUtils.js - pure helper functions for turning { nodes, edges } into
// visual properties (color, size). No Cytoscape or React here on purpose -
// these are plain, easily-testable functions.

import { CORE_FOLDER_COLORS, COLORS } from "./theme.js";

const SUPPORT_FOLDER_PATTERN = /^(test|tests|__tests__|spec|specs|docs|doc|examples|example|demo|fixtures)$/i;

// "src/routes/analyze.js" -> "src". A file at the repo root ("index.js")
// has no folder, so it gets its own bucket.
export function topFolder(path) {
  const slash = path.indexOf("/");
  return slash === -1 ? "(root)" : path.slice(0, slash);
}

// "src/routes/analyze.js" -> "analyze.js". Full paths are too long to use
// as always-visible map labels - the filename alone is what a person
// actually reads at a glance.
export function basename(path) {
  const slash = path.lastIndexOf("/");
  return slash === -1 ? path : path.slice(slash + 1);
}

export function isSupportFolder(folder) {
  return SUPPORT_FOLDER_PATTERN.test(folder);
}

// Design system caps visible node colors at 3 (plus gray for support
// folders) - no rainbow palettes. Test/docs/examples folders always render
// gray regardless of name, so the eye can immediately deprioritize them;
// every other ("core") folder name deterministically hashes to one of the
// 3 accent-tinted colors, so the same folder always gets the same color
// across re-analyses.
export function colorForFolder(folder) {
  if (isSupportFolder(folder)) return COLORS.graphSupport;

  let hash = 0;
  for (let i = 0; i < folder.length; i++) {
    hash = (hash * 31 + folder.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % CORE_FOLDER_COLORS.length;
  return CORE_FOLDER_COLORS[index];
}

// For every node, count how many edges touch it in either direction.
// This is "in-degree + out-degree" - files that import a lot AND files
// that get imported a lot both end up looking bigger.
export function computeDegrees(nodes, edges) {
  const degree = new Map(nodes.map((n) => [n.id, 0]));
  for (const edge of edges) {
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
  }
  return degree;
}

// Scale a degree count into a node diameter (px), so the busiest hub file
// isn't so huge it dwarfs everything else on screen.
export function sizeForDegree(degree, maxDegree) {
  const MIN_SIZE = 18;
  const MAX_SIZE = 60;
  if (maxDegree === 0) return MIN_SIZE;
  const ratio = degree / maxDegree;
  return Math.round(MIN_SIZE + ratio * (MAX_SIZE - MIN_SIZE));
}
