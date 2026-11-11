import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    includeSource: ["src/**/*.{js,ts}"],
    testTimeout: 30000,
    hookTimeout: 120000,
    fileParallelism: false,
  },
});
