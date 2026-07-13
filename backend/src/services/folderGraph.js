// folderGraph.js - aggregate the file-level graph into a folder-level
// graph (one box per top-level folder). Used by the Map page's Level 1
// view and the Overview mini-map - both need "folders", not 227 files.

const SUPPORT_FOLDER_RE = /^(test|tests|__tests__|spec|specs|docs|doc|examples|example|demo|fixtures|scripts|sandbox)$/i;

function topFolder(path) {
  const slash = path.indexOf("/");
  return slash === -1 ? "(root)" : path.slice(0, slash);
}

export function buildFolderGraph(nodes, edges) {
  const counts = new Map();
  for (const n of nodes) {
    const f = topFolder(n.path);
    counts.set(f, (counts.get(f) ?? 0) + 1);
  }

  const folderNodes = [...counts.entries()]
    .map(([folder, fileCount]) => ({
      id: folder,
      fileCount,
      isSupport: SUPPORT_FOLDER_RE.test(folder),
    }))
    .sort((a, b) => b.fileCount - a.fileCount);

  // One weighted edge per folder pair, aggregated from every file-level
  // import that crosses folder boundaries. Same-folder edges are dropped -
  // "lib/a.js imports lib/b.js" isn't interesting at the folder zoom level.
  const edgeWeights = new Map();
  for (const e of edges) {
    const from = topFolder(e.from);
    const to = topFolder(e.to);
    if (from === to) continue;
    const key = `${from}=>${to}`;
    edgeWeights.set(key, (edgeWeights.get(key) ?? 0) + 1);
  }
  const folderEdges = [...edgeWeights.entries()].map(([key, weight]) => {
    const [from, to] = key.split("=>");
    return { from, to, weight };
  });

  return { nodes: folderNodes, edges: folderEdges };
}
