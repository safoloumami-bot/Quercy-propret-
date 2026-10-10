import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  // Next.js impose `jsx: preserve` dans tsconfig ; les tests compilent le JSX eux-mêmes.
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    // Les tests d'intégration (isolation des espaces) utilisent la vraie base PostgreSQL.
    setupFiles: ["./vitest.setup.ts"],
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
