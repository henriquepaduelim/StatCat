import path from "path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "virtual:pwa-register/react": path.resolve(__dirname, "src/test-utils/pwa-register-mock.ts"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.ts",
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
