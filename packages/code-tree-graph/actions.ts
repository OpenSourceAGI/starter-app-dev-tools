'use server';

import path from 'path';
import JSZip from 'jszip';
import { analyzeFileContent, type FileAnalysis } from './lib';
import type { FileInfo } from './components/codegraph/dependency-graph-shared';

const PARSEABLE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);

const IGNORE_SEGMENTS = new Set([
  "node_modules", "dist", ".git", "package-lock.json", "bun.lock", "bun.lockb",
]);

function shouldIgnore(filePath: string): boolean {
  for (const seg of filePath.split("/")) {
    if (IGNORE_SEGMENTS.has(seg) || seg.startsWith(".")) return true;
  }
  return false;
}

/** Infer a file-level description from leading comments in source content */
function inferDescription(content: string): string | undefined {
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
      if (cleaned) { foundContent = true; lines.push(cleaned); }
      else if (foundContent) lines.push("");
    }
    if (lines.length > 0) return lines.join("\n").trim();
  }
  const descLines: string[] = [];
  for (const line of content.split("\n").slice(0, 10)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("'use") || trimmed.startsWith('"use')) continue;
    if (trimmed.startsWith("//")) {
      const comment = trimmed.replace(/^\/\/\s*/, "").trim();
      if (comment) descLines.push(comment);
      continue;
    }
    break;
  }
  return descLines.length > 0 ? descLines.join("\n").trim() : undefined;
}

export async function analyzeRemoteRepository(url: string): Promise<{ success: boolean; files?: FileInfo[]; error?: string }> {
  try {
    // 1. Normalize GitHub URLs to ZIP archive URLs
    let zipUrl = url;
    if (url.includes('github.com') && !url.endsWith('.zip')) {
      const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (match) {
        const [, user, repo] = match;
        zipUrl = `https://github.com/${user}/${repo}/archive/refs/heads/master.zip`;
      }
    }

    // 2. Download ZIP into memory
    let response = await fetch(zipUrl);
    if (!response.ok && zipUrl.includes('/refs/heads/master.zip')) {
      const mainZipUrl = zipUrl.replace('/refs/heads/master.zip', '/refs/heads/main.zip');
      response = await fetch(mainZipUrl);
      if (!response.ok) {
        throw new Error(`Failed to download repository from ${url}. (Tried master and main branches)`);
      }
    } else if (!response.ok) {
      throw new Error(`Failed to download repository from ${url}. Status: ${response.status}`);
    }

    const archiveBuffer = await response.arrayBuffer();

    // 3. Extract ZIP in memory using JSZip
    const zip = await JSZip.loadAsync(archiveBuffer);
    const extracted: { path: string; content: string }[] = [];
    for (const [filePath, file] of Object.entries(zip.files)) {
      if (file.dir) continue;
      const content = await file.async('string');
      extracted.push({ path: filePath, content });
    }

    // 4. Strip the top-level directory GitHub adds (e.g. "repo-master/")
    let prefix = '';
    if (extracted.length > 0) {
      const firstSlash = extracted[0].path.indexOf('/');
      if (firstSlash > 0) {
        const candidate = extracted[0].path.slice(0, firstSlash + 1);
        if (extracted.every(f => f.path.startsWith(candidate))) {
          prefix = candidate;
        }
      }
    }

    // 5. Analyze each parseable file
    const files: FileInfo[] = [];
    for (const entry of extracted) {
      const relativePath = prefix ? entry.path.slice(prefix.length) : entry.path;
      if (!relativePath || shouldIgnore(relativePath)) continue;

      const ext = path.extname(relativePath);
      if (!PARSEABLE_EXTS.has(ext)) continue;

      const analysis = analyzeFileContent(relativePath, entry.content);
      if (!analysis) continue;

      const pkg = relativePath.split("/")[0];
      const id = relativePath.replace(/[^a-zA-Z0-9]/g, "_");
      const name = path.basename(relativePath);
      const description = inferDescription(entry.content);

      files.push({ path: relativePath, name, id, pkg, description, analysis });
    }

    return { success: true, files };

  } catch (error: any) {
    console.error('Analysis error:', error);
    return { success: false, error: error.message || 'Unknown error during analysis' };
  }
}
