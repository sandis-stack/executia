#!/usr/bin/env node
/**
 * Production verification against https://executia.io (requires explicit approval).
 *
 * Usage:
 *   node scripts/entry-review/verify-production.mjs
 *   ENTRY_PRODUCTION_URL=https://executia.io node scripts/entry-review/verify-production.mjs
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const here = path.join(root, 'scripts/entry-review');
const prodUrl = (process.env.ENTRY_PRODUCTION_URL || 'https://executia.io').replace(/\/?$/, '/');
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16).replace('T', '-');
const outDir = path.join(root, 'evidence/production-verification', stamp);

function run(cmd, args, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => {
      out += d;
      process.stdout.write(d);
    });
    child.stderr.on('data', (d) => {
      err += d;
      process.stderr.write(d);
    });
    child.on('exit', (code) => resolve({ code: code ?? 1, out, err }));
  });
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const env = { ENTRY_URL: prodUrl, ENTRY_SKIP_LIGHTHOUSE: process.env.ENTRY_SKIP_LIGHTHOUSE || '1' };

  // Capture into a temp latest-like structure by setting cwd evidence path via env
  // Reuse capture against production into this stamp folder.
  const verify = await run('node', [path.join(here, 'verify-preview.mjs'), prodUrl], env);
  if (verify.code !== 0) process.exit(1);

  const routes = await run('node', [path.join(here, 'check-routes.mjs')], env);
  if (routes.code !== 0) process.exit(1);

  // Run visual capture then move latest screenshots into production stamp
  const visual = await run('node', [path.join(here, 'capture-visual.mjs')], env);
  if (visual.code !== 0) process.exit(1);

  await cp(path.join(root, 'evidence/entry-review/latest/screenshots'), path.join(outDir, 'screenshots'), {
    recursive: true,
  });
  await cp(path.join(root, 'evidence/entry-review/latest/visual.json'), path.join(outDir, 'visual.json'));

  let commitHint = null;
  try {
    const html = await (await fetch(prodUrl)).text();
    commitHint = (html.match(/content="([a-f0-9]{7,40})"/i) || [])[1] || null;
  } catch {}

  const localCommit = execSync('git rev-parse HEAD', { cwd: root }).toString().trim();
  const summary = {
    verifiedAt: new Date().toISOString(),
    productionUrl: prodUrl,
    localCommit,
    commitHintFromHtml: commitHint,
    note: 'Confirm deployed commit via Vercel dashboard if HTML does not embed commit metadata.',
  };
  await writeFile(path.join(outDir, 'SUMMARY.json'), JSON.stringify(summary, null, 2));
  await writeFile(
    path.join(outDir, 'SUMMARY.md'),
    [
      '# Production Verification',
      '',
      `- URL: ${prodUrl}`,
      `- Local commit: \`${localCommit}\``,
      `- HTML commit hint: ${commitHint || 'n/a'}`,
      `- Evidence: \`${outDir}\``,
      '',
    ].join('\n')
  );

  console.log('[verify-production] OK', outDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
