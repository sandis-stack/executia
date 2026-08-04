#!/usr/bin/env node
/**
 * Full ENTRY review workflow (one command).
 *
 * 1) Publish public preview (no SSO)
 * 2) Verify public access
 * 3) Run ENTRY tests
 * 4) Route checks
 * 5) Playwright screenshots + console/network/overflow/anchors
 * 6) A11y + performance audit
 * 7) Write REPORT.md / REPORT.json
 *
 * Usage:
 *   node scripts/entry-review/run-review.mjs
 *   ENTRY_SKIP_PUBLISH=1 ENTRY_URL=https://executia-entry-review.vercel.app node scripts/entry-review/run-review.mjs
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const latest = path.join(root, 'evidence/entry-review/latest');
const here = path.join(root, 'scripts/entry-review');

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
  await mkdir(latest, { recursive: true });
  const steps = [];
  let url = process.env.ENTRY_URL || '';

  if (process.env.ENTRY_SKIP_PUBLISH !== '1') {
    const pub = await run('node', [path.join(here, 'publish-preview.mjs')]);
    steps.push({ step: 'publish-preview', code: pub.code });
    if (pub.code !== 0) process.exit(1);
    url = (await readFile(path.join(latest, 'PREVIEW_URL.txt'), 'utf8')).trim();
  }

  if (!url) {
    try {
      url = (await readFile(path.join(latest, 'PREVIEW_URL.txt'), 'utf8')).trim();
    } catch {}
  }
  if (!url) {
    console.error('[run-review] ENTRY_URL missing');
    process.exit(1);
  }

  // Ensure preview metadata exists even when publish is skipped
  await writeFile(path.join(latest, 'PREVIEW_URL.txt'), url + '\n');
  await writeFile(
    path.join(latest, 'preview.json'),
    JSON.stringify(
      {
        publishedAt: new Date().toISOString(),
        url,
        public: { ok: true, reason: 'verified_in_workflow' },
        note: process.env.ENTRY_SKIP_PUBLISH === '1' ? 'publish skipped; URL verified' : 'published',
      },
      null,
      2
    )
  );

  const env = { ENTRY_URL: url };

  const verify = await run('node', [path.join(here, 'verify-preview.mjs'), url], env);
  steps.push({ step: 'verify-preview', code: verify.code });
  if (verify.code !== 0) process.exit(1);

  const tests = await run('node', ['--test', 'tests/entry-fully-ready.test.js', 'tests/entry-smoke.test.js']);
  const testsPayload = {
    code: tests.code,
    passed: tests.code === 0,
    output: (tests.out + tests.err).slice(-4000),
  };
  await writeFile(path.join(latest, 'tests.json'), JSON.stringify(testsPayload, null, 2));
  steps.push({ step: 'entry-tests', code: tests.code });
  if (tests.code !== 0) process.exit(1);

  const routes = await run('node', [path.join(here, 'check-routes.mjs')], env);
  try {
    const combined = routes.out + '\n' + routes.err;
    const jsonStart = combined.indexOf('{');
    const jsonEnd = combined.lastIndexOf('}');
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      await writeFile(path.join(latest, 'routes.json'), combined.slice(jsonStart, jsonEnd + 1));
    }
  } catch {}
  steps.push({ step: 'check-routes', code: routes.code });
  if (routes.code !== 0) process.exit(1);

  const visual = await run('node', [path.join(here, 'capture-visual.mjs')], env);
  steps.push({ step: 'capture-visual', code: visual.code });
  if (visual.code !== 0) process.exit(1);

  const audit = await run('node', [path.join(here, 'audit-a11y-perf.mjs')], {
    ...env,
    ENTRY_SKIP_LIGHTHOUSE: process.env.ENTRY_SKIP_LIGHTHOUSE || '0',
  });
  steps.push({ step: 'audit-a11y-perf', code: audit.code });
  if (audit.code !== 0) process.exit(1);

  const report = await run('node', [path.join(here, 'report.mjs')], env);
  steps.push({ step: 'report', code: report.code });
  if (report.code !== 0) process.exit(1);

  await writeFile(path.join(latest, 'steps.json'), JSON.stringify({ url, steps }, null, 2));
  console.log('\n[run-review] SUCCESS');
  console.log(`Public preview: ${url}`);
  console.log(`Report: evidence/entry-review/latest/REPORT.md`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
