import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MANIFEST_NAME = 'VENDOR_SYNC.json';

export function syncExecutionIntelligenceCore({ packageRoot, dest, log = console.log, error = console.error }) {
  if (!existsSync(packageRoot)) {
    if (existsSync(dest)) {
      log(`Using committed vendor at ${dest}`);
      return { status: 'committed' };
    }
    error(
      'Missing @executia/execution-intelligence-core. Run npm install first.',
    );
    return { status: 'missing' };
  }

  const manifestPath = join(dest, MANIFEST_NAME);
  const preservedManifest = existsSync(manifestPath) ? readFileSync(manifestPath) : null;
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  cpSync(packageRoot, dest, { recursive: true });
  if (preservedManifest) writeFileSync(manifestPath, preservedManifest);
  log(`Synced execution-intelligence-core to ${dest}`);
  return { status: 'synced', preservedManifest: preservedManifest !== null };
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (invokedDirectly) {
  const result = syncExecutionIntelligenceCore({
    packageRoot: resolve(root, 'node_modules/@executia/execution-intelligence-core/src'),
    dest: resolve(root, 'assets/vendor/execution-intelligence-core'),
  });
  if (result.status === 'missing') process.exit(1);
}
