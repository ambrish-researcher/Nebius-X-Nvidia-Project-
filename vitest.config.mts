import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["frontend/tests/**/*.test.{ts,tsx}"],
    setupFiles: ["./frontend/tests/setup.ts"],
  },
});
