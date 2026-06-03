"use client";

/**
 * Main table component for displaying, filtering, and sorting an interactive representation of the file tree.
 */
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Fuse from "fuse.js";
import { ChevronDown, Search, ArrowUpDown, ArrowUp, ArrowDown, Filter } from "lucide-react";
import type { FileTreeNode } from "../../lib";
import styles from "./filetree-table.module.css";
import { TreeRows } from "./filetree-rows";
import {
  getMaxTreeDepth, collectFilePaths, collectFileNodeMap,
  buildSearchRecords, filterTreeByPaths,
  type ImportFilter, type InternalFilter, type ExportFilter
} from "./filetree-utils";

export function FileTreeTable({
  tree,
  ghBase,
  defaultImportFilter = "all",
  defaultInternalFilter = "all",
  defaultExportFilter = "all",
  defaultCollapseDepth,
}: {
  tree: FileTreeNode[];
  ghBase: string;
  defaultImportFilter?: ImportFilter;
  defaultInternalFilter?: InternalFilter;
  defaultExportFilter?: ExportFilter;
  defaultCollapseDepth?: number;
}) {
  const maxCollapseDepth = Math.max(1, getMaxTreeDepth(tree) + 1);
  const [search, setSearch] = useState("");
  const [collapseDepth, setCollapseDepth] = useState(defaultCollapseDepth ?? maxCollapseDepth);
  const [showCollapseMenu, setShowCollapseMenu] = useState(false);
  const [showImportFilterMenu, setShowImportFilterMenu] = useState(false);
  const [showInternalFilterMenu, setShowInternalFilterMenu] = useState(false);
  const [showExportFilterMenu, setShowExportFilterMenu] = useState(false);
  const [importFilter, setImportFilter] = useState<ImportFilter>(defaultImportFilter);
  const [internalFilter, setInternalFilter] = useState<InternalFilter>(defaultInternalFilter);
  const [exportFilter, setExportFilter] = useState<ExportFilter>(defaultExportFilter);
  const [sortConfig, setSortConfig] = useState<{
    key: "imports" | "types" | "exports" | null;
    order: "asc" | "desc";
  }>({ key: null, order: "desc" });
  const collapseMenuRef = useRef<HTMLDivElement>(null);
  const importFilterMenuRef = useRef<HTMLDivElement>(null);
  const internalFilterMenuRef = useRef<HTMLDivElement>(null);
  const exportFilterMenuRef = useRef<HTMLDivElement>(null);

  const query = search.toLowerCase().trim();
  const forceOpenSearchResults = query.length > 0;
  const searchRecords = useMemo(() => buildSearchRecords(tree), [tree]);
  const fuse = useMemo(() => new Fuse(searchRecords, {
    includeScore: true,
    shouldSort: true,
    threshold: 0.1,
    ignoreLocation: true,
    minMatchCharLength: 2,
    keys: [
      { name: "name", weight: 3 },
      { name: "pathText", weight: 2.5 },
      { name: "description", weight: 2.2 },
      { name: "exportNames", weight: 2 },
      { name: "functionNames", weight: 2 },
      { name: "typeNames", weight: 2 },
      { name: "exportDocs", weight: 1.6 },
      { name: "functionDocs", weight: 1.6 },
      { name: "typeDocs", weight: 1.6 },
      { name: "localImports", weight: 1.5 },
      { name: "npmImports", weight: 1.5 },
      { name: "localImportSources", weight: 1.3 },
      { name: "localImportValues", weight: 1.3 },
      { name: "localImportTypes", weight: 1.3 },
    ],
  }), [searchRecords]);

  const getNodeEntryCount = useCallback((node: FileTreeNode, key: "imports" | "types" | "exports"): number => {
    let count = 0;

    if (node.analysis) {
      const meta = node.analysis;
      switch (key) {
        case "imports":
          count += importFilter === "all"
            ? meta.npmImports.length + meta.localImports.length
            : importFilter === "npm"
              ? meta.npmImports.length
              : meta.localImports.length;
          break;
        case "types":
          count += internalFilter === "all"
            ? meta.types.length + meta.functions.length + meta.exports.filter((e) => e.kind === "type").length
            : internalFilter === "declared-types"
              ? meta.types.length
              : internalFilter === "exported-types"
                ? meta.exports.filter((e) => e.kind === "type").length
                : internalFilter === "classes"
                  ? meta.functions.filter((e) => e.kind === "class").length
                  : meta.functions.filter((e) => e.kind !== "class").length;
          break;
        case "exports":
          count += exportFilter === "all"
            ? meta.exports.filter((e) => e.kind !== "type").length
            : meta.exports.filter((e) => {
              if (e.kind === "type") return false;
              if (exportFilter === "functions") return e.kind === "function";
              if (exportFilter === "classes") return e.kind === "class";
              return e.kind === "constant";
            }).length;
          break;
      }
    }

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        count += getNodeEntryCount(child, key);
      }
    }

    return count;
  }, [exportFilter, importFilter, internalFilter]);

  const sortNodes = useCallback((nodes: FileTreeNode[]): FileTreeNode[] => {
    if (!sortConfig.key) {
      // Default sort: Folders first, then Name
      return [...nodes]
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
          return a.name.localeCompare(b.name);
        })
        .map(node => node.children ? { ...node, children: sortNodes(node.children) } : node);
    }

    const sorted = [...nodes].sort((a, b) => {
      const valA = getNodeEntryCount(a, sortConfig.key!);
      const valB = getNodeEntryCount(b, sortConfig.key!);

      if (valA !== valB) {
        return sortConfig.order === "asc" ? valA - valB : valB - valA;
      }

      // If values are equal, fallback to folders first, then name
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return sorted.map((node) => {
      if (node.children && node.children.length > 0) {
        return { ...node, children: sortNodes(node.children) };
      }
      return node;
    });
  }, [getNodeEntryCount, sortConfig]);

  const filtered = useMemo(() => {
    const filterRes = !query
      ? tree
      : filterTreeByPaths(
        tree,
        new Set(
          fuse.search(query).map((result) => result.item.path),
        ),
      );
    return sortNodes(filterRes);
  }, [tree, query, fuse, sortNodes]);

  const toggleSort = (key: "imports" | "types" | "exports") => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        if (prev.order === "desc") return { key, order: "asc" };
        return { key: null, order: "desc" };
      }
      return { key, order: "desc" };
    });
  };

  const renderSortIcon = (key: "imports" | "types" | "exports") => {
    if (sortConfig.key !== key) return <ArrowUpDown size={12} className={styles.sortIconMuted} />;
    return sortConfig.order === "asc" ? <ArrowUp size={12} className={styles.sortIconActive} /> : <ArrowDown size={12} className={styles.sortIconActive} />;
  };

  const knownPaths = useMemo(() => collectFilePaths(tree), [tree]);
  const fileNodeMap = useMemo(() => collectFileNodeMap(tree), [tree]);
  const collapseLevels = Array.from({ length: maxCollapseDepth }, (_, index) => index + 1);

  useEffect(() => {
    if (!showCollapseMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (collapseMenuRef.current?.contains(event.target as Node)) return;
      setShowCollapseMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCollapseMenu]);

  useEffect(() => {
    if (!showImportFilterMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (importFilterMenuRef.current?.contains(event.target as Node)) return;
      setShowImportFilterMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showImportFilterMenu]);

  useEffect(() => {
    if (!showInternalFilterMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (internalFilterMenuRef.current?.contains(event.target as Node)) return;
      setShowInternalFilterMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showInternalFilterMenu]);

  useEffect(() => {
    if (!showExportFilterMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (exportFilterMenuRef.current?.contains(event.target as Node)) return;
      setShowExportFilterMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showExportFilterMenu]);

  return (
    <div>
      <div className={styles.searchBox}>
        <Search size={15} className={styles.searchIcon} />
        <input
          type="text"
          placeholder="Filter files, exports, types..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className={styles.table}>
          <colgroup>
            <col className={styles.colName} />
            <col className={styles.colImports} />
            <col className={styles.colInternal} />
            <col className={styles.colExports} />
          </colgroup>
          <thead className={styles.thead}>
            <tr>
              <th>
                <div className={styles.headerName}>
                  <span>Name</span>
                  <div className={styles.headerSliderWrap}>
                    <button
                      type="button"
                      className={styles.headerStepButton}
                      aria-label="Decrease collapse level"
                      disabled={collapseDepth <= collapseLevels[0]}
                      style={{ opacity: collapseDepth <= collapseLevels[0] ? 0.3 : 1, cursor: collapseDepth <= collapseLevels[0] ? 'not-allowed' : 'pointer' }}
                      onClick={() => setCollapseDepth((current) => Math.max(collapseLevels[0], current - 1))}
                    >
                      -
                    </button>
                    <div ref={collapseMenuRef} className="relative">
                      <button
                        type="button"
                        aria-label="Collapse folders to level"
                        onClick={() => setShowCollapseMenu((open) => !open)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-[0.78rem] font-semibold text-slate-100 transition hover:border-sky-400"
                      >
                        <span className={styles.headerSliderLabel}>L{collapseDepth}</span>
                        <ChevronDown size={12} className={showCollapseMenu ? "rotate-180 transition" : "transition"} />
                      </button>
                      {showCollapseMenu ? (
                        <div className="absolute right-0 z-20 mt-2 min-w-28 rounded-xl border border-slate-800 bg-slate-950/95 p-1 shadow-2xl backdrop-blur">
                          {collapseLevels.map((level) => (
                            <button
                              key={level}
                              type="button"
                              onClick={() => {
                                setCollapseDepth(level);
                                setShowCollapseMenu(false);
                              }}
                              className={
                                level === collapseDepth
                                  ? "block w-full rounded-lg bg-sky-500/15 px-3 py-2 text-left text-sm font-semibold text-sky-300"
                                  : "block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-slate-800"
                              }
                            >
                              Level {level}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className={styles.headerStepButton}
                      aria-label="Increase collapse level"
                      disabled={collapseDepth >= collapseLevels[collapseLevels.length - 1]}
                      style={{ opacity: collapseDepth >= collapseLevels[collapseLevels.length - 1] ? 0.3 : 1, cursor: collapseDepth >= collapseLevels[collapseLevels.length - 1] ? 'not-allowed' : 'pointer' }}
                      onClick={() => setCollapseDepth((current) => Math.min(collapseLevels[collapseLevels.length - 1], current + 1))}
                    >
                      +
                    </button>
                  </div>
                </div>
              </th>
              <th className={styles.sortableHeader}>
                <div className={styles.headerCellContent}>
                  <button type="button" className={styles.headerInlineButton} onClick={() => toggleSort("imports")}>
                    Imports {renderSortIcon("imports")}
                  </button>
                  <div ref={importFilterMenuRef} className="relative">
                    <button
                      type="button"
                      className={styles.headerInlineButton}
                      aria-label="Filter imports"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowImportFilterMenu((open) => !open);
                      }}
                    >
                      <Filter size={12} className={importFilter !== "all" ? styles.sortIconActive : styles.sortIconMuted} />
                    </button>
                    {showImportFilterMenu ? (
                      <div className="absolute right-0 z-20 mt-2 min-w-36 rounded-xl border border-slate-800 bg-slate-950/95 p-1 shadow-2xl backdrop-blur">
                        {[
                          { key: "all", label: "All imports" },
                          { key: "local", label: "Local imports" },
                          { key: "npm", label: "npm imports" },
                        ].map((option) => (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => {
                              setImportFilter(option.key as "all" | "local" | "npm");
                              setShowImportFilterMenu(false);
                            }}
                            className={
                              importFilter === option.key
                                ? "block w-full rounded-lg bg-sky-500/15 px-3 py-2 text-left text-sm font-semibold text-sky-300"
                                : "block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-slate-800"
                            }
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </th>
              <th className={styles.sortableHeader}>
                <div className={styles.headerCellContent}>
                  <button type="button" className={styles.headerInlineButton} onClick={() => toggleSort("types")}>
                    Types &amp; Internal {renderSortIcon("types")}
                  </button>
                  <div ref={internalFilterMenuRef} className="relative">
                    <button
                      type="button"
                      className={styles.headerInlineButton}
                      aria-label="Filter types and internal symbols"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowInternalFilterMenu((open) => !open);
                      }}
                    >
                      <Filter size={12} className={internalFilter !== "all" ? styles.sortIconActive : styles.sortIconMuted} />
                    </button>
                    {showInternalFilterMenu ? (
                      <div className="absolute right-0 z-20 mt-2 min-w-44 rounded-xl border border-slate-800 bg-slate-950/95 p-1 shadow-2xl backdrop-blur">
                        {[
                          { key: "all", label: "All symbols" },
                          { key: "declared-types", label: "Declared types" },
                          { key: "exported-types", label: "Exported types" },
                          { key: "functions", label: "Functions" },
                          { key: "classes", label: "Classes" },
                        ].map((option) => (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => {
                              setInternalFilter(option.key as InternalFilter);
                              setShowInternalFilterMenu(false);
                            }}
                            className={
                              internalFilter === option.key
                                ? "block w-full rounded-lg bg-sky-500/15 px-3 py-2 text-left text-sm font-semibold text-sky-300"
                                : "block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-slate-800"
                            }
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </th>
              <th className={styles.sortableHeader}>
                <div className={styles.headerCellContent}>
                  <button type="button" className={styles.headerInlineButton} onClick={() => toggleSort("exports")}>
                    Exports {renderSortIcon("exports")}
                  </button>
                  <div ref={exportFilterMenuRef} className="relative">
                    <button
                      type="button"
                      className={styles.headerInlineButton}
                      aria-label="Filter exports"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowExportFilterMenu((open) => !open);
                      }}
                    >
                      <Filter size={12} className={exportFilter !== "all" ? styles.sortIconActive : styles.sortIconMuted} />
                    </button>
                    {showExportFilterMenu ? (
                      <div className="absolute right-0 z-20 mt-2 min-w-40 rounded-xl border border-slate-800 bg-slate-950/95 p-1 shadow-2xl backdrop-blur">
                        {[
                          { key: "all", label: "All exports" },
                          { key: "functions", label: "Functions" },
                          { key: "classes", label: "Classes" },
                          { key: "constants", label: "Constants" },
                        ].map((option) => (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => {
                              setExportFilter(option.key as ExportFilter);
                              setShowExportFilterMenu(false);
                            }}
                            className={
                              exportFilter === option.key
                                ? "block w-full rounded-lg bg-sky-500/15 px-3 py-2 text-left text-sm font-semibold text-sky-300"
                                : "block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-slate-800"
                            }
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((node) => (
                <TreeRows
                  key={`${collapseDepth}-${node.path}`}
                  node={node}
                  depth={0}
                  ghBase={ghBase}
                  query={query}
                  knownPaths={knownPaths}
                  collapseDepth={collapseDepth}
                  fileNodeMap={fileNodeMap}
                  importFilter={importFilter}
                  internalFilter={internalFilter}
                  exportFilter={exportFilter}
                  forceOpen={forceOpenSearchResults}
                />
              ))
            ) : (
              <tr>
                <td colSpan={4} className={styles.noResults}>
                  No matches found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
