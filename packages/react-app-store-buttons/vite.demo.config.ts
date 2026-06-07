import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, "demo"),
  publicDir: resolve(__dirname, "images"),
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
});
