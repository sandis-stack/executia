#!/usr/bin/env node
/**
 * Fail if preview, gallery, screenshots, and local HEAD are out of sync.
 *
 * ENTRY_REQUIRE_COMMIT=b3d062e node scripts/entry-review/verify-review-consistency.mjs
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const latest = path.join(root, 'evidence/entry-review/latest');
const require = createRequire(import.meta.url);

function gitShort() {
  return execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim();
}

function gitFull() {
  return execSync('git rev-parse HEAD', { cwd: root }).toString().trim();
}

function loadPlaywright() {
  const candidates = [
    path.join(root, 'packages/executia-website/node_modules/playwright'),
    path.join(root, 'packages/pilot-workspace/node_modules/playwright'),
    'playwright',
  ];
  for (const c of candidates) {
    try {
      return require(c);
    } catch {}
  }
  throw new Error('playwright not found');
}

async function main() {
  const required = (process.env.ENTRY_REQUIRE_COMMIT || '').trim();
  const short = gitShort();
  const full = gitFull();

  if (required) {
    const ok =
      short === required ||
      full.startsWith(required) ||
      required.startsWith(short);
    if (!ok) {
      console.error(`[verify-sync] HEAD ${short} does not match required ${required}`);
      process.exit(1);
    }
  }

  const previewUrl = (await readFile(path.join(latest, 'PREVIEW_URL.txt'), 'utf8')).trim();
  const galleryUrl = (await readFile(path.join(latest, 'GALLERY_URL.txt'), 'utf8')).trim();
  const gallery = JSON.parse(await readFile(path.join(latest, 'gallery.json'), 'utf8'));
  const visual = JSON.parse(await readFile(path.join(latest, 'visual.json'), 'utf8'));
  const report = JSON.parse(await readFile(path.join(latest, 'REPORT.json'), 'utf8'));

  const galleryCommit = String(gallery.commit || '');
  const reportCommit = String(report.short || report.commit || '');

  if (galleryCommit !== short && !full.startsWith(galleryCommit)) {
    console.error(`[verify-sync] gallery.json commit ${galleryCommit} != HEAD ${short}`);
    process.exit(1);
  }
  if (reportCommit && reportCommit !== short && !String(report.commit || '').startsWith(short)) {
    console.error(`[verify-sync] REPORT commit ${reportCommit} != HEAD ${short}`);
    process.exit(1);
  }

  const galleryHtml = await (await fetch(galleryUrl.replace(/\/?$/, '/') )).text();
  if (!galleryHtml.includes(short) && !galleryHtml.includes(galleryCommit)) {
    console.error(`[verify-sync] live gallery HTML does not report commit ${short}`);
    process.exit(1);
  }

  const previewRes = await fetch(previewUrl.replace(/\/?$/, '/') );
  const previewHtml = await previewRes.text();
  if (!/data-page="entry"|Execution creates reality|Ideas create possibilities|Execution defines what becomes real/i.test(previewHtml)) {
    console.error('[verify-sync] preview does not look like expected ENTRY');
    process.exit(1);
  }
  if (!/Ideas create possibilities/i.test(previewHtml) || !/Execution creates reality/i.test(previewHtml)) {
    console.error('[verify-sync] approved thesis missing from ENTRY');
    process.exit(1);
  }

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(previewUrl.replace(/\/?$/, '/') + '?v=' + Date.now(), {
    waitUntil: 'networkidle',
    timeout: 60000,
  });
  await page.waitForTimeout(800);
  const liveHero = await page.evaluate(() => {
    const axioms = document.querySelector('.ev-axioms');
    if (axioms) return (axioms.innerText || '').replace(/\s+/g, ' ').trim();
    const h1 = document.querySelector('#reality h1, h1');
    return (h1?.innerText || '').replace(/\s+/g, ' ').trim();
  });
  await browser.close();

  const capturedHero = String(visual.heroText || '').replace(/\s+/g, ' ').trim();
  if (!liveHero) {
    console.error('[verify-sync] could not read live preview opening text');
    process.exit(1);
  }
  if (capturedHero && capturedHero !== liveHero) {
    console.error('[verify-sync] captured opening text != live preview');
    console.error('  captured:', capturedHero);
    console.error('  live:    ', liveHero);
    process.exit(1);
  }
  if (!/Execution defines what becomes real|decision alone changes nothing|Ideas create possibilities/i.test(liveHero)) {
    console.error('[verify-sync] live opening text unexpected:', liveHero);
    process.exit(1);
  }

  // Gallery reality PNG must exist and be public
  const heroPng = `${galleryUrl.replace(/\/$/, '')}/sections/reality.png`;
  const pngRes = await fetch(heroPng);
  const buf = Buffer.from(await pngRes.arrayBuffer());
  const isPng = buf[0] === 0x89 && buf[1] === 0x50;
  if (!pngRes.ok || !isPng) {
    console.error('[verify-sync] gallery reality PNG not publicly available');
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        commit: short,
        previewUrl,
        galleryUrl,
        liveHero,
        capturedHero: capturedHero || liveHero,
        galleryCommit,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
