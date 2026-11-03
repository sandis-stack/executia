#!/usr/bin/env node
/**
 * Architecture guard for the six-repository EXECUTIA structure.
 * Checks a proposed file list. It does not execute product code.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const REPOSITORIES = [
  "executia",
  "executia-layer",
  "executia-core",
  "executia-life",
  "executia-one",
  "executia-source-archive",
];

/** Paths that only executia-layer may contain. */
export const INSTITUTIONAL_PATHS = [
  "sql/009_atomic_execution_rpc.sql",
  "services/execution-commit-flow.js",
  "services/execution-proof.js",
];

const VENDOR_DIR = "assets/vendor/execution-intelligence-core";
const VENDOR_MANIFEST = `${VENDOR_DIR}/VENDOR_SYNC.json`;

/**
 * Protected execution and proof surfaces already named by
 * scripts/phase-3b5-governance-check.js, plus the institutional paths.
 * A change to these paths in executia-layer is an unreviewed contract change.
 */
export function isProtectedContract(file) {
  return (
    INSTITUTIONAL_PATHS.includes(file) ||
    file.startsWith("sql/") ||
    file.startsWith("api/v1/audit/") ||
    file === "api/v1/execution/replay.js" ||
    file.startsWith("api/v1/verify") ||
    file === "services/audit.js" ||
    file === "services/ledger.js" ||
    file === "services/core-ledger.js" ||
    file === "services/db.js" ||
    file === "services/auth.js" ||
    file === "services/jwt-auth.js" ||
    file === "scripts/test-runner.js" ||
    file === "vercel.json" ||
    file.startsWith(".env")
  );
}

export function validateRegistry(registry) {
  const errors = [];
  if (!registry || registry.registryVersion !== 1) {
    errors.push("registryVersion must be 1");
  }
  const names = (registry?.repositories || []).map((item) => item.name);
  if (names.length !== REPOSITORIES.length || REPOSITORIES.some((name) => !names.includes(name))) {
    errors.push("registry must name the six approved repositories");
  }
  for (const item of registry?.repositories || []) {
    if (!item.github || !item.role || !Array.isArray(item.capabilities) || item.capabilities.length === 0) {
      errors.push(`${item.name || "repository"} is missing role, github, or capabilities`);
    }
    if (!item.source || !item.production) {
      errors.push(`${item.name || "repository"} is missing source or production`);
    }
    const rollback = item.production?.rollbackDeploymentId;
    if (rollback == null || rollback === "") {
      errors.push(`${item.name || "repository"} rollbackDeploymentId must be a deployment id or UNKNOWN`);
    }
  }
  const shared = registry?.sharedPackage;
  if (shared?.name !== "@executia/execution-intelligence-core") {
    errors.push("shared package name is missing");
  }
  if (shared?.canonicalRepository !== "executia-layer") {
    errors.push("shared package canonical repository must be executia-layer");
  }
  if (typeof shared?.publishedOnGitHubMain !== "boolean") {
    errors.push("shared package publishedOnGitHubMain must be boolean");
  }
  return errors;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function isCommitId(value) {
  return typeof value === "string" && /^[0-9a-f]{40}$/.test(value);
}

export function evaluateArchitectureGuard({ repo, registry, changedFiles, readFile }) {
  const errors = [];
  errors.push(...validateRegistry(registry));
  if (!REPOSITORIES.includes(repo)) {
    errors.push(`unknown repository ${repo}`);
  }
  const files = [...new Set((changedFiles || []).map((file) => file.trim()).filter(Boolean))];

  for (const file of files) {
    if (file.startsWith(".env")) {
      errors.push(`environment file must not be committed: ${file}`);
    }
    if (INSTITUTIONAL_PATHS.includes(file) && repo !== "executia-layer") {
      errors.push(`${file} is institutional execution authority and belongs only in executia-layer`);
    }
  }

  if (repo === "executia-layer") {
    for (const file of files) {
      if (isProtectedContract(file)) {
        errors.push(`unreviewed execution or proof contract change: ${file}`);
      }
    }
  }

  if (repo === "executia") {
    const vendorChanges = files.filter((file) => file === VENDOR_DIR || file.startsWith(`${VENDOR_DIR}/`));
    const contentChanges = vendorChanges.filter((file) => file !== VENDOR_MANIFEST);
    const manifestChanged = vendorChanges.includes(VENDOR_MANIFEST);
    if (contentChanges.length > 0 && !manifestChanged) {
      errors.push("vendor package changed without VENDOR_SYNC.json");
    }
    if (vendorChanges.length > 0) {
      let manifest;
      try {
        manifest = JSON.parse(readFile(VENDOR_MANIFEST).toString("utf8"));
      } catch {
        errors.push("vendor manifest is missing or invalid");
        manifest = null;
      }
      if (manifest && !isCommitId(manifest.sourceCommit)) {
        errors.push("vendor manifest is missing a 40-character source commit");
      }
      if (manifest?.files && typeof readFile === "function") {
        for (const [name, expected] of Object.entries(manifest.files)) {
          const path = `${VENDOR_DIR}/${name}`;
          let bytes;
          try {
            bytes = readFile(path);
          } catch {
            bytes = null;
          }
          if (!bytes) {
            errors.push(`vendor manifest lists ${name} but the file is absent`);
            continue;
          }
          const actual = sha256(bytes);
          if (actual !== expected) {
            errors.push(`vendor hash mismatch for ${name}`);
          }
        }
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function main() {
  const repo = arg("--repo");
  const registryPath = arg("--registry");
  const filesPath = arg("--files");
  const root = resolve(arg("--root") || ".");
  if (!repo || !registryPath || !filesPath) {
    console.error("usage: architecture-guard.mjs --repo <name> --registry <file> --files <file> [--root <dir>]");
    process.exit(2);
  }
  const registry = JSON.parse(readFileSync(resolve(registryPath), "utf8"));
  const changedFiles = readFileSync(resolve(filesPath), "utf8").split("\n");
  const result = evaluateArchitectureGuard({
    repo,
    registry,
    changedFiles,
    readFile(relativePath) {
      return readFileSync(resolve(root, relativePath));
    },
  });
  if (!result.ok) {
    for (const error of result.errors) console.error(error);
    process.exit(1);
  }
  console.log("ARCHITECTURE_GUARD_OK");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
