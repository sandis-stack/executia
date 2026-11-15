// TASK-35 — radius audit for all site pages at 390 + 1440.
// Usage (repo root, serve_vercel_routes.mjs running):
//   PLAYWRIGHT_FROM=<pkg.json> node evidence/website-rounded-20261114/tools/radius-audit.mjs <label> <baseUrl> [widths=390,1440]
// Writes evidence/website-rounded-20261114/<label>/radius-<width>.json
// and <label>/summary.json with counts of radius-0 boxes outside the exception list.
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..', '..');
const from =
  process.env.PLAYWRIGHT_FROM ||
  '/Users/sandis/EXECUTIA/repositories/LIFE/WORKTREES/t34-scanner-20261114/package.json';
const { chromium } = createRequire(from)('playwright');

const [label, base, widthsArg = '390,1440'] = process.argv.slice(2);
if (!label || !base) {
  throw new Error('usage: radius-audit.mjs <label> <baseUrl> [widths=390,1440]');
}
const widths = widthsArg.split(',').map(Number);
const outRoot = join(here, '..', label);
mkdirSync(outRoot, { recursive: true });

function sitePages() {
  const routes = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8')).routes;
  const routed = new Map();
  for (const r of routes) {
    if (!r.dest?.endsWith('.html')) continue;
    const file = r.dest.replace(/^\//, '');
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
  const redirect = (path) =>
    routes.find((r) => !r.has && r.status && r.headers?.Location && new RegExp(r.src).test(path));
  return [...routed.entries()]
    .map(([file, path]) => ({ file, path }))
    .concat(unrouted.map((f) => ({ file: f, path: `/${f}` })))
    .map((p) => ({
      ...p,
      redirect: redirect(p.path)
        ? `${redirect(p.path).status} ${redirect(p.path).headers.Location}`
        : null,
    }));
}

const slug = (p) =>
  p.path === '/'
    ? 'home'
    : p.path.replace(/^\//, '').replace(/\/index\.html$/, '').replace(/[/.]+/g, '_');

const pages = sitePages().filter((p) => !p.redirect);

async function settle(page) {
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(innerHeight * 0.6));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    scrollTo(0, 0);
  });
  await page.waitForTimeout(250);
}

function measureBoxes() {
  const W = innerWidth;
  const px = (v) => {
    if (!v || v === '0') return 0;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const hasBox = (el, cs) => {
    const bw =
      px(cs.borderTopWidth) +
      px(cs.borderRightWidth) +
      px(cs.borderBottomWidth) +
      px(cs.borderLeftWidth);
    if (bw > 0) return true;
    if (cs.backgroundImage && cs.backgroundImage !== 'none') return true;
    const bg = cs.backgroundColor;
    if (!bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') return false;
    // Skip pure page wash (body/html already excluded); treat solid fills as boxes.
    return true;
  };
  const isException = (el, cs, r) => {
    const tag = el.tagName.toLowerCase();
    if (tag === 'html' || tag === 'body' || tag === 'main' || tag === 'section' || tag === 'hr') {
      return true;
    }
    // Hairline divider: thin strip, or only a top/bottom rule (no side border).
    if (r.height <= 3 && r.width >= 24) return true;
    if (r.width <= 3 && r.height >= 24) return true;
    const bt = px(cs.borderTopWidth);
    const br = px(cs.borderRightWidth);
    const bb = px(cs.borderBottomWidth);
    const bl = px(cs.borderLeftWidth);
    if ((bt > 0 || bb > 0) && br === 0 && bl === 0) return true; // horizontal hairline
    if ((bl > 0 || br > 0) && bt === 0 && bb === 0) return true; // vertical hairline
    // Full-bleed: sticky site chrome or edge-to-edge band.
    if (Math.abs(r.left) <= 1 && Math.abs(r.right - W) <= 1 && r.width >= W - 2) return true;
    if (cs.position === 'sticky' || cs.position === 'fixed') return true;
    // Table cells inherit the table's outer frame; cells themselves stay square.
    if (tag === 'td' || tag === 'th' || tag === 'tr' || tag === 'tbody' || tag === 'thead') {
      return true;
    }
    // Background-only full-width tracks with no own border.
    const bw = bt + br + bb + bl;
    if (bw === 0 && r.width >= W - 2) return true;
    return false;
  };
  const describe = (el) => {
    const cls =
      typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
    return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}`;
  };

  const out = [];
  for (const el of document.querySelectorAll('*')) {
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    if (!hasBox(el, cs)) continue;
    const r = el.getBoundingClientRect();
    const radii = {
      tl: px(cs.borderTopLeftRadius),
      tr: px(cs.borderTopRightRadius),
      br: px(cs.borderBottomRightRadius),
      bl: px(cs.borderBottomLeftRadius),
    };
    const minR = Math.min(radii.tl, radii.tr, radii.br, radii.bl);
    const maxR = Math.max(radii.tl, radii.tr, radii.br, radii.bl);
    const exception = isException(el, cs, r);
    out.push({
      el: describe(el),
      x: Math.round(r.left),
      y: Math.round(r.top + scrollY),
      w: Math.round(r.width),
      h: Math.round(r.height),
      radiusMin: minR,
      radiusMax: maxR,
      radii,
      exception,
      square: !exception && minR === 0,
      text: (el.innerText || el.getAttribute('aria-label') || '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 48),
    });
  }
  return out;
}

function measureHomeTokens() {
  const sample = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      sel,
      radius: cs.borderRadius,
      border: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`,
    };
  };
  const root = getComputedStyle(document.documentElement);
  return {
    cssVars: {
      radius: root.getPropertyValue('--radius').trim(),
      radiusCard: root.getPropertyValue('--radius-card').trim(),
      radiusControl: root.getPropertyValue('--radius-control').trim(),
      radiusPill: root.getPropertyValue('--radius-pill').trim(),
    },
    samples: [
      sample('.card'),
      sample('.panel'),
      sample('.menu-toggle'),
      sample('.pill-btn'),
      sample('.input'),
      sample('header .brand'),
      sample('.hp-flow-step, .hp-phase-badge, .tag'),
    ].filter(Boolean),
  };
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const summary = { label, base, widths, pages: pages.length, byWidth: {}, squareTotal: 0, homeTokens: {} };

for (const width of widths) {
  const height = width >= 1200 ? 900 : 844;
  const byPage = {};
  let square = 0;
  for (const p of pages) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const url = new URL(p.path, base).href;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await settle(page);
    const boxes = await page.evaluate(measureBoxes);
    if (p.path === '/' && !summary.homeTokens[width]) {
      summary.homeTokens[width] = await page.evaluate(measureHomeTokens);
    }
    const squares = boxes.filter((b) => b.square);
    square += squares.length;
    byPage[slug(p)] = {
      path: p.path,
      file: p.file,
      boxes: boxes.length,
      square: squares.length,
      squares: squares.slice(0, 40),
      radiusHistogram: boxes.reduce((acc, b) => {
        const key = String(b.radiusMin);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
    };
    await context.close();
  }
  writeFileSync(join(outRoot, `radius-${width}.json`), JSON.stringify(byPage, null, 2));
  summary.byWidth[width] = { square, pages: Object.keys(byPage).length };
  summary.squareTotal += square;
  console.log(`width ${width}: square(non-exception)=${square} pages=${Object.keys(byPage).length}`);
}

writeFileSync(join(outRoot, 'summary.json'), JSON.stringify(summary, null, 2));
await browser.close();
console.log('summary', summary.squareTotal, '→', join(outRoot, 'summary.json'));
if (!existsSync(join(outRoot, 'summary.json'))) process.exit(1);
