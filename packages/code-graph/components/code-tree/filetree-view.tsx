/**
 * Client-side component wrapping the standard file tree view with interactivity.
 */
import { generateFileTree, parseIgnoreFile } from "../../lib";
import { FileTreeTable } from "./filetree-table";
import path from "path";

export function FileTreeView({
  paths,
  ghBase,
  descriptions = {},
  ignore = [],
  ignoreFile,
  inferDescriptions = true,
  defaultImportFilter,
  defaultInternalFilter,
  defaultExportFilter,
  defaultCollapseDepth,
}: {
  /** Absolute or relative (to cwd) paths to directories or files to scan */
  paths: string[];
  /** Base GitHub URL for file links, e.g. "https://github.com/user/repo/tree/master/src" */
  ghBase: string;
  /** Descriptions keyed by relative path from the scanned dir */
  descriptions?: Record<string, string>;
  /** List of file/folder names or relative paths to ignore */
  ignore?: string[];
  /** Path to a .treeignore file (gitignore-style, one pattern per line) */
  ignoreFile?: string;
  /** Infer file descriptions from JSDoc/comments at the top of source files (default: true) */
  inferDescriptions?: boolean;
  /** Default import filter: "all" | "local" | "npm" */
  defaultImportFilter?: "all" | "local" | "npm";
  /** Default internal filter: "all" | "declared-types" | "exported-types" | "functions" | "classes" */
  defaultInternalFilter?: "all" | "declared-types" | "exported-types" | "functions" | "classes";
  /** Default export filter: "all" | "functions" | "classes" | "constants" */
  defaultExportFilter?: "all" | "functions" | "classes" | "constants";
  /** Default collapse depth level */
  defaultCollapseDepth?: number;
}) {
  const ignorePatterns = new Set(ignore);
  if (ignoreFile) {
    const filePath = path.isAbsolute(ignoreFile) ? ignoreFile : path.resolve(process.cwd(), ignoreFile);
    for (const p of parseIgnoreFile(filePath)) {
      ignorePatterns.add(p);
    }
  }

  const tree = paths.flatMap((p) => {
    const resolved = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
    return generateFileTree(resolved, descriptions, ignorePatterns, inferDescriptions);
  });

  return (
    <FileTreeTable
      tree={tree}
      ghBase={ghBase}
      defaultImportFilter={defaultImportFilter}
      defaultInternalFilter={defaultInternalFilter}
      defaultExportFilter={defaultExportFilter}
      defaultCollapseDepth={defaultCollapseDepth}
    />
  );
}
