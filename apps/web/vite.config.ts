import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const repoRoot = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

export default defineConfig({
  plugins: [react()],
  /** Load `VITE_*` from monorepo root `.env` (same file as server). */
  envDir: repoRoot,
  server: {
    port: 5173,
  },
});
