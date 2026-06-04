/**
 * Utility functions, types, and shared constants supporting the file tree components.
 */
import type { FileTreeNode, AnalysisItem, AnalysisKind } from "../../lib";
import { type BadgeTooltipSection, type BadgeTooltipSectionItem, type BadgeIconName } from "./badge-tooltip";
import { Markdown } from "../typography/markdown";
import styles from "./filetree-table.module.css";

export type ImportFilter = "all" | "local" | "npm";
export type InternalFilter = "all" | "declared-types" | "exported-types" | "functions" | "classes";
export type ExportFilter = "all" | "functions" | "classes" | "constants";

export const FILE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs"];

export const exportStyles: Record<string, { bg: string; color: string; icon: BadgeIconName }> = {
  function: { bg: "rgba(249,115,22,0.15)", color: "rgb(249,115,22)", icon: "function" },
  class: { bg: "rgba(236,72,153,0.15)", color: "rgb(236,72,153)", icon: "class" },
  constant: { bg: "rgba(34,197,94,0.15)", color: "rgb(34,197,94)", icon: "constant" },
};
export const defaultExportStyle = exportStyles.function;

export function getExportStyle(m: AnalysisItem) {
  return exportStyles[m.kind || ""] || defaultExportStyle;
}

export const internalStyles: Record<string, { bg: string; color: string; icon: BadgeIconName }> = {
  function: { bg: "rgba(34,197,94,0.15)", color: "rgb(34,197,94)", icon: "function" },
  class: { bg: "rgba(236,72,153,0.12)", color: "rgb(219,100,155)", icon: "class" },
};

export function ghLineUrl(ghBase: string, filePath: string, line?: number): string | undefined {
  if (!line) return undefined;
  return `${ghBase}/${filePath}#L${line}`;
}

/** Resolve a relative local import (e.g. "../common/types") to a filetree path */
export function resolveLocalImport(fromPath: string, importPath: string, knownPaths: Set<string>): string | undefined {
  const dir = fromPath.split('/').slice(0, -1);
  const parts = importPath.replace(/\.(js|ts|mjs|mts)$/, '').split('/');
  const resolved = [...dir];
  for (const p of parts) {
    if (p === '..') resolved.pop();
    else if (p !== '.') resolved.push(p);
  }
  const base = resolved.join('/');

  if (knownPaths.has(base)) return base;

  for (const ext of FILE_EXTENSIONS) {
    const candidate = `${base}${ext}`;
    if (knownPaths.has(candidate)) return candidate;
  }

  for (const ext of FILE_EXTENSIONS) {
    const candidate = `${base}/index${ext}`;
    if (knownPaths.has(candidate)) return candidate;
  }

  return undefined;
}

export function getLocalImportLabel(importPath: string, resolvedPath?: string): string {
  const source = resolvedPath ?? importPath;
  const parts = source.split("/").filter(Boolean);
  return parts[parts.length - 1] || source;
}

export function collectFileNodeMap(nodes: FileTreeNode[], result = new Map<string, FileTreeNode>()): Map<string, FileTreeNode> {
  for (const node of nodes) {
    result.set(node.path, node);
    if (node.children) collectFileNodeMap(node.children, result);
  }
  return result;
}

const kindToIcon: Record<string, BadgeIconName> = {
  function: "function",
  class: "class",
  constant: "constant",
  type: "braces",
};

function buildSectionItem(
  name: string,
  kind: AnalysisKind | undefined,
  exportMap: Map<string, { kind?: AnalysisKind; signature?: string }>,
): BadgeTooltipSectionItem {
  const entry = exportMap.get(name);
  const resolvedKind = kind ?? entry?.kind ?? "constant";
  const item: BadgeTooltipSectionItem = { name, icon: kindToIcon[resolvedKind] };
  if (entry?.signature) item.signature = entry.signature;
  return item;
}

export function getLocalImportSections(
  sourceNode: FileTreeNode,
  importPath: string,
  resolvedPath: string | undefined,
  fileNodeMap: Map<string, FileTreeNode>,
): BadgeTooltipSection[] | undefined {
  if (!sourceNode.analysis) return undefined;
  const importSymbols = sourceNode.analysis.localImportSymbols.find((entry) => entry.source === importPath);
  if (!importSymbols) return undefined;

  const targetNode = resolvedPath ? fileNodeMap.get(resolvedPath) : undefined;
  const targetExports = targetNode?.analysis?.exports ?? [];
  const exportMap = new Map(
    targetExports.map((item) => [item.name, { kind: item.kind, signature: item.signature }] as const),
  );

  const functions = importSymbols.valueNames
    .filter((name) => (exportMap.get(name)?.kind ?? "constant") === "function")
    .map((name) => buildSectionItem(name, "function", exportMap));
  const classes = importSymbols.valueNames
    .filter((name) => exportMap.get(name)?.kind === "class")
    .map((name) => buildSectionItem(name, "class", exportMap));
  const values = importSymbols.valueNames
    .filter((name) => {
      const kind = exportMap.get(name)?.kind;
      return !kind || kind === "constant";
    })
    .map((name) => buildSectionItem(name, "constant", exportMap));
  const types = importSymbols.typeNames
    .map((name) => buildSectionItem(name, "type", exportMap));

  const sections: BadgeTooltipSection[] = [];
  if (functions.length > 0) sections.push({ label: "Functions", colorClassName: styles.sectionFunction, items: functions });
  if (types.length > 0) sections.push({ label: "Types", colorClassName: styles.sectionType, items: types });
  if (classes.length > 0) sections.push({ label: "Classes", colorClassName: styles.sectionClass, items: classes });
  if (values.length > 0) sections.push({ label: "Values", colorClassName: styles.sectionValue, items: values });
  return sections.length > 0 ? sections : undefined;
}

