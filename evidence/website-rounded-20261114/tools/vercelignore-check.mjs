import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const ignore = readFileSync(join(root, '.vercelignore'), 'utf8')
  .split(/\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));
function ignored(rel) {
  for (const rule of ignore) {
    if (rule.endsWith('/')) {
      if (rel === rule.slice(0, -1) || rel.startsWith(rule)) return true;
    } else if (rule.startsWith('*.')) {
      if (rel.endsWith(rule.slice(1)) || rel.split('/').pop()?.endsWith(rule.slice(1))) return true;
    } else if (rel === rule || rel.startsWith(rule + '/')) return true;
  }
  return false;
}
function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const abs = join(dir, e.name);
    const rel = relative(root, abs).replaceAll('\\', '/');
    if (ignored(rel)) continue;
    if (e.isDirectory()) walk(abs, acc);
    else acc.push(rel);
  }
  return acc;
}
const shipped = walk(root);
const evidenceShipped = shipped.filter((f) => f.startsWith('evidence/'));
const mdShipped = shipped.filter((f) => f.endsWith('.md'));
console.log(JSON.stringify({ shipped: shipped.length, evidenceShipped: evidenceShipped.length, mdShipped: mdShipped.length, sample: shipped.slice(0, 10) }, null, 2));
if (evidenceShipped.length || mdShipped.length) process.exit(1);
