import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ["index.ts", "components/**/*", "lib/**/*", "utils.ts", "actions.ts"],
      exclude: ["**/*.test.*", "**/*.spec.*"],
      rollupTypes: false,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "index.ts"),
      formats: ["es", "cjs"],
      fileName: (format) => `index.${format === "es" ? "js" : "cjs"}`,
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "next",
        "next/navigation",
        // match fumadocs-core and all of its subpath entries (e.g. fumadocs-core/link)
        /^fumadocs-core(\/.*)?$/,
        // keep large server-only deps external so consumers can tree-shake or SSR them
        "@typescript-eslint/typescript-estree",
        "mermaid",
      ],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
        // preserve CSS module class names in the emitted .css file
        assetFileNames: "index.css",
      },
    },
    sourcemap: true,
    // don't clear dist so consumers can add extra assets alongside
    emptyOutDir: true,
  },
});
