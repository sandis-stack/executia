// TASK-21b: the old prototype pages at their routed URL and at their file URL.
// Usage (repo root, server from evidence/website-og-20261110/tools/serve_vercel_routes.mjs running):
//   node evidence/website-21b-20261111/tools/prototypes.mjs <label> <baseUrl> [widths=320,390,768,1440]
// Writes evidence/website-21b-20261111/<label>/prototypes.json: per page, URL and width, the stylesheets and scripts that
// loaded, failed requests, script errors, page height, and every control's box and real tap area; a control is small
// when its tap area is under 44×44 (controls as in the TASK-21 audit, inline links in running text excepted).
// Full-page screenshots (DPR 1) go to $EVIDENCE_OUT/<label>/<width>/<slug>.png (kept outside the repo).
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const from = process.env.PLAYWRIGHT_FROM || '/Users/sandis/EXECUTIA/repositories/LIFE/WORKTREES/g3-fixes-20261110/package.json';
const { chromium } = createRequire(from)('playwright');

const [label, base, widthsArg = '320,390,768,1440'] = process.argv.slice(2);
if (!label || !base) throw new Error('usage: prototypes.mjs <label> <baseUrl> [widths]');
const widths = widthsArg.split(',').map(Number);

export const PAGES = [
  { slug: 'life', url: '/life' },
  { slug: 'life_slash', url: '/life/' },
  { slug: 'life_file', url: '/apps/life/index.html' },
  { slug: 'life-proof', url: '/life-proof' },
  { slug: 'life-proof_slash', url: '/life-proof/' },
  { slug: 'life-proof_file', url: '/proofs/life-proof/index.html' },
  { slug: 'invoice-proof', url: '/invoice-proof' },
  { slug: 'invoice-proof_slash', url: '/invoice-proof/' },
  { slug: 'invoice-proof_file', url: '/proofs/invoice-proof/index.html' },
];

function measure() {
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
    }
    return false;
  };
  // The area that really takes the tap: from the centre, step 1 px outwards while elementFromPoint still lands in
  // the control (a ::after hit area counts; anything off-screen or covered by another element does not).
  const hitArea = (target) => {
    const r = target.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const inside = (x, y) => x >= 0 && y >= 0 && x < innerWidth && y < innerHeight && target.contains(document.elementFromPoint(x, y));
    if (!inside(cx, cy)) return { w: 0, h: 0 };
    let up = 0;
    while (inside(cx, cy - up - 1)) up += 1;
    let down = 0;
    while (inside(cx, cy + down + 1)) down += 1;
    let left = 0;
    while (inside(cx - left - 1, cy)) left += 1;
    let right = 0;
    while (inside(cx + right + 1, cy)) right += 1;
    return { w: left + right + 1, h: up + down + 1 };
  };
  const controls = [];
  for (const el of document.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], summary')) {
    if (!visible(el) || hiddenByAncestor(el)) continue;
    const inline = getComputedStyle(el).display === 'inline' && el.closest('p, li, td, dd, figcaption, small, label');
    if (inline) continue;
    const target = el.matches('input, select, textarea') ? el.closest('label') || el : el;
    let r = target.getBoundingClientRect();
    if (r.top < 0 || r.bottom > innerHeight) {
      target.scrollIntoView({ block: 'center', behavior: 'instant' });
      r = target.getBoundingClientRect();
    }
    const hit = hitArea(target);
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    controls.push({
      el: el.tagName.toLowerCase() + (cls ? `.${cls}` : ''),
      text: (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40),
      box: { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top + scrollY) },
      hit,
    });
  }
  scrollTo({ top: 0, behavior: 'instant' });
  const small = controls.filter((c) => c.hit.w < 44 || c.hit.h < 44);
  const smallByBox = controls.filter((c) => c.box.w < 44 || c.box.h < 44).length;
  const rules = [...document.styleSheets].map((s) => {
    try {
      return { href: s.href, rules: s.cssRules.length };
    } catch {
      return { href: s.href, rules: null };
    }
  });
  return {
    title: document.title,
    stylesheets: rules.filter((s) => s.href),
    scrollWidth: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    bodyText: document.body.innerText.trim().length,
    controls,
    smallTargets: small,
    smallTargetCount: small.length,
    smallByBox,
  };
}

const jsonOut = join(here, '..', label);
const shotsOut = join(process.env.EVIDENCE_OUT || join(here, '..'), label);
mkdirSync(jsonOut, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const report = {};
for (const width of widths) {
  mkdirSync(join(shotsOut, String(width)), { recursive: true });
  for (const p of PAGES) {
    // A fresh context per page: the /life prototype keeps its inbox in localStorage and grows it on every load.
    const ctx = await browser.newContext({
      viewport: { width, height: width < 900 ? 844 : 900 },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
      isMobile: width < 900,
      hasTouch: width < 900,
    });
    const page = await ctx.newPage();
    const failed = [];
    const loaded = [];
    const errors = [];
    page.on('response', (res) => {
      const type = res.request().resourceType();
      if (type === 'stylesheet' || type === 'script') {
        const entry = { type, url: new URL(res.url()).pathname, status: res.status() };
        (res.status() >= 400 ? failed : loaded).push(entry);
      }
    });
    page.on('requestfailed', (req) => failed.push({ type: req.resourceType(), url: new URL(req.url()).pathname, status: 'failed' }));
    page.on('pageerror', (err) => errors.push(String(err.message).slice(0, 160)));
    await page.goto(base + p.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const m = await page.evaluate(measure);
    await page.screenshot({ path: join(shotsOut, String(width), `${p.slug}.png`), fullPage: true });
    report[`${width} ${p.url}`] = { width, url: p.url, loaded, failed, errors, ...m };
    console.log(
      `${width} ${p.url.padEnd(34)} css=${m.stylesheets.filter((s) => s.rules).length} js=${loaded.filter((l) => l.type === 'script').length} failed=${failed.length} errors=${errors.length} h=${m.height} text=${m.bodyText} smallHit=${m.smallTargetCount} smallBox=${m.smallByBox}`,
    );
    await ctx.close();
  }
}
writeFileSync(join(jsonOut, 'prototypes.json'), `${JSON.stringify(report, null, 1)}\n`);
await browser.close();
