import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const adminDir = fileURLToPath(new URL("./apps/admin", import.meta.url));

export default defineConfig({
  resolve: {
    // Resolve o alias "@/..." do apps/admin. O regex ^@/ garante que os pacotes
    // do workspace (@synova/*) NÃO sejam afetados.
    alias: [{ find: /^@\//, replacement: `${adminDir}/` }],
  },
  test: {
    environment: "node",
    include: ["packages/**/*.test.{ts,tsx}", "apps/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
  },
});
