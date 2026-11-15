// Capture viewport PNGs for TASK-35 sheet rows.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const from =
  process.env.PLAYWRIGHT_FROM ||
  '/Users/sandis/EXECUTIA/repositories/LIFE/WORKTREES/t34-scanner-20261114/package.json';
const { chromium } = createRequire(from)('playwright');

const [label, base, outDir] = process.argv.slice(2);
if (!label || !base || !outDir) throw new Error('usage: sheet-capture.mjs <label> <baseUrl> <outDir>');
mkdirSync(outDir, { recursive: true });
const pages = [
  { path: '/engine', slug: 'engine' },
  { path: '/', slug: 'home' },
  { path: '/one', slug: 'one' },
  { path: '/proof', slug: 'proof' },
];
const widths = [390, 1440];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const width of widths) {
  const height = width >= 1200 ? 900 : 844;
  for (const p of pages) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.goto(new URL(p.path, base).href, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(500);
    const buf = await page.screenshot({ fullPage: false, type: 'png' });
    writeFileSync(join(outDir, `${label}-${width}-${p.slug}.png`), buf);
    await context.close();
  }
}
await browser.close();
console.log('wrote', outDir);
