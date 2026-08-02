import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

// Prefer API .env, then Core .env for DATABASE_URL during local/tests.
loadEnvFile(resolve(here, "../.env"));
loadEnvFile(resolve(here, "../../executia-core-ai/.env"));

if (!process.env.EXECUTIA_API_KEY) {
  process.env.EXECUTIA_API_KEY = "test-executia-api-key";
}
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "test";
}
