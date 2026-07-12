// parser.js - use ts-morph to read each file's AST, extract its imports,
// resolve them to real files on disk, and build a { nodes, edges } graph.

import { Project, SyntaxKind } from "ts-morph";
import { existsSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

// Try these in order when an import has no file extension, e.g. "./utils".
const CANDIDATE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

// Resolve one import specifier (the string inside quotes) to an absolute
// path on disk, or return null if it can't be resolved within the repo.
function resolveImportPath(fromFileAbs, specifier) {
  // Only relative imports point at files inside the repo we cloned.
  // "react", "express", "@scope/pkg" etc. are npm packages - not our concern.
  if (!specifier.startsWith(".")) return null;

  const base = resolve(dirname(fromFileAbs), specifier);

  // Case 1: the specifier already points at a real file (rare but valid).
  if (existsSync(base) && statSync(base).isFile()) return base;

  // Case 2: try appending each candidate extension - "./utils" -> "./utils.ts"
  for (const ext of CANDIDATE_EXTENSIONS) {
    const candidate = base + ext;
    if (existsSync(candidate)) return candidate;
  }

  // Case 3: it's a folder - look for its index file - "./services" -> "./services/index.ts"
  if (existsSync(base) && statSync(base).isDirectory()) {
    for (const ext of CANDIDATE_EXTENSIONS) {
      const candidate = join(base, "index" + ext);
      if (existsSync(candidate)) return candidate;
    }
  }

  // Nothing matched - a genuinely broken import, or something we don't handle yet.
  return null;
}

// Collect every module specifier string a file references, covering both
// module systems in the wild:
//   ESM   - import x from "./y"; export { x } from "./y"; import("./y")
//   CJS   - const x = require("./y")
// require() has no dedicated AST node (it's just a function call), so we
// scan every CallExpression and check if the function being called is
// literally named "require" with a single string-literal argument.
function getModuleSpecifiers(sourceFile) {
  const specifiers = [];

  for (const importDecl of sourceFile.getImportDeclarations()) {
    specifiers.push(importDecl.getModuleSpecifierValue()); // import x from "./y"
  }
  for (const exportDecl of sourceFile.getExportDeclarations()) {
    const value = exportDecl.getModuleSpecifierValue();
    if (value) specifiers.push(value); // export { x } from "./y" (re-exports / barrel files)
  }
  for (const call of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const exprText = call.getExpression().getText();
    const isRequire = exprText === "require";
    const isDynamicImport = exprText === "import"; // import("./y") at runtime
    if (!isRequire && !isDynamicImport) continue;

    const [arg] = call.getArguments();
    if (arg && arg.getKind() === SyntaxKind.StringLiteral) {
      specifiers.push(arg.getLiteralValue());
    }
  }

  return specifiers;
}

// files: the array from fileWalker.js -> [{ path, size }, ...] (paths relative to rootDir)
export function buildGraph(rootDir, files) {
  const project = new Project({ useInMemoryFileSystem: false, skipAddingFilesFromTsConfig: true });

  const nodes = files.map((f) => ({ id: f.path, path: f.path, size: f.size }));
  const knownPaths = new Set(files.map((f) => f.path));
  const edges = [];

  for (const file of files) {
    const absPath = join(rootDir, file.path);
    let sourceFile;
    try {
      sourceFile = project.addSourceFileAtPath(absPath);
    } catch {
      continue; // unreadable/unparseable file - skip, don't crash the whole analysis
    }

    for (const specifier of getModuleSpecifiers(sourceFile)) {
      const resolvedAbs = resolveImportPath(absPath, specifier);
      if (!resolvedAbs) continue; // npm package or unresolvable - skip

      const resolvedRel = relative(rootDir, resolvedAbs);
      if (!knownPaths.has(resolvedRel)) continue; // resolved outside our file list - skip

      edges.push({ from: file.path, to: resolvedRel });
    }
  }

  return { nodes, edges };
}
