/** File/directory names to always skip when scanning. */
export const IGNORE = new Set([
  "node_modules",
  "dist",
  ".git",
  "package.json",
  "tsconfig.json",
  "README.md",
  "package-lock.json",
  "bun.lock",
  "bun.lockb"
]);

/** Asset/binary file extensions excluded from the code tree by default. */
export const ASSET_EXTS = new Set([
  ".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".ico", ".bmp",
  ".tiff", ".tif", ".heic", ".heif",
  ".mp4", ".webm", ".mov", ".avi", ".mkv",
  ".mp3", ".wav", ".ogg", ".flac", ".aac",
  ".woff", ".woff2", ".ttf", ".otf", ".eot",
  ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
]);

/** File extensions that can be parsed for imports/exports. */
export const PARSEABLE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);

/** Node.js built-in module specifiers (excluded from import lists). */
export const SYSTEM_MODULES = new Set([
  "fs", "path", "os", "url", "util", "http", "https", "stream",
  "events", "child_process", "crypto", "buffer", "querystring",
  "readline", "net", "tls", "dns", "assert", "zlib", "worker_threads",
  "node:fs", "node:path", "node:os", "node:url", "node:util",
  "node:http", "node:https", "node:stream", "node:events",
  "node:child_process", "node:crypto", "node:buffer", "node:readline",
  "node:net", "node:tls", "node:dns", "node:assert", "node:zlib",
  "node:worker_threads", "fs/promises", "node:fs/promises",
]);
