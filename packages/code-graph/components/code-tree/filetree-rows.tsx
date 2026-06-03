/**
 * Row components (FileRow, FolderRow, TreeRow) used to build the interactive file tree table.
 */
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Badge, NpmBadge } from "./badge-tooltip";
import { Markdown } from "../typography/markdown";
import type { FileTreeNode } from "../../lib";
import styles from "./filetree-table.module.css";
import {
  exportStyles, defaultExportStyle, internalStyles, ghLineUrl, resolveLocalImport,
  getLocalImportLabel, getLocalImportSections, getNodeFontSize, Highlight,
  getExportStyle,
  type ImportFilter, type InternalFilter, type ExportFilter
} from "./filetree-utils";

function FileRow({
  node,
  depth,
  ghBase,
  query,
  knownPaths,
  fileNodeMap,
  importFilter,
  internalFilter,
  exportFilter,
}: {
  node: FileTreeNode;
  depth: number;
  ghBase: string;
  query: string;
  knownPaths: Set<string>;
  fileNodeMap: Map<string, FileTreeNode>;
  importFilter: ImportFilter;
  internalFilter: InternalFilter;
  exportFilter: ExportFilter;
}) {
  const meta = node.analysis;
  const indent = depth * 1.2;
  const nameSize = getNodeFontSize(depth, false);

  return (
    <tr className={styles.row} id={`file-${node.path.replace(/[^a-zA-Z0-9]/g, '-')}`}>
      <td className={styles.cellName} style={{ paddingLeft: `${0.6 + indent}rem` }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.15rem" }}>
          <span style={{ width: 16, flexShrink: 0 }} />
          <a
            href={`${ghBase}/${node.path}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.fileName}
            style={{ fontSize: nameSize }}
          >
            <Highlight text={node.name} query={query} />
          </a>
        </span>
        {node.description && (
          <div className={styles.descLine} style={{ paddingLeft: `${16 + 2}px` }}>
            <Markdown text={node.description} query={query} />
          </div>
        )}
      </td>
      <td className={styles.cellBadges}>
        {meta && (
          <span className={styles.badgeWrap}>
            {(importFilter === "all" || importFilter === "npm") && meta.npmImports.map((m) => (
              <NpmBadge key={m} pkg={m} href={`https://npmgraph.js.org/?q=${m}#select=${m}`} />
            ))}
            {(importFilter === "all" || importFilter === "local") && meta.localImports.map((m) => {
              const resolvedPath = resolveLocalImport(node.path, m, knownPaths);
              const anchorId = resolvedPath ? `#file-${resolvedPath.replace(/[^a-zA-Z0-9]/g, '-')}` : undefined;
              const label = getLocalImportLabel(m, resolvedPath);
              const sections = getLocalImportSections(node, m, resolvedPath, fileNodeMap);
              return (
                <a
                  key={m}
                  href={anchorId}
                  style={{ textDecoration: 'none' }}
                  onClick={anchorId ? (e) => {
                    e.preventDefault();
                    const target = document.querySelector(anchorId);
                    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    if (target instanceof HTMLElement) {
                      target.style.outline = '2px solid rgb(234,179,8)';
                      target.style.outlineOffset = '-2px';
                      setTimeout(() => {
                        target.style.outline = '';
                        target.style.outlineOffset = '';
                      }, 1500);
                    }
                  } : undefined}
                >
                  <Badge
                    bg="rgba(234,179,8,0.15)"
                    color="rgb(180,140,10)"
                    icon="import"
                    label={label}
                    sections={sections}
                  />
                </a>
              );
            })}
          </span>
        )}
      </td>
      <td className={styles.cellBadges}>
        {meta && (
          <span className={styles.badgeWrap}>
            {(internalFilter === "all" || internalFilter === "declared-types") && meta.types.map((m) => (
              <Badge key={m.name} bg="rgba(168,85,247,0.15)" color="rgb(168,85,247)" icon="braces" label={m.name} tooltip={m.jsdoc} signature={m.signature} properties={m.properties} href={ghLineUrl(ghBase, node.path, m.line)} />
            ))}
            {(internalFilter === "all" || internalFilter === "exported-types") && meta.exports.filter((m) => m.kind === "type").map((m) => (
              <Badge key={m.name} bg="rgba(168,85,247,0.15)" color="rgb(168,85,247)" icon="braces" label={m.name} tooltip={m.jsdoc} signature={m.signature} properties={m.properties} href={ghLineUrl(ghBase, node.path, m.line)} />
            ))}
            {meta.functions
              .filter((m) => {
                if (internalFilter === "all") return true;
                if (internalFilter === "functions") return m.kind !== "class";
                if (internalFilter === "classes") return m.kind === "class";
                return false;
              })
              .map((m) => {
                const s = internalStyles[m.kind || "function"] || internalStyles.function;
                return <Badge key={m.name} bg={s.bg} color={s.color} icon={s.icon} label={m.name} tooltip={m.jsdoc} signature={m.signature} href={ghLineUrl(ghBase, node.path, m.line)} />;
              })}
          </span>
        )}
      </td>
      <td className={styles.cellBadges}>
        {meta && (
          <span className={styles.badgeWrap}>
            {meta.exports.filter((m) => {
              if (m.kind === "type") return false;
              if (exportFilter === "all") return true;
              if (exportFilter === "functions") return m.kind === "function";
              if (exportFilter === "classes") return m.kind === "class";
              return m.kind === "constant";
            }).map((m) => {
              const s = getExportStyle(m);
              return <Badge key={m.name} bg={s.bg} color={s.color} icon={s.icon} label={m.name} tooltip={m.jsdoc} signature={m.signature} properties={m.properties} href={ghLineUrl(ghBase, node.path, m.line)} />;
            })}
          </span>
        )}
      </td>
    </tr>
  );
}

