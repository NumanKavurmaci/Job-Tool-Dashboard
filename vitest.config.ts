import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
  resolve: {
    tsconfigPaths: true,
    alias: [
      { find: /^@\/components\/(.*)$/, replacement: `${path.resolve(import.meta.dirname, "src/components")}/$1` },
      { find: /^@\/lib\/(.*)$/, replacement: `${path.resolve(import.meta.dirname, "lib")}/$1` },
      { find: /^@\/src\/(.*)$/, replacement: `${path.resolve(import.meta.dirname, "src")}/$1` },
      { find: /^@\/app\/(.*)$/, replacement: `${path.resolve(import.meta.dirname, "app")}/$1` },
      { find: /^@\/(.*)$/, replacement: `${path.resolve(import.meta.dirname)}/$1` },
    ],
  },
});
