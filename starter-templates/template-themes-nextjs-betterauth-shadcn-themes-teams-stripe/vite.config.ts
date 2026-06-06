import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import fumadocs from "fumadocs-mdx/vite";
import { docs } from "./source.config";
import { defineConfig, type Plugin } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Fallback: handle ?collection= query IDs that fumadocs misses in the RSC inner build
function collectionFallback(): Plugin {
  return {
    name: "collection-fallback",
    enforce: "pre",
    transform(code, id) {
      if (!id.includes("?collection=")) return;
      const filePath = id.split("?")[0];
      if (filePath.endsWith(".json")) {
        // Wrap raw JSON as a default export so rolldown can parse it as JS
        return { code: `export default ${code}`, map: null };
      }
      const params = new URLSearchParams(id.split("?")[1]);
      if (params.get("only") === "frontmatter") {
        // Extract YAML frontmatter and export as JS object using fumadocs pre-built data
        const match = code.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (match) {
          try {
            // Simple frontmatter: key: value per line
            const lines = match[1].split("\n");
            const obj: Record<string, string> = {};
            for (const line of lines) {
              const m = line.match(/^(\w+):\s*(.*)$/);
              if (m) obj[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
            }
            return { code: `export const frontmatter = ${JSON.stringify(obj)}`, map: null };
          } catch {
            return { code: `export const frontmatter = {}`, map: null };
          }
        }
        return { code: `export const frontmatter = {}`, map: null };
      }
    },
  };
}

const fumadocsPlugin = await fumadocs({ docs });

export default defineConfig({
  resolve: {
    alias: {
      "fumadocs-mdx:collections/server": path.resolve(__dirname, ".source/server.ts"),
    },
  },
  plugins: [
    collectionFallback(),
    fumadocsPlugin,
    vinext(),
    cloudflare({
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
    }),
  ],
});