function FolderRows({
  node,
  depth,
  ghBase,
  query,
  knownPaths,
  collapseDepth,
  fileNodeMap,
  importFilter,
  internalFilter,
  exportFilter,
  forceOpen,
}: {
  node: FileTreeNode;
  depth: number;
  ghBase: string;
  query: string;
  knownPaths: Set<string>;
  collapseDepth: number;
  fileNodeMap: Map<string, FileTreeNode>;
  importFilter: ImportFilter;
  internalFilter: InternalFilter;
  exportFilter: ExportFilter;
  forceOpen: boolean;
}) {
  const [isOpen, setIsOpen] = useState(depth + 1 < collapseDepth);
  const indent = depth * 1.2;
  const open = forceOpen || isOpen;
  const nameSize = getNodeFontSize(depth, true);

  return (
    <>
      <tr className={styles.rowFolder} id={`file-${node.path.replace(/[^a-zA-Z0-9]/g, '-')}`} onClick={() => setIsOpen(!open)}>
        <td className={styles.cellName} style={{ paddingLeft: `${0.6 + indent}rem` }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.15rem" }}>
            <span className={open ? styles.folderToggleOpen : styles.folderToggle}>
              <ChevronRight size={14} />
            </span>
            <span className={styles.folderName} style={{ fontSize: nameSize }}>
              <Highlight text={node.name} query={query} />
            </span>
          </span>
          {node.description && (
            <div className={styles.descLine} style={{ paddingLeft: `${16 + 2}px` }}>
              <Markdown text={node.description} query={query} />
            </div>
          )}
        </td>
        <td className={styles.cellBadges}>
          {node.packageDependencies && (
            <span className={styles.badgeWrap}>
              {(importFilter === "all" || importFilter === "npm") && node.packageDependencies.map((m) => (
                <NpmBadge key={m} pkg={m} href={`https://npmgraph.js.org/?q=${m}#select=${m}`} />
              ))}
            </span>
          )}
        </td>
        <td className={styles.cellBadges} />
        <td className={styles.cellBadges}>
          {node.packageExports && (
            <span className={styles.badgeWrap}>
              {node.packageExports.filter((m) => {
                if (m.kind === "type") return false;
                if (exportFilter === "all") return true;
                const kind = m.kind || "constant";
                if (exportFilter === "functions") return kind === "function";
                if (exportFilter === "classes") return kind === "class";
                return kind === "constant";
              }).map((m) => {
                const s = exportStyles[m.kind || ""] || defaultExportStyle;
                return <Badge key={m.name} bg={s.bg} color={s.color} icon={s.icon} label={m.name} tooltip={m.jsdoc} signature={m.signature} properties={m.properties} href={ghLineUrl(ghBase, node.path + (m.line ? `/index.ts` : ""), m.line)} />;
              })}
            </span>
          )}
        </td>
      </tr>
      {open &&
        node.children?.map((child) => (
          <TreeRows
            key={child.path}
            node={child}
            depth={depth + 1}
            ghBase={ghBase}
            query={query}
            knownPaths={knownPaths}
            collapseDepth={collapseDepth}
            fileNodeMap={fileNodeMap}
            importFilter={importFilter}
            internalFilter={internalFilter}
            exportFilter={exportFilter}
            forceOpen={forceOpen}
          />
        ))}
    </>
  );
}

export function TreeRows({
  node,
  depth,
  ghBase,
  query,
  knownPaths,
  collapseDepth,
  fileNodeMap,
  importFilter,
  internalFilter,
  exportFilter,
  forceOpen,
}: {
  node: FileTreeNode;
  depth: number;
  ghBase: string;
  query: string;
  knownPaths: Set<string>;
  collapseDepth: number;
  fileNodeMap: Map<string, FileTreeNode>;
  importFilter: ImportFilter;
  internalFilter: InternalFilter;
  exportFilter: ExportFilter;
  forceOpen: boolean;
}) {
  if (node.type === "folder") {
    return (
      <FolderRows
        node={node}
        depth={depth}
        ghBase={ghBase}
        query={query}
        knownPaths={knownPaths}
        collapseDepth={collapseDepth}
        fileNodeMap={fileNodeMap}
        importFilter={importFilter}
        internalFilter={internalFilter}
        exportFilter={exportFilter}
        forceOpen={forceOpen}
      />
    );
  }
  return <FileRow node={node} depth={depth} ghBase={ghBase} query={query} knownPaths={knownPaths} fileNodeMap={fileNodeMap} importFilter={importFilter} internalFilter={internalFilter} exportFilter={exportFilter} />;
}

