import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // Multiple test files share the same live Neon DB and some (e.g.
    // statement-import-service.test.ts) truncate whole tables in beforeEach.
    // Running files in parallel races those truncations against other
    // files' rows. Sequential file execution avoids the race without
    // masking it.
    fileParallelism: false,
  },
});
