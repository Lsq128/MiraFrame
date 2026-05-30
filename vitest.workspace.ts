import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "packages/shared/vitest.config.ts",
  "packages/server/vitest.config.ts",
  "packages/agent/vitest.config.ts",
  "packages/frontend/vitest.config.ts",
]);
