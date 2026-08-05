/**
 * ENTRY fully-ready acceptance — blank-page ENTRY v1.0 (vertical thesis).
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

test('ENTRY v1 uses new vertical thesis section order', async () => {
  const html = await load('index.html');
  assert.equal(html.includes('executia-website.css'), false, 'must not load WEB-001 parallel stylesheet');
  assert.equal(html.includes('id="demo"'), false, 'must not ship WEB-001 live-demo section as Entry');
  assert.ok(html.includes('entry-v1.css'), 'new ENTRY visual language required');
  assert.equal(html.includes('homepage-migrated.css'), false, 'old homepage composition CSS must not load');
  assert.ok(html.includes('data-page="entry"'));
  assert.equal(html.includes('hp-hero'), false, 'old Hero composition must not ship');
  assert.equal(html.includes('hp-funnel-journey'), false, 'old journey card must not ship');
  assert.equal(html.includes('hero-story-film'), false, 'hero film backdrop must not ship');
  assert.ok(html.includes('story-film-player'), 'one purposeful mid-page film required');

  const order = [
    'reality',
    'truth-statement',
    'problem',
    'cost',
    'thinking',
    'executia',
    'model',
    'engine',
    'applications',
    'vision',
    'pilot',
  ];
  let last = -1;
  for (const id of order) {
    const i = html.indexOf(`id="${id}"`);
    assert.ok(i >= 0, `missing section #${id}`);
    assert.ok(i > last, `section #${id} out of order`);
    last = i;
  }

  assert.ok(html.includes('id="life"'), 'LIFE domain anchor missing');
  assert.ok(html.includes('id="one"'), 'ONE domain anchor missing');
  assert.ok(html.includes('id="gov"'), 'GOV domain anchor missing');
});

test('ENTRY v1 declares approved thesis and Engine path', async () => {
  const html = await load('index.html');
  assert.ok(
    html.includes('Ideas Create Possibilities. Execution Creates Reality.') ||
      html.includes('Ideas create possibilities'),
    'approved thesis missing'
  );
  assert.ok(/people, organizations/i.test(html), 'people audience missing');
  assert.ok(/Organizations/i.test(html), 'organizations audience missing');
  assert.ok(/Governments/i.test(html), 'governments audience missing');
  assert.ok(
    html.includes('Review the EXECUTIA Engine') || html.includes('Review the Engine'),
    'Engine review path missing'
  );
  assert.ok(html.includes('href="/engine"'), 'Engine proof path missing');
  assert.ok(html.includes('LIFE'), 'LIFE product missing');
  assert.ok(html.includes('ONE'), 'ONE product missing');
  assert.ok(html.includes('GOV'), 'GOV product missing');
  assert.ok(html.includes('Available for review'), 'LIFE maturity signal missing');
  assert.ok(html.includes('In development'), 'ONE maturity signal missing');
  assert.ok(html.includes('Long-term vision'), 'GOV maturity signal missing');
  assert.ok(html.includes('id="engine"'), 'Engine section missing');
  assert.ok(/better execution|after a decision|Execution creates reality/i.test(html), 'central execution idea missing');
  assert.ok(/creat|learn|collaborat|liv/i.test(html), 'Vision human frame missing');
  assert.ok(
    /under development|in development|being built|working toward|validat|Available for review/i.test(html),
    'building language missing'
  );
  assert.equal(html.includes('Sign up'), false, 'SaaS signup language must not ship');
  assert.equal(/let'?s test/i.test(html), false, 'casual startup pilot language must not ship');
  assert.equal(html.includes('world’s first') || html.includes("world's first"), false);
  assert.equal(html.includes('industry-leading'), false);
  assert.equal(html.includes('revolutionary'), false);
  assert.equal(html.includes('/sign-in'), false);
  assert.equal(/\.(mp4|webm)(["'\s>])/i.test(html), false, 'do not invent final video assets in markup');
});

test('ENTRY navigation has Request Pilot and institutional links', async () => {
  const html = await load('index.html');
  assert.ok(html.includes('Request Pilot') || html.includes('[ Request Pilot ]'), 'Request Pilot CTA required');
  assert.ok(html.includes('/request'), 'Request Pilot must target /request');
  assert.ok(html.includes('Standard'), 'Standard nav required');
  assert.ok(html.includes('Expressions'), 'Expressions nav required');
  assert.ok(html.includes('Development Cell'), 'Development Cell nav required');
  assert.ok(html.includes('Institutional'), 'Institutional nav required');
  assert.ok(html.includes('href="/engine"'), 'Engine route required');
  assert.ok(html.includes('id="development-cell"'), 'Development Cell anchor required');
  assert.equal(html.includes('/sign-in'), false, 'broken /sign-in must not ship');

  const nav = await load('assets/platform-nav.js');
  assert.ok(nav.includes('Request Pilot'), 'shared shell Request Pilot required');
  assert.ok(nav.includes('/request'), 'shared shell /request required');
  assert.equal(nav.includes('/sign-in'), false, 'broken /sign-in must not ship');
  assert.equal(nav.includes('Sign in'), false, 'Sign in link 404s on production');
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
    appCss.includes('.skip-link') ||
      entryCss.includes('.skip-link') ||
      html.includes('class="skip-link"'),
    'skip-link missing'
  );
  assert.ok(
    appCss.includes('@media (max-width:860px)') || entryCss.includes('@media (max-width'),
    'mobile breakpoint missing'
  );
  assert.ok(entryCss.includes('prefers-reduced-motion'), 'reduced-motion support missing');
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
