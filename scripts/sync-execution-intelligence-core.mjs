import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageRoot = resolve(
  root,
  'node_modules/@executia/execution-intelligence-core/src',
);
const dest = resolve(root, 'assets/vendor/execution-intelligence-core');

if (!existsSync(packageRoot)) {
  console.error(
    'Missing @executia/execution-intelligence-core. Run npm install first.',
  );
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(packageRoot, dest, { recursive: true });
console.log(`Synced execution-intelligence-core to ${dest}`);
