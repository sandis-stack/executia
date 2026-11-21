/** BACKLOG-576 — N1–N2 nits after #575. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

function walkServed(dir, acc = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    if (name.name === 'node_modules' || name.name === 'drafts' || name.name.startsWith('.')) continue;
    if (name.name === 'index.legacy.html') continue;
    const p = join(dir, name.name);
    if (name.isDirectory()) walkServed(p, acc);
    else if (/\.(html|js)$/.test(name.name) || dir.endsWith('/api') || dir.includes('/api/')) acc.push(p);
  }
  return acc;
}

test('N1 proof journey CTA is Request a pilot (no Institutional / Request Pilot)', () => {
  const ej = read('assets/executive-journey.js');
  assert.match(ej, /proof:\s*\{\s*label:\s*'Request a pilot'/);
  assert.doesNotMatch(ej, /Request Institutional Pilot/);
  const served = walkServed(root).filter((p) => /\/(assets|api)\//.test(p) || p.endsWith('.html'));
  for (const file of served) {
    const text = readFileSync(file, 'utf8');
    // drafts/ and index.legacy.html excluded by walk
    assert.doesNotMatch(text, /Request Institutional Pilot/, file);
    assert.doesNotMatch(text, /Request Pilot(?! a)/, file);
  }
});

test('N2 film slot is a real hidden element until data-film-src is set', () => {
  const html = read('pilot.html');
  assert.match(html, /<section class="section soft pf-film"[^>]*data-film-src=""[^>]*hidden/);
  assert.doesNotMatch(html, /<!--\s*<section class="section soft pf-film"/);
  assert.match(html, /<video controls playsinline preload="metadata">/);
  assert.match(html, /<track kind="captions"[^>]*default/);
  assert.match(html, /pilot-film-slot\.js/);
  assert.doesNotMatch(html, /pf-film-placeholder/);
  const js = read('assets/pilot-film-slot.js');
  assert.match(js, /data-film-src/);
  assert.match(js, /section\.hidden\s*=\s*false/);
  assert.match(js, /removeAttribute\('autoplay'\)/);
});
