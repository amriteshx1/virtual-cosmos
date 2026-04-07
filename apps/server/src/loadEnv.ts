import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

/**
 * Load `.env` from monorepo root first, then `apps/server/.env`, so one file works
 * when you copy `.env.example` to the repo root.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(__dirname, "../../../.env");
const serverEnv = path.resolve(__dirname, "../.env");

if (existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
} else if (existsSync(serverEnv)) {
  dotenv.config({ path: serverEnv });
} else {
  dotenv.config();
}
