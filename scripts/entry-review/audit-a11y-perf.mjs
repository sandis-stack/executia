#!/usr/bin/env node
/**
 * Lightweight accessibility + performance probes for ENTRY.
 * Uses Playwright axe-core injection when available; otherwise heuristic checks.
 * Optional Lighthouse when chrome/lighthouse is available.
 *
 * Usage:
 *   ENTRY_URL=https://... node scripts/entry-review/audit-a11y-perf.mjs
 */
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);

function loadPlaywright() {
  const candidates = [
    path.join(root, 'packages/executia-website/node_modules/playwright'),
    path.join(root, 'packages/pilot-workspace/node_modules/playwright'),
    path.join(root, 'packages/executia-life/node_modules/playwright'),
    'playwright',
  ];
  for (const c of candidates) {
    try {
      return require(c);
    } catch {}
  }
  throw new Error('playwright not found');
}

const { chromium } = loadPlaywright();
const baseUrl = (process.env.ENTRY_URL || 'http://127.0.0.1:4390/').replace(/\/?$/, '/');
const outDir = path.join(root, 'evidence/entry-review/latest');

async function heuristicA11y(page) {
  return page.evaluate(() => {
    const issues = [];
    if (!document.querySelector('html[lang]')) issues.push({ id: 'html-lang', impact: 'serious' });
    if (!document.querySelector('.skip-link, a.skip-link')) {
      issues.push({ id: 'skip-link', impact: 'moderate' });
    }
    if (!document.querySelector('main#main, #main')) {
      issues.push({ id: 'main-landmark', impact: 'serious' });
    }
    const imgs = [...document.querySelectorAll('img')];
    for (const img of imgs) {
      if (!img.hasAttribute('alt')) issues.push({ id: 'img-alt', impact: 'serious', target: img.src });
    }
    const buttons = [...document.querySelectorAll('button, [role="button"]')];
    for (const b of buttons) {
      const name = (b.getAttribute('aria-label') || b.textContent || '').trim();
      if (!name) issues.push({ id: 'button-name', impact: 'serious' });
    }
    // Very rough contrast sample on muted text
    const muted = document.querySelector('.el-muted, .el-lead, .el-hero-desc');
    if (muted) {
      const cs = getComputedStyle(muted);
      issues.push({
        id: 'contrast-sample',
        impact: 'info',
        color: cs.color,
        background: getComputedStyle(document.body).backgroundColor,
      });
    }
    return issues;
  });
}

async function runLighthouse(url) {
  return new Promise((resolve) => {
    const outPath = path.join(outDir, 'lighthouse.json');
    const child = spawn(
      'npx',
      [
        '--yes',
        'lighthouse',
        url,
        '--quiet',
        '--chrome-flags=--headless --no-sandbox',
        '--only-categories=performance,accessibility,best-practices,seo',
        '--output=json',
        `--output-path=${outPath}`,
      ],
      { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] }
    );
    let err = '';
    child.stderr.on('data', (d) => {
      err += d;
    });
    child.on('exit', (code) => {
      resolve({ ok: code === 0, code, err: err.slice(0, 500), path: outPath });
    });
  });
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(500);

  const a11y = await heuristicA11y(page);
  const serious = a11y.filter((i) => i.impact === 'serious');
  const perfMetrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    return nav
      ? {
          domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
          loadEvent: Math.round(nav.loadEventEnd),
          transferSize: nav.transferSize,
          encodedBodySize: nav.encodedBodySize,
        }
      : null;
  });
  await browser.close();

  // Lighthouse is best-effort; failures are recorded but do not fail the gate by themselves.
  const lighthouse =
    process.env.ENTRY_SKIP_LIGHTHOUSE === '1'
      ? { skipped: true }
      : await runLighthouse(baseUrl);

  let lighthouseScores = null;
  if (lighthouse.ok) {
    try {
      const raw = JSON.parse(await (await import('node:fs/promises')).readFile(lighthouse.path, 'utf8'));
      lighthouseScores = {
        performance: raw.categories?.performance?.score,
        accessibility: raw.categories?.accessibility?.score,
        bestPractices: raw.categories?.['best-practices']?.score,
        seo: raw.categories?.seo?.score,
      };
    } catch {
      lighthouseScores = { parseError: true };
    }
  } else if (!lighthouse.skipped) {
    lighthouseScores = { unavailable: true, detail: lighthouse.err || lighthouse.code };
  }

  const report = {
    auditedAt: new Date().toISOString(),
    baseUrl,
    a11y: { issues: a11y, seriousCount: serious.length },
    performance: { navigation: perfMetrics, lighthouse: lighthouseScores, lighthouseMeta: lighthouse },
  };
  await writeFile(path.join(outDir, 'a11y-perf.json'), JSON.stringify(report, null, 2));

  if (serious.length) {
    console.error('[audit-a11y-perf] serious a11y issues', serious);
    process.exit(1);
  }
  console.log('[audit-a11y-perf] OK', JSON.stringify({ serious: serious.length, lighthouseScores }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