export function collectFilePaths(nodes: FileTreeNode[], result = new Set<string>()): Set<string> {
  for (const node of nodes) {
    result.add(node.path);
    if (node.children) collectFilePaths(node.children, result);
  }
  return result;
}

export function analysisItemMatches(item: AnalysisItem, q: string): boolean {
  if (item.name.toLowerCase().includes(q)) return true;
  if (item.jsdoc?.toLowerCase().includes(q)) return true;
  if (item.signature?.toLowerCase().includes(q)) return true;
  if (item.properties?.some((property) =>
    property.name.toLowerCase().includes(q) ||
    property.type.toLowerCase().includes(q) ||
    property.description?.toLowerCase().includes(q)
  )) {
    return true;
  }
  return false;
}

export type SearchRecord = {
  path: string;
  type: FileTreeNode["type"];
  name: string;
  description: string;
  pathText: string;
  npmImports: string[];
  localImports: string[];
  localImportSources: string[];
  localImportValues: string[];
  localImportTypes: string[];
  exportNames: string[];
  exportDocs: string[];
  functionNames: string[];
  functionDocs: string[];
  typeNames: string[];
  typeDocs: string[];
};

export function analysisItemDocText(item: AnalysisItem): string {
  return [
    item.jsdoc ?? "",
    item.signature ?? "",
    ...(item.properties ?? []).flatMap((property) => [
      property.name,
      property.type,
      property.description ?? "",
    ]),
  ].filter(Boolean).join(" ");
}

export function buildSearchRecords(nodes: FileTreeNode[], result: SearchRecord[] = []): SearchRecord[] {
  for (const node of nodes) {
    const analysis = node.analysis;
    result.push({
      path: node.path,
      type: node.type,
      name: node.name,
      description: node.description ?? "",
      pathText: node.path,
      npmImports: analysis?.npmImports ?? [],
      localImports: analysis?.localImports ?? [],
      localImportSources: analysis?.localImportSymbols.map((entry) => entry.source) ?? [],
      localImportValues: analysis?.localImportSymbols.flatMap((entry) => entry.valueNames) ?? [],
      localImportTypes: analysis?.localImportSymbols.flatMap((entry) => entry.typeNames) ?? [],
      exportNames: analysis?.exports.map((item) => item.name) ?? [],
      exportDocs: analysis?.exports.map(analysisItemDocText) ?? [],
      functionNames: analysis?.functions.map((item) => item.name) ?? [],
      functionDocs: analysis?.functions.map(analysisItemDocText) ?? [],
      typeNames: analysis?.types.map((item) => item.name) ?? [],
      typeDocs: analysis?.types.map(analysisItemDocText) ?? [],
    });
    if (node.children) buildSearchRecords(node.children, result);
  }
  return result;
}

export function filterTreeByPaths(nodes: FileTreeNode[], matchedPaths: Set<string>): FileTreeNode[] {
  const result: FileTreeNode[] = [];
  for (const node of nodes) {
    if (node.type === "folder") {
      const filtered = filterTreeByPaths(node.children || [], matchedPaths);
      if (filtered.length > 0 || matchedPaths.has(node.path)) {
        result.push({ ...node, children: filtered });
      }
    } else if (matchedPaths.has(node.path)) {
      result.push(node);
    }
  }
  return result;
}

// Basic components moved to markdown.tsx
export const Highlight = ({ text, query }: { text: string; query: string }) => (
  <Markdown text={text} query={query} />
);

export function getNodeFontSize(depth: number, isFolder: boolean): string {
  const base = isFolder ? 1.06 : 0.98;
  const step = isFolder ? 0.06 : 0.045;
  const min = isFolder ? 0.86 : 0.8;
  return `${Math.max(min, base - depth * step).toFixed(3)}rem`;
}

export function getMaxTreeDepth(nodes: FileTreeNode[], depth = 1): number {
  let maxDepth = depth;
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      maxDepth = Math.max(maxDepth, getMaxTreeDepth(node.children, depth + 1));
    }
  }
  return maxDepth;
}
