/**
 * Server component that initializes and passes parsed graph data to the client-side dependency graph.
 */
import { generateFileTree, parseIgnoreFile, type FileTreeNode } from "../../lib";
import path from "path";
import { DependencyGraphClient } from "./dependency-graph-client";
import type { FileInfo, GraphDisplayOptions } from "./dependency-graph-shared";

const DEFAULT_INSTRUCTIONS = (
  <ul className="space-y-3 list-none p-0">
    <li>
      <strong>Dependency Mapping</strong>: The graph visualizes package files, local imports, and optional npm dependencies.
    </li>
    <li>
      <strong>Graph Controls</strong>: Use the toggle buttons to show or hide <strong>External</strong>, <strong>Types</strong>, <strong>Private</strong>, and <strong>Exported</strong> nodes.
    </li>
    <li>
      <strong>Navigation</strong>: <strong>Drag</strong> to pan the view, or hold <code>Ctrl</code> while <strong>scrolling</strong> to zoom.
    </li>
    <li>
      <strong>Interactivity</strong>: <strong>Click</strong> any node to automatically scroll to its matching entry in the file tree below.
    </li>
    <li>
      <strong>Detailed Insights</strong>: <strong>Hover</strong> over graph nodes or file tree badges to see <strong>Markdown-parsed tooltips</strong> with descriptions, exports, and property details.
    </li>
    <li>
      <strong>Filtering</strong>: Use the <strong>Search Box</strong> in the graph or file tree to find specific files or symbols instantly.
    </li>
  </ul>
);

function collectFiles(nodes: FileTreeNode[], result: FileInfo[] = []): FileInfo[] {
  for (const node of nodes) {
    if (node.type === "file") {
      const pkg = node.path.includes("/") ? node.path.split("/")[0] : "root";
      const id = node.path.replace(/[^a-zA-Z0-9]/g, "_");
      result.push({
        path: node.path,
        name: node.name,
        id,
        pkg,
        description: node.description,
        analysis: node.analysis,
      });
    }
    if (node.children) collectFiles(node.children, result);
  }
  return result;
}

export function DependencyGraph({
  paths,
  descriptions = {},
  ignore = [],
  ignoreFile,
  showLegend = true,
  showNpmImports = false,
  showTypes = false,
  showPrivateFunctions = false,
  showExportedFunctions = false,
  instructions,
}: {
  paths: string[];
  descriptions?: Record<string, string>;
  ignore?: string[];
  ignoreFile?: string;
  showLegend?: boolean;
  showNpmImports?: boolean;
  showTypes?: boolean;
  showPrivateFunctions?: boolean;
  showExportedFunctions?: boolean;
  instructions?: React.ReactNode;
}) {
  const dirs = paths;
  const ignorePatterns = new Set(ignore);
  if (ignoreFile) {
    const filePath = path.isAbsolute(ignoreFile) ? ignoreFile : path.resolve(process.cwd(), ignoreFile);
    for (const p of parseIgnoreFile(filePath)) ignorePatterns.add(p);
  }

  const files: FileInfo[] = [];
  for (const d of dirs) {
    const resolvedDir = path.isAbsolute(d) ? d : path.resolve(process.cwd(), d);
    console.log("[DependencyGraph] Scanning:", resolvedDir);
    const tree = generateFileTree(resolvedDir, descriptions, ignorePatterns, false);
    console.log("[DependencyGraph] Tree nodes:", tree.length);
    collectFiles(tree, files);
  }
  console.log("[DependencyGraph] Total files collected:", files.length, "| With analysis:", files.filter(f => f.analysis).length);
  const initialOptions: GraphDisplayOptions = {
    showNpmImports,
    showTypes,
    showPrivateFunctions,
    showExportedFunctions,
  };

  return <DependencyGraphClient files={files} showLegend={showLegend} initialOptions={initialOptions} helpContent={instructions ?? DEFAULT_INSTRUCTIONS} />;
}
