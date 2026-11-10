// Mobile layout audit for every page of the static site.
// Usage (repo root, server from evidence/website-og-20261110/tools/serve_vercel_routes.mjs running):
//   node evidence/website-mobile-20261110/tools/audit.mjs <label> <baseUrl> [widths=390] [pages=all] [--shots] [--desk]
// Writes evidence/website-mobile-20261110/<label>/audit-<width>.json and, with --shots, <width>/<page>.png (full page, DPR 1).
// --desk adds full-page 1440×900 screenshots in desk/ for the desktop before/after diff.
// EVIDENCE_OUT=<dir> puts the screenshots in <dir>/<label>/ instead (full-size captures are kept outside the repo).
// Playwright and sharp are not dependencies of this repo; they are loaded from PLAYWRIGHT_FROM (a checkout that has them).
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..', '..');
const from = process.env.PLAYWRIGHT_FROM || '/Users/sandis/EXECUTIA/repositories/LIFE/WORKTREES/g3-fixes-20261110/package.json';
const { chromium } = createRequire(from)('playwright');

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const [label, base, widthsArg = '390', pagesArg = 'all'] = args.filter((a) => !a.startsWith('--'));
if (!label || !base) throw new Error('usage: audit.mjs <label> <baseUrl> [widths] [pages] [--shots] [--desk]');
const widths = widthsArg.split(',').map(Number);

export function sitePages() {
  const routes = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8')).routes;
  const routed = new Map();
  for (const r of routes) {
    if (!r.dest?.endsWith('.html')) continue;
    const file = r.dest.replace(/^\//, '');
    // Pages with relative asset URLs (./app.js) render blank at their routed URL (/life → /app.js); audit them at the file URL.
    const relative = /(?:href|src)="\.\//.test(readFileSync(join(root, file), 'utf8'));
    const routedPath = r.src.replace(/^\^|\$$/g, '').replace('/?', '').replace(/\\/g, '') || '/';
    if (!routed.has(file)) routed.set(file, relative ? `/${file}` : routedPath);
  }
  const walk = (dir) =>
    readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) => {
      const rel = dir ? `${dir}/${e.name}` : e.name;
      if (e.isDirectory()) return ['node_modules', 'evidence', '.git'].includes(e.name) ? [] : walk(rel);
      return e.name.endsWith('.html') ? [rel] : [];
    });
  const unrouted = walk('').filter((f) => !routed.has(f)).sort();
  return [...routed.entries()].map(([file, path]) => ({ file, path })).concat(unrouted.map((f) => ({ file: f, path: `/${f}` })));
}

const slug = (p) => (p.path === '/' ? 'home' : p.path.replace(/^\//, '').replace(/\/index\.html$/, '').replace(/[/.]+/g, '_'));

let pages = sitePages();
if (pagesArg !== 'all') {
  const want = new Set(pagesArg.split(','));
  pages = pages.filter((p) => want.has(slug(p)));
}

async function settle(page) {
  // Reveal-on-scroll sections only render once seen: walk the page, then return to the top.
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(innerHeight * 0.6));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    scrollTo(0, 0);
  });
  await page.waitForTimeout(400);
}

