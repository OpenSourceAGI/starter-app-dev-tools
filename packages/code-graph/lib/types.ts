/** A single property extracted from a TypeScript interface or type literal. */
export interface TypeProperty {
  /** Property name */
  name: string;
  /** TypeScript type annotation as a string */
  type: string;
  /** JSDoc description, if present */
  description?: string;
  /** Whether the property is required (not optional) */
  required: boolean;
}

/** The kind of top-level declaration found during analysis. */
export type AnalysisKind = "function" | "class" | "constant" | "type";

/** A single analysed declaration (export, function, type, etc.). */
export interface AnalysisItem {
  /** Declaration name (`"default"` for default exports) */
  name: string;
  /** What kind of declaration this is */
  kind?: AnalysisKind;
  /** 1-based source line number */
  line?: number;
  /** Leading JSDoc comment text */
  jsdoc?: string;
  /** Condensed type / function signature */
  signature?: string;
  /** Properties of an interface or type-literal */
  properties?: TypeProperty[];
}

/** Result of statically analysing a single source file. */
export interface FileAnalysis {
  /** Relative paths of local (`.`/`/`) imports */
  localImports: string[];
  /** Per-import breakdown of imported symbol names */
  localImportSymbols: {
    source: string;
    valueNames: string[];
    typeNames: string[];
  }[];
  /** npm package specifiers imported by the file */
  npmImports: string[];
  /** Exported declarations */
  exports: AnalysisItem[];
  /** Non-exported function / class declarations */
  functions: AnalysisItem[];
  /** Non-exported type / interface / enum declarations */
  types: AnalysisItem[];
}

/** A node in the generated file-tree representation of a directory. */
export interface FileTreeNode {
  /** File or folder name */
  name: string;
  /** Whether this node is a file or folder */
  type: "file" | "folder";
  /** Path relative to the scanned root */
  path: string;
  /** Human-readable description (manual or inferred) */
  description?: string;
  /** Static analysis of the file's imports / exports */
  analysis?: FileAnalysis;
  /** Child nodes (folders only) */
  children?: FileTreeNode[];
  /** Combined `dependencies` + `peerDependencies` from `package.json` */
  packageDependencies?: string[];
  /** Key exports surfaced from the package entry point */
  packageExports?: AnalysisItem[];
}
