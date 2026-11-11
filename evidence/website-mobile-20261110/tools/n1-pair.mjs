// N1: the Engine card's PDF button before | after, cropped from full-page home captures at the same page position.
// Usage: node evidence/website-mobile-20261110/tools/n1-pair.mjs <baseUrl> <beforeDir> <afterDir>
//   <dir>/<width>/home.png → compare/n1-engine-pdf-<width>.png (widths 320, 390)
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const from = process.env.PLAYWRIGHT_FROM || '/Users/sandis/EXECUTIA/repositories/LIFE/WORKTREES/g3-fixes-20261110/package.json';
const { chromium } = createRequire(from)('playwright');
const sharp = createRequire(import.meta.url)(
  process.env.SHARP_DIR || '/Users/sandis/EXECUTIA/repositories/LIFE/WORKTREES/g3-fixes-20261110/node_modules/.pnpm/sharp@0.34.5/node_modules/sharp',
);
const [base, beforeDir, afterDir] = process.argv.slice(2);
if (!base || !beforeDir || !afterDir) throw new Error('usage: n1-pair.mjs <baseUrl> <beforeDir> <afterDir>');
const GAP = 16;

const browser = await chromium.launch({ channel: 'chrome' });
for (const width of [320, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  const box = await page.evaluate(() => {
    const dock = document.querySelector('.spec-download-dock').getBoundingClientRect();
    return { top: Math.round(dock.top + scrollY), bottom: Math.round(dock.bottom + scrollY) };
  });
  await ctx.close();
  const top = Math.max(0, box.top - 140);
  const height = box.bottom - top + 40;
  const crop = (f) => sharp(f).extract({ left: 0, top, width, height }).png().toBuffer();
  const [a, b] = await Promise.all([crop(join(beforeDir, String(width), 'home.png')), crop(join(afterDir, String(width), 'home.png'))]);
  await sharp({ create: { width: width * 2 + GAP, height, channels: 3, background: '#ff00ff' } })
    .composite([
      { input: a, left: 0, top: 0 },
      { input: b, left: width + GAP, top: 0 },
    ])
    .png()
    .toFile(join(here, '..', 'compare', `n1-engine-pdf-${width}.png`));
}
await browser.close();
console.log('n1 pairs written');