function measure() {
  const W = innerWidth;
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const hiddenByAncestor = (el) => {
    for (let a = el; a; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.display === 'none' || cs.visibility === 'hidden') return true;
      if (a !== el && (cs.overflow === 'hidden' || cs.overflowX === 'hidden' || cs.overflowX === 'clip')) {
        const r = a.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return true;
      }
    }
    return false;
  };
  const describe = (el) => {
    const r = el.getBoundingClientRect();
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    return { el: el.tagName.toLowerCase() + (cls ? `.${cls}` : ''), x: Math.round(r.left), right: Math.round(r.right), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height), text: (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40) };
  };

  const brand = [...document.querySelectorAll('header .brand, header [class*="brand"], .brand, a[aria-label*="home" i]')]
    .find((el) => visible(el) && el.getBoundingClientRect().top < 160);
  const gutter = brand ? Math.round(brand.getBoundingClientRect().left) : null;

  // Header gutter: distance from each viewport side to the header's outermost visible item.
  const header = document.querySelector('header');
  const headItems = header ? [...header.querySelectorAll('a, button, img, svg')].filter((el) => visible(el) && !hiddenByAncestor(el)) : [];
  const headGutter = headItems.length
    ? {
        left: Math.round(Math.min(...headItems.map((e) => e.getBoundingClientRect().left))),
        right: Math.round(W - Math.max(...headItems.map((e) => e.getBoundingClientRect().right))),
      }
    : null;

  // Text that touches the viewport edge: elements with their own text, visible, closer than 8 px to either side.
  // Text gutter: the smallest distance from either side to body text outside the header and footer.
  const edge = [];
  const textGutter = { left: Infinity, right: Infinity };
  for (const el of document.querySelectorAll('body *')) {
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'svg', 'path'].includes(el.tagName)) continue;
    const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!ownText || !visible(el) || hiddenByAncestor(el)) continue;
    const range = document.createRange();
    range.selectNodeContents(el);
    const r = range.getBoundingClientRect();
    if (r.width === 0) continue;
    if (r.left < 8 || r.right > W - 8) edge.push({ ...describe(el), textLeft: Math.round(r.left), textRight: Math.round(r.right) });
    if (!el.closest('header, footer, [aria-hidden="true"]') && r.left >= 0 && r.right <= W) {
      textGutter.left = Math.min(textGutter.left, Math.round(r.left));
      textGutter.right = Math.min(textGutter.right, Math.round(W - r.right));
    }
  }

  // Tap targets under 44×44 that are not inline links inside running text (WCAG 2.5.8 inline exception).
  const small = [];
  for (const el of document.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], summary')) {
    if (!visible(el) || hiddenByAncestor(el)) continue;
    // A control wrapped in its <label> is tapped through the whole label.
    const target = el.matches('input, select, textarea') ? el.closest('label') || el : el;
    const r = target.getBoundingClientRect();
    if (r.height >= 44 && r.width >= 44) continue;
    const inline = getComputedStyle(el).display === 'inline' && el.closest('p, li, td, dd, figcaption, small, label');
    if (inline) continue;
    small.push(describe(el));
  }

  // Elements wider than the viewport (cause horizontal scroll unless clipped).
  const wide = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el) || hiddenByAncestor(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right > W + 1 || r.left < -1) wide.push(describe(el));
  }

  const howEl = document.getElementById('how-it-works');
  const howRect = howEl?.getBoundingClientRect();
  const how = howRect ? { top: Math.round(howRect.top + scrollY), height: Math.round(howRect.height) } : null;

  return {
    innerWidth: W,
    how,
    scrollWidth: document.documentElement.scrollWidth,
    overflowX: document.documentElement.scrollWidth > W,
    gutter,
    headGutter,
    textGutter,
    edgeText: edge.slice(0, 40),
    edgeTextCount: edge.length,
    smallTargets: small.slice(0, 40),
    smallTargetCount: small.length,
    outside: wide.slice(0, 20),
    outsideCount: wide.length,
  };
}

const jsonOut = join(here, '..', label);
const out = join(process.env.EVIDENCE_OUT || join(here, '..'), label);
mkdirSync(jsonOut, { recursive: true });
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
for (const width of widths) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce', isMobile: width < 900, hasTouch: width < 900 });
  const page = await ctx.newPage();
  const report = {};
  if (flags.has('--shots')) mkdirSync(join(out, String(width)), { recursive: true });
  for (const p of pages) {
    await page.goto(base + p.path, { waitUntil: 'networkidle' });
    await settle(page);
    report[p.path] = { file: p.file, ...(await page.evaluate(measure)) };
    if (flags.has('--shots')) await page.screenshot({ path: join(out, String(width), `${slug(p)}.png`), fullPage: true });
    const r = report[p.path];
    const lr = (g) => (g ? `${g.left}/${g.right}` : '-');
    console.log(`${width} ${p.path.padEnd(28)} sw=${r.scrollWidth} head=${lr(r.headGutter)} text=${lr(r.textGutter)} edge=${r.edgeTextCount} small=${r.smallTargetCount} outside=${r.outsideCount}`);
  }
  const file = join(jsonOut, `audit-${width}.json`);
  const merged = pagesArg !== 'all' && existsSync(file) ? { ...JSON.parse(readFileSync(file, 'utf8')), ...report } : report;
  writeFileSync(file, JSON.stringify(merged, null, 1));
  await ctx.close();
}
if (flags.has('--desk')) {
  mkdirSync(join(out, 'desk'), { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  for (const p of pages) {
    await page.goto(base + p.path, { waitUntil: 'networkidle' });
    await settle(page);
    await page.screenshot({ path: join(out, 'desk', `${slug(p)}.png`), fullPage: true });
  }
  await ctx.close();
}
await browser.close();
