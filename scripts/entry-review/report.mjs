#!/usr/bin/env node
/**
 * Generate ENTRY review report (markdown + json).
 * Optional visual diff against evidence/entry-review/baseline/screenshots.
 */
import { readFile, writeFile, access, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const latest = path.join(root, 'evidence/entry-review/latest');
const baselineDir = path.join(root, 'evidence/entry-review/baseline/screenshots');
const require = createRequire(import.meta.url);

function git(cmd) {
  try {
    return execSync(cmd, { cwd: root }).toString().trim();
  } catch {
    return '';
  }
}

async function loadJson(rel) {
  try {
    return JSON.parse(await readFile(path.join(latest, rel), 'utf8'));
  } catch {
    return null;
  }
}

async function maybeDiff() {
  try {
    await access(baselineDir);
  } catch {
    return { skipped: true, reason: 'no baseline' };
  }
  try {
    pixelmatch = require(path.join(root, 'packages/executia-life/node_modules/pixelmatch'));
    PNG = require(path.join(root, 'packages/executia-life/node_modules/pngjs')).PNG;
  } catch {
    return { skipped: true, reason: 'pixelmatch/pngjs not installed' };
  }
  const { readFileSync, writeFileSync, existsSync } = await import('node:fs');
  const currentDir = path.join(latest, 'screenshots');
  const diffDir = path.join(latest, 'diffs');
  await mkdir(diffDir, { recursive: true });
  const files = (await readdir(currentDir)).filter((f) => f.endsWith('.png'));
  const changes = [];
  for (const file of files) {
    const aPath = path.join(baselineDir, file);
    const bPath = path.join(currentDir, file);
    if (!existsSync(aPath) || !existsSync(bPath)) continue;
    const img1 = PNG.sync.read(readFileSync(aPath));
    const img2 = PNG.sync.read(readFileSync(bPath));
    if (img1.width !== img2.width || img1.height !== img2.height) {
      changes.push({ file, status: 'dimension_mismatch', w1: img1.width, h1: img1.height, w2: img2.width, h2: img2.height });
      continue;
    }
    const { width, height } = img1;
    const diff = new PNG({ width, height });
    const mismatched = pixelmatch(img1.data, img2.data, diff.data, width, height, { threshold: 0.1 });
    const pct = (mismatched / (width * height)) * 100;
    if (pct > 0.25) {
      writeFileSync(path.join(diffDir, file), PNG.sync.write(diff));
      changes.push({ file, mismatched, pct: Number(pct.toFixed(3)), status: 'changed' });
    }
  }
  return { skipped: false, changes };
}

async function main() {
  const preview = await loadJson('preview.json');
  const visual = await loadJson('visual.json');
  const a11y = await loadJson('a11y-perf.json');
  const tests = await loadJson('tests.json');
  const routes = await loadJson('routes.json');
  const diffs = await maybeDiff();

  const commit = git('git rev-parse HEAD');
  const short = git('git rev-parse --short HEAD');
  const changed = git('git diff --name-only HEAD');
  const status = git('git status --porcelain');

  const report = {
    generatedAt: new Date().toISOString(),
    publicPreviewUrl: preview?.url || null,
    previewPublic: preview?.public || null,
    commit,
    short,
    filesChanged: changed ? changed.split('\n').filter(Boolean) : [],
    workingTree: status ? status.split('\n').filter(Boolean) : [],
    tests,
    routes,
    visual: visual
      ? {
          screenshots: visual.screenshots,
          consoleErrors: visual.consoleErrors?.length || 0,
          pageErrors: visual.pageErrors?.length || 0,
          failedRequests: visual.failedRequests?.length || 0,
          overflow: visual.overflow,
          brokenAnchors: visual.anchors?.failed || [],
        }
      : null,
    accessibility: a11y?.a11y || null,
    performance: a11y?.performance || null,
    visualDiffs: diffs,
    knownIssues: [],
  };

  if (visual?.overflow?.length) report.knownIssues.push('Horizontal overflow detected');
  if ((visual?.consoleErrors || []).length) report.knownIssues.push('Console errors present');
  if ((visual?.anchors?.failed || []).length) report.knownIssues.push('Broken homepage anchors');
  if (!preview?.public?.ok) report.knownIssues.push('Preview not publicly accessible');

  const md = [
    '# ENTRY Review Report',
    '',
    `- Generated: ${report.generatedAt}`,
    `- Public preview: ${report.publicPreviewUrl || 'n/a'}`,
    `- Preview public: ${report.previewPublic?.ok ? 'YES' : 'NO'}`,
    `- Commit: \`${short}\` (\`${commit}\`)`,
    '',
    '## Tests',
    '```json',
    JSON.stringify(tests, null, 2),
    '```',
    '',
    '## Routes',
    '```json',
    JSON.stringify(routes, null, 2),
    '```',
    '',
    '## Screenshots',
    ...(report.visual?.screenshots?.full || []).map((f) => `- ${f}`),
    ...(report.visual?.screenshots?.sections || []).map((f) => `- ${f}`),
    '',
    '## Accessibility',
    '```json',
    JSON.stringify(report.accessibility, null, 2),
    '```',
    '',
    '## Performance',
    '```json',
    JSON.stringify(report.performance, null, 2),
    '```',
    '',
    '## Visual diffs',
    '```json',
    JSON.stringify(report.visualDiffs, null, 2),
    '```',
    '',
    '## Known remaining issues',
    ...(report.knownIssues.length ? report.knownIssues.map((i) => `- ${i}`) : ['- None reported by automated gates']),
    '',
  ].join('\n');

  await writeFile(path.join(latest, 'REPORT.json'), JSON.stringify(report, null, 2));
  await writeFile(path.join(latest, 'REPORT.md'), md);
  console.log(md);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
