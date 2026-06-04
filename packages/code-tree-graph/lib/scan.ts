/**
 * @file Directory scanning and file-tree construction utilities.
 */
import fs from "fs";
import path from "path";
import type { AnalysisItem, FileTreeNode } from "./types";
import { ASSET_EXTS, IGNORE, PARSEABLE_EXTS } from "./constants";
import { analyzeFile } from "./analyze-ts";

/**
 * Check whether a relative path matches any entry in the ignore set.
 *
 * Matches against the full relative path as well as each individual segment.
 */
function matchesIgnore(relPath: string, patterns: Set<string>): boolean {
  if (patterns.has(relPath)) return true;
  for (const seg of relPath.split("/")) {
    if (patterns.has(seg)) return true;
  }
  return false;
}

/**
 * Recursively scan a directory and build an array of {@link FileTreeNode}s.
 *
 * @param dirPath - Absolute path of the directory to scan.
 * @param basePath - Root path used to compute relative paths.
 * @param extraIgnore - Additional patterns to skip.
 */
export function scanDir(dirPath: string, basePath: string, extraIgnore: Set<string>): FileTreeNode[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const nodes: FileTreeNode[] = [];
  for (const entry of entries) {
    if (IGNORE.has(entry.name) || entry.name.startsWith(".")) continue;
    const fullPath = path.join(dirPath, entry.name);
    const relPath = path.relative(basePath, fullPath).replace(/\\/g, "/");
    if (matchesIgnore(relPath, extraIgnore)) continue;
    if (!entry.isDirectory() && ASSET_EXTS.has(path.extname(entry.name).toLowerCase())) continue;
    if (entry.isDirectory()) {
      const children = scanDir(fullPath, basePath, extraIgnore);
      const pkgPath = path.join(fullPath, "package.json");
      let packageDependencies: string[] | undefined;
      let packageExports: AnalysisItem[] | undefined;

      if (fs.existsSync(pkgPath)) {
        try {
          const pkgJson = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
          const combinedDeps: string[] = [];
          if (pkgJson.dependencies) combinedDeps.push(...Object.keys(pkgJson.dependencies));
          if (pkgJson.peerDependencies) combinedDeps.push(...Object.keys(pkgJson.peerDependencies));
          if (combinedDeps.length > 0) packageDependencies = [...new Set(combinedDeps)];

          const mainFile = pkgJson.exports?.['.']?.import || pkgJson.exports?.['.']?.require || pkgJson.exports?.['.']?.default || pkgJson.main || pkgJson.module || "index.ts";
          const resolvedMainPaths = [
            path.resolve(fullPath, mainFile),
            path.resolve(fullPath, "src", mainFile),
            path.resolve(fullPath, "src/index.ts"),
            path.resolve(fullPath, "index.ts"),
          ];

          for (const mainPath of resolvedMainPaths) {
            if (fs.existsSync(mainPath)) {
              const analysis = analyzeFile(mainPath);
              if (analysis && analysis.exports.length > 0) {
                packageExports = analysis.exports.filter(e => e.kind === "function" || e.kind === "class");
                if (packageExports.length === 0) {
                  packageExports = analysis.exports;
                }
                break;
              }
            }
          }
        } catch {}
      }

      if (children.length > 0) nodes.push({
        name: entry.name,
        type: "folder",
        path: relPath,
        children,
        ...(packageDependencies ? { packageDependencies } : {}),
        ...(packageExports ? { packageExports } : {})
      });
    } else {
      const analysis = analyzeFile(fullPath);
      nodes.push({ name: entry.name, type: "file", path: relPath, analysis });
    }
  }
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return nodes;
}

/**
 * Try to extract a file-level description from the leading comment block of a source file.
 *
 * Looks for `@description` / `@file` JSDoc tags first, then falls back to
 * plain `//` line comments at the top of the file.
 *
 * @param filePath - Absolute path to the source file.
 */
export function inferFileDescription(filePath: string): string | undefined {
  const ext = path.extname(filePath);
  if (!PARSEABLE_EXTS.has(ext)) return undefined;
  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    return undefined;
  }
  const jsdocMatch = content.match(/^\s*\/\*\*\s*\n?([\s\S]*?)\*\//);
  if (jsdocMatch) {
    const body = jsdocMatch[1];
    const tagMatch = body.match(/@(?:description|file)\s+([\s\S]+?)(?=\n\s*\*?\s*@|$)/);
    if (tagMatch) {
      return tagMatch[1].split("\n").map(l => l.replace(/^\s*\*\s?/, "").trim()).join("\n").trim();
    }
    const lines: string[] = [];
    let foundContent = false;
    for (const line of body.split("\n")) {
      const cleaned = line.replace(/^\s*\*\s?/, "").trim();
      if (cleaned.startsWith("@")) break;
      if (cleaned) {
        foundContent = true;
        lines.push(cleaned);
      } else if (foundContent) {
        lines.push("");
      }
    }
    if (lines.length > 0) return lines.join("\n").trim();
  }
  const descLines: string[] = [];
  const lines = content.split("\n").slice(0, 10);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("'use") || trimmed.startsWith('"use')) continue;
    if (trimmed.startsWith("//")) {
      const comment = trimmed.replace(/^\/\/\s*/, "").trim();
      if (comment) descLines.push(comment);
      continue;
    }
    break;
  }
  if (descLines.length > 0) return descLines.join("\n").trim();
  return undefined;
}

/**
 * Walk the tree and attach human-readable descriptions from a lookup map
 * (or infer them from source comments when `inferDesc` is `true`).
 *
 * @param nodes - File-tree nodes to annotate.
 * @param descriptions - Manual `relPath -> description` mapping.
 * @param basePath - Root directory used to resolve absolute paths.
 * @param inferDesc - When `true`, attempt to extract descriptions from source comments.
 */
export function applyDescriptions(
  nodes: FileTreeNode[],
  descriptions: Record<string, string>,
  basePath: string,
  inferDesc: boolean
): FileTreeNode[] {
  return nodes.map((node) => {
    const updated = { ...node };
    const desc = descriptions[node.path];
    if (desc) {
      updated.description = desc;
    } else if (inferDesc && node.type === "file") {
      const fullPath = path.join(basePath, node.path);
      const inferred = inferFileDescription(fullPath);
      if (inferred) updated.description = inferred;
    }
    if (node.children) {
      updated.children = applyDescriptions(node.children, descriptions, basePath, inferDesc);
    }
    return updated;
  });
}
