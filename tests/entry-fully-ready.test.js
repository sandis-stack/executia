/**
 * ENTRY fully-ready acceptance — ideal institutional ENTRY merge.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

async function load(rel) {
  const p = path.join(root, rel);
  await access(p);
  return readFile(p, 'utf8');
}

test('ENTRY uses institutional architecture section order', async () => {
  const html = await load('index.html');
  assert.equal(html.includes('executia-website.css'), false, 'must not load WEB-001 parallel stylesheet');
  assert.equal(html.includes('id="demo"'), false, 'must not ship WEB-001 live-demo section as Entry');
  assert.ok(html.includes('entry-v1.css'), 'ENTRY visual language required');
  assert.equal(html.includes('homepage-migrated.css'), false, 'old homepage composition CSS must not load');
  assert.ok(html.includes('data-page="entry"'));
  assert.equal(html.includes('hp-hero'), false, 'old film hero composition must not ship');
  assert.equal(html.includes('hero-story-film'), false, 'hero film backdrop must not ship');
  assert.equal(html.includes('story-film-player'), false, 'unfinished film placeholders must not ship');

  const order = [
    'hero',
    'architecture',
    'problem',
    'trust',
    'use-cases',
    'comparison',
    'execution-value',
    'pilot',
  ];
  let last = -1;
  for (const id of order) {
    const i = html.indexOf(`id="${id}"`);
    assert.ok(i >= 0, `missing section #${id}`);
    assert.ok(i > last, `section #${id} out of order`);
    last = i;
  }

  assert.ok(html.includes('How EXECUTIA works'), 'architecture heading missing');
  assert.ok(html.includes('Every organization loses value through poor execution'), 'problem heading missing');
  assert.ok(
    html.includes('How much is invisible execution costing your organization?'),
    'problem hook missing'
  );
  assert.ok(html.includes('data-protocol-video'), 'protocol engine shell missing');
  assert.ok(
    html.includes('INSTITUTIONAL GOVERNANCE &amp; STANDARDS') ||
      html.includes('INSTITUTIONAL GOVERNANCE & STANDARDS'),
    'governance section title missing'
  );
  assert.ok(/Government/i.test(html), 'Government sector missing');
  assert.ok(/Infrastructure/i.test(html), 'Infrastructure sector missing');
  assert.ok(/Energy/i.test(html), 'Energy sector missing');
  assert.ok(/Finance/i.test(html), 'Finance sector missing');
  assert.ok(/Enterprise/i.test(html), 'Enterprise sector missing');
  assert.ok(html.includes('execution-value-calculator'), 'calculator missing');
  assert.ok(html.includes('hp-compare-table'), 'comparison table missing');
  assert.ok(html.includes('hp-pilot-path'), 'pilot path missing');
});

test('ENTRY declares Engine path and avoids overclaim language', async () => {
  const html = await load('index.html');
  assert.ok(html.includes('href="/engine"'), 'Engine proof path missing');
  assert.ok(
    html.includes('Review the Engine') || html.includes('Review the EXECUTIA Engine'),
    'Engine review path missing'
  );
  assert.ok(html.includes('Request Pilot'), 'Request Pilot CTA required');
  assert.ok(html.includes('/request'), 'Request Pilot must target /request');
  assert.equal(html.includes('Sign up'), false, 'SaaS signup language must not ship');
  assert.equal(/let'?s test/i.test(html), false, 'casual startup pilot language must not ship');
  assert.equal(html.includes("world's first") || html.includes('world’s first'), false);
  assert.equal(html.includes('industry-leading'), false);
  assert.equal(html.includes('revolutionary'), false);
  assert.equal(html.includes('/sign-in'), false);
  assert.equal(/\.(mp4|webm)(["'\s>])/i.test(html), false, 'do not invent final video assets in markup');
  assert.equal(html.includes('Development Cell'), false, 'Development Cell must not surface on ENTRY');
});

test('ENTRY navigation is ENTRY ENGINE PILOT LIFE ONE GOV with Request Pilot', async () => {
  const html = await load('index.html');
  assert.ok(html.includes('EXECUTIA™'), 'trademark branding required');
  const navMatch = html.match(/<nav class="ev-nav"[\s\S]*?<\/nav>/);
  assert.ok(navMatch, 'primary nav missing');
  const nav = navMatch[0];
  const labels = [...nav.matchAll(/>(ENTRY|ENGINE|PILOT|LIFE|ONE|GOV)</g)].map((m) => m[1]);
  assert.deepEqual(
    labels,
    ['ENTRY', 'ENGINE', 'PILOT', 'LIFE', 'ONE', 'GOV'],
    'nav order must be ENTRY ENGINE PILOT LIFE ONE GOV'
  );
  assert.ok(nav.includes('aria-current="page"'), 'ENTRY active state required');
  assert.ok(html.includes('href="/engine"'), 'ENGINE nav required');
  assert.ok(html.includes('href="/pilot"'), 'PILOT nav required');
  assert.ok(html.includes('life.executia.io') || html.includes('href="#life"'), 'LIFE nav required');
  assert.ok(html.includes('href="/one"'), 'ONE nav required');
  assert.ok(html.includes('GOV'), 'GOV nav required');
  assert.ok(html.includes('Request Pilot'), 'Request Pilot CTA required');
  assert.ok(html.includes('class="ev-cta-pilot"'), 'light Request Pilot pill required');
});

test('ENTRY accessibility: skip-link, main landmark, reduced motion', async () => {
  const html = await load('index.html');
  assert.ok(html.includes('lang="en"'));
  assert.ok(html.includes('class="skip-link"'), 'skip-link missing');
  assert.ok(html.includes('href="#main"'), 'skip-link must target #main');
  assert.ok(/<main[^>]*\bid="main"/.test(html) || html.includes('id="main"'), 'main landmark id missing');
  assert.ok(html.includes('name="viewport"'));

  const appCss = await load('assets/app.css');
  const entryCss = await load('assets/entry-v1.css');
  assert.ok(
    appCss.includes('.skip-link') || entryCss.includes('.skip-link') || html.includes('class="skip-link"'),
    'skip-link missing'
  );
  assert.ok(
    appCss.includes('@media (max-width:860px)') || entryCss.includes('@media (max-width'),
    'mobile breakpoint missing'
  );
  assert.ok(entryCss.includes('prefers-reduced-motion'), 'reduced-motion support missing');
  assert.ok(
    entryCss.includes('#0F1E2B') || entryCss.includes('#0A131C'),
    'institutional slate palette missing'
  );
  assert.ok(
    entryCss.includes('min-height: 420px') || entryCss.includes('height: 420px'),
    'protocol shell fixed height missing'
  );
});

test('ENTRY routes / and /entry map to index.html', async () => {
  const vercel = await load('vercel.json');
  assert.ok(vercel.includes('"/index.html"') || vercel.includes('/index.html'));
  assert.ok(/"src":\s*"\^\/\$"/.test(vercel) || vercel.includes('"^/$"'));
  assert.ok(vercel.includes('^/entry$'));
});

test('WEB-001 build must not overwrite production ENTRY index.html', async () => {
  const build = await load('packages/executia-website/scripts/build.mjs');
  assert.equal(
    /writeFile\(\s*path\.join\(\s*repoRoot,\s*'index\.html'/.test(build),
    false,
    'build.mjs must not publish WEB-001 over production root index.html'
  );
});

test('Protocol shell JS forces SVG when branded MP4 is absent', async () => {
  const js = await load('assets/entry-v1.js');
  assert.ok(js.includes("/videos/executia-briefing.mp4"), 'branded VIDEO_SRC path missing');
  assert.ok(js.includes('buildProtocolVisual'), 'SVG protocol visual builder missing');
  assert.ok(
    js.includes('EXECUTION ENGINE INITIALIZED') || js.includes('AWAITING ASSET OVERLAY'),
    'SVG status overlay missing'
  );
  assert.ok(js.includes('showEngineVisual'), 'engine visual mount missing');
});
