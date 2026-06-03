/**
 * @file Public API for the file-tree generator.
 *
 * Re-exports all types and key functions so that consumers can import from
 * a single module path.
 */
import fs from "fs";
import { PARSEABLE_EXTS } from "./constants";
import { analyzeFile } from "./analyze-ts";
import { scanDir, applyDescriptions } from "./scan";
import type { FileAnalysis, FileTreeNode } from "./types";

export type { TypeProperty, AnalysisKind, AnalysisItem, FileAnalysis, FileTreeNode } from "./types";
export { PARSEABLE_EXTS } from "./constants";

/**
 * Parse an ignore file (e.g. `.gitignore`-style) into a set of patterns.
 *
 * @param filePath - Absolute path to the ignore file.
 * @returns A set of trimmed, non-comment patterns.
 */
export function parseIgnoreFile(filePath: string): Set<string> {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const patterns = new Set<string>();
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        patterns.add(trimmed.replace(/\/+$/, ""));
      }
    }
    return patterns;
  } catch {
    return new Set();
  }
}

/**
 * Analyse a file's content without reading from the filesystem.
 *
 * Useful for in-memory analysis of extracted archive files.
 *
 * @param fileName - Virtual file name (used to pick the right parser by extension).
 * @param content - Source text to analyse.
 */
export function analyzeFileContent(fileName: string, content: string): FileAnalysis | undefined {
  return analyzeFile(fileName, content);
}

/**
 * Scan a directory and produce a tree of {@link FileTreeNode}s with optional
 * descriptions and static analysis metadata.
 *
 * @param packagesDir - Root directory to scan.
 * @param descriptions - Optional `relPath -> description` map applied to matching nodes.
 * @param ignorePatterns - Extra file/folder names to skip.
 * @param inferDescriptions - When `true`, attempt to infer descriptions from leading source comments.
 */
export function generateFileTree(
  packagesDir: string,
  descriptions: Record<string, string> = {},
  ignorePatterns: Set<string> = new Set(),
  inferDescriptions: boolean = false
): FileTreeNode[] {
  const tree = scanDir(packagesDir, packagesDir, ignorePatterns);
  return applyDescriptions(tree, descriptions, packagesDir, inferDescriptions);
}
