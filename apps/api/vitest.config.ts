import { defineConfig } from "vitest/config";
import { TEST_DATABASE_URL } from "./test/database-url";

export default defineConfig({
  test: {
    env: { NODE_ENV: "test", DATABASE_URL: TEST_DATABASE_URL, JWT_SECRET: "test-only-secret-not-for-production" },
    globalSetup: ["./test/global-setup.ts"],
    // Tests share one database and reseed it before each test.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 120_000,
  },
});
