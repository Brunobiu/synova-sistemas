import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Gera um bundle único e autossuficiente (IIFE) do widget em embed.js.
// A saída vai para o public/ do app admin, que serve em /widget/embed.js.
export default defineConfig({
  build: {
    lib: {
      entry: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
      name: "SynovaWidget",
      formats: ["iife"],
      fileName: () => "embed.js",
    },
    outDir: fileURLToPath(new URL("../admin/public/widget", import.meta.url)),
    emptyOutDir: false,
    minify: true,
  },
});
