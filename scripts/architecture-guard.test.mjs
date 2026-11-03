import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { evaluateArchitectureGuard, validateRegistry } from "./architecture-guard.mjs";
import { syncExecutionIntelligenceCore } from "./sync-execution-intelligence-core.mjs";

const registry = {
  registryVersion: 1,
  repositories: [
    "executia",
    "executia-layer",
    "executia-core",
    "executia-life",
    "executia-one",
    "executia-source-archive",
  ].map((name) => ({
    name,
    github: `sandis-stack/${name}`,
    role: name,
    capabilities: ["recorded"],
    source: { commit: "UNKNOWN" },
    production: { rollbackDeploymentId: "UNKNOWN" },
  })),
  sharedPackage: {
    name: "@executia/execution-intelligence-core",
    canonicalRepository: "executia-layer",
    publishedOnGitHubMain: false,
  },
};

function run(repo, changedFiles, readFile = () => null) {
  return evaluateArchitectureGuard({ repo, registry, changedFiles, readFile });
}

test("registry names the six repositories and the layer package", () => {
  assert.deepEqual(validateRegistry(registry), []);
});

test("registry rejects a missing repository", () => {
  const broken = structuredClone(registry);
  broken.repositories = broken.repositories.filter((item) => item.name !== "executia-core");
  assert.ok(validateRegistry(broken).length > 0);
});

test("a public page change passes", () => {
  const result = run("executia", ["index.html", "standard.html"]);
  assert.equal(result.ok, true, result.errors.join("\n"));
});

test("website invoice and intake code is not institutional execution", () => {
  const result = run("executia", [
    "engine/execution/invoice-flow.js",
    "engine/intake/from-source-event.js",
    "engine/execution/completion.js",
  ]);
  assert.equal(result.ok, true, result.errors.join("\n"));
});

test("an institutional path in the website is rejected", () => {
  const result = run("executia", ["sql/009_atomic_execution_rpc.sql"]);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /executia-layer/);
});

test("an institutional path in LIFE is rejected", () => {
  const result = run("executia-life", ["services/execution-proof.js"]);
  assert.equal(result.ok, false);
});

test("an unreviewed layer contract change is rejected", () => {
  const result = run("executia-layer", ["sql/009_atomic_execution_rpc.sql"]);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /unreviewed/);
});

test("a layer documentation change passes", () => {
  const result = run("executia-layer", ["docs/README.md"]);
  assert.equal(result.ok, true, result.errors.join("\n"));
});

test("a vendor edit without the manifest is rejected", () => {
  const result = run("executia", ["assets/vendor/execution-intelligence-core/decision-engine.js"]);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /VENDOR_SYNC/);
});

test("a vendor edit without a source commit is rejected", () => {
  const manifest = JSON.stringify({ sourceCommit: "", files: {} });
  const result = run(
    "executia",
    [
      "assets/vendor/execution-intelligence-core/decision-engine.js",
      "assets/vendor/execution-intelligence-core/VENDOR_SYNC.json",
    ],
    (path) => (path.endsWith("VENDOR_SYNC.json") ? Buffer.from(manifest) : Buffer.from("code")),
  );
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /source commit/);
});

test("the committed registry and vendor manifest are valid", () => {
  const root = resolve(import.meta.dirname, "..");
  const committed = JSON.parse(readFileSync(resolve(root, "governance/ARCHITECTURE_REGISTRY.json"), "utf8"));
  assert.deepEqual(validateRegistry(committed), []);
  const result = evaluateArchitectureGuard({
    repo: "executia",
    registry: committed,
    changedFiles: ["assets/vendor/execution-intelligence-core/VENDOR_SYNC.json"],
    readFile(relativePath) {
      return readFileSync(resolve(root, relativePath));
    },
  });
  assert.equal(result.ok, true, result.errors.join("\n"));
});

test("a vendor edit with a source commit and matching hashes passes", () => {
  const body = Buffer.from("canonical-bytes");
  const hash = createHash("sha256").update(body).digest("hex");
  const manifest = JSON.stringify({
    sourceCommit: "4d8a52ac6a3eacada5443561fcaa199b4adcd0a8",
    files: { "decision-engine.js": hash },
  });
  const result = run(
    "executia",
    [
      "assets/vendor/execution-intelligence-core/decision-engine.js",
      "assets/vendor/execution-intelligence-core/VENDOR_SYNC.json",
    ],
    (path) => (path.endsWith("VENDOR_SYNC.json") ? Buffer.from(manifest) : body),
  );
  assert.equal(result.ok, true, result.errors.join("\n"));
});

test("an unlisted vendor file is rejected", () => {
  const body = Buffer.from("canonical-bytes");
  const hash = createHash("sha256").update(body).digest("hex");
  const manifest = JSON.stringify({
    sourceCommit: "4d8a52ac6a3eacada5443561fcaa199b4adcd0a8",
    files: { "decision-engine.js": hash },
  });
  const result = evaluateArchitectureGuard({
    repo: "executia",
    registry,
    changedFiles: [
      "assets/vendor/execution-intelligence-core/decision-engine.js",
      "assets/vendor/execution-intelligence-core/extra.js",
      "assets/vendor/execution-intelligence-core/VENDOR_SYNC.json",
    ],
    readFile(path) {
      return path.endsWith("VENDOR_SYNC.json") ? Buffer.from(manifest) : body;
    },
    listVendorFiles() {
      return ["VENDOR_SYNC.json", "decision-engine.js", "extra.js"];
    },
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /extra\.js is not listed/);
});

test("postinstall sync keeps the vendor manifest", () => {
  const root = mkdtempSync(join(tmpdir(), "executia-vendor-sync-"));
  const packageRoot = join(root, "package");
  const dest = join(root, "vendor");
  mkdirSync(packageRoot);
  writeFileSync(join(packageRoot, "decision-engine.js"), "from-package");
  mkdirSync(dest);
  writeFileSync(join(dest, "old.js"), "remove-me");
  const manifest = Buffer.from('{"sourceCommit":"4d8a52ac6a3eacada5443561fcaa199b4adcd0a8","files":{}}\n');
  writeFileSync(join(dest, "VENDOR_SYNC.json"), manifest);
  const result = syncExecutionIntelligenceCore({
    packageRoot,
    dest,
    log() {},
    error() {},
  });
  assert.equal(result.status, "synced");
  assert.equal(result.preservedManifest, true);
  assert.equal(readFileSync(join(dest, "VENDOR_SYNC.json")).equals(manifest), true);
  assert.equal(readFileSync(join(dest, "decision-engine.js"), "utf8"), "from-package");
  assert.throws(() => readFileSync(join(dest, "old.js")));
});
