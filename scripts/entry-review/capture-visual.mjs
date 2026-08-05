#!/usr/bin/env node
/**
 * ENTRY review — Playwright screenshots + layout/overflow + console/network checks.
 *
 * Usage:
 *   ENTRY_URL=https://... node scripts/entry-review/capture-visual.mjs
 *   ENTRY_URL=http://127.0.0.1:4390/ node scripts/entry-review/capture-visual.mjs
 */
import { createRequire } from 'node:module';
import { mkdir, writeFile, cp, rm, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

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
  throw new Error('playwright not found — install in packages/executia-website or root');
}

const { chromium } = loadPlaywright();

const baseUrl = (process.env.ENTRY_URL || 'http://127.0.0.1:4390/').replace(/\/?$/, '/');
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16).replace('T', '-');
const latestDir = path.join(root, 'evidence/entry-review/latest');
const archiveDir = path.join(root, 'evidence/entry-review', stamp);
const shotsDir = path.join(latestDir, 'screenshots');
const sectionsDir = path.join(shotsDir, 'sections');

const VIEWPORTS = {
  desktop: { width: 1440, height: 1000 },
  tablet: { width: 1024, height: 900 },
  mobile: { width: 390, height: 844 },
};

const SECTION_IDS = ['reality', 'truth-statement', 'problem', 'cost', 'thinking', 'executia', 'model', 'engine', 'applications', 'vision', 'pilot'];

function gitHash() {
  try {
    return execSync('git rev-parse HEAD', { cwd: root }).toString().trim();
  } catch {
    return null;
  }
}

async function prepareDirs() {
  await rm(shotsDir, { recursive: true, force: true });
  await mkdir(sectionsDir, { recursive: true });
  await mkdir(archiveDir, { recursive: true });
}

async function reveal(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.el-reveal, .el-frag, .el-chain').forEach((el) => {
      el.classList.add('is-visible');
    });
  });
}

async function capture() {
  await prepareDirs();
  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const overflow = [];
  const anchorResults = [];

  async function withPage(viewport, mobile, fn) {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
      isMobile: !!mobile,
      hasTouch: !!mobile,
    });
    const page = await context.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push({ text: msg.text(), viewport: viewport.width });
    });
    page.on('pageerror', (err) => pageErrors.push({ message: String(err), viewport: viewport.width }));
    page.on('requestfailed', (req) => {
      failedRequests.push({
        url: req.url(),
        error: req.failure()?.errorText || 'failed',
        viewport: viewport.width,
      });
    });
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(600);
    await reveal(page);
    await page.waitForTimeout(200);
    await fn(page);
    await context.close();
  }

  let heroText = '';

  // Full pages
  await withPage(VIEWPORTS.desktop, false, async (page) => {
    heroText = await page.evaluate(() => {
      const axioms = document.querySelector('.ev-axioms');
      if (axioms) return (axioms.innerText || '').replace(/\s+/g, ' ').trim();
      const h1 = document.querySelector('#reality h1, h1');
      return (h1?.innerText || '').replace(/\s+/g, ' ').trim();
    });
    await page.screenshot({
      path: path.join(shotsDir, 'full-desktop-1440x1000.png'),
      fullPage: true,
    });
    const ov = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        overflow: doc.scrollWidth > doc.clientWidth + 1,
      };
    });
    if (ov.overflow) overflow.push({ viewport: 'desktop', ...ov });

    // Anchors
    const anchors = await page.evaluate(() =>
      [...document.querySelectorAll('a[href^="#"], a[href*="/#"]')]
        .map((a) => a.getAttribute('href'))
        .filter(Boolean)
    );
    const ids = new Set(
      await page.evaluate(() => [...document.querySelectorAll('[id]')].map((el) => el.id))
    );
    for (const href of anchors) {
      const hash = href.includes('#') ? href.split('#').pop() : '';
      if (!hash) continue;
      anchorResults.push({ href, id: hash, ok: ids.has(hash) });
    }

    // Sections
    for (const id of SECTION_IDS) {
      const loc = page.locator('#' + id);
      if ((await loc.count()) === 0) {
        throw new Error(`Missing section #${id}`);
      }
      await loc.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
      await loc.screenshot({ path: path.join(sectionsDir, `${id}.png`) });
    }
  });

  await withPage(VIEWPORTS.tablet, false, async (page) => {
    await page.screenshot({
      path: path.join(shotsDir, 'full-tablet-1024x900.png'),
      fullPage: true,
    });
    const ov = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        overflow: doc.scrollWidth > doc.clientWidth + 1,
      };
    });
    if (ov.overflow) overflow.push({ viewport: 'tablet', ...ov });
  });

  await withPage(VIEWPORTS.mobile, true, async (page) => {
    await page.screenshot({
      path: path.join(shotsDir, 'full-mobile-390x844.png'),
      fullPage: true,
    });
    const ov = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        overflow: doc.scrollWidth > doc.clientWidth + 1,
      };
    });
    if (ov.overflow) overflow.push({ viewport: 'mobile', ...ov });

    // Open mobile nav
    const toggle = page.locator('.menu-toggle');
    if ((await toggle.count()) > 0) {
      await toggle.first().click();
      await page.waitForTimeout(300);
      await page.screenshot({
        path: path.join(shotsDir, 'mobile-nav-open.png'),
        fullPage: false,
      });
    } else {
      throw new Error('Mobile menu toggle not found');
    }
  });

  await browser.close();

  const meta = {
    capturedAt: new Date().toISOString(),
    baseUrl,
    commit: gitHash(),
    heroText,
    screenshots: {
      full: [
        'screenshots/full-desktop-1440x1000.png',
        'screenshots/full-tablet-1024x900.png',
        'screenshots/full-mobile-390x844.png',
        'screenshots/mobile-nav-open.png',
      ],
      sections: SECTION_IDS.map((id) => `screenshots/sections/${id}.png`),
    },
    consoleErrors,
    pageErrors,
    failedRequests: failedRequests.filter(
      (r) =>
        !/favicon|fonts\.gstatic|fonts\.googleapis|googletagmanager|google-analytics/i.test(r.url) &&
        !/net::ERR_ABORTED/i.test(r.error || '')
    ),
    overflow,
    anchors: {
      total: anchorResults.length,
      failed: anchorResults.filter((a) => !a.ok),
      all: anchorResults,
    },
  };

  await writeFile(path.join(latestDir, 'visual.json'), JSON.stringify(meta, null, 2));

  // Archive copy
  await cp(latestDir, archiveDir, { recursive: true });

  const hardFail =
    consoleErrors.length > 0 ||
    pageErrors.length > 0 ||
    meta.failedRequests.length > 0 ||
    overflow.length > 0 ||
    meta.anchors.failed.length > 0;

  if (hardFail) {
    console.error('[capture-visual] FAILED checks', {
      consoleErrors: consoleErrors.length,
      pageErrors: pageErrors.length,
      failedRequests: meta.failedRequests.length,
      overflow: overflow.length,
      brokenAnchors: meta.anchors.failed.length,
    });
    process.exit(1);
  }

  console.log('[capture-visual] OK', shotsDir);
}

capture().catch((e) => {
  console.error(e);
  process.exit(1);
});
