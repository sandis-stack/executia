import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

test('no Patent pending in public HTML, platform-brand.js, or llms.txt', () => {
  const htmlFiles = readdirSync(root).filter((f) => f.endsWith('.html'));
  for (const f of htmlFiles) {
    assert.equal(read(f).toLowerCase().includes('patent'), false, f);
  }
  assert.equal(read('assets/platform-brand.js').toLowerCase().includes('patent'), false);
  assert.equal(read('llms.txt').toLowerCase().includes('patent'), false);
});

test('footer tagline and founder LinkedIn label are visible in SSR HTML', () => {
  const index = read('index.html');
  assert.match(index, /EXECUTIA validates execution before it happens\./);
  assert.match(index, /Sandis Boiko · LinkedIn/);
  assert.doesNotMatch(index, />LinkedIn</);
});

test('engine labels the scenario as illustrative', () => {
  const engine = read('engine.html');
  assert.match(engine, /Illustrative example\. Not a customer case\./);
  assert.match(engine, /National Infrastructure Authority/);
});

test('global and institutional titles match claims-honesty rewrite', () => {
  const global = read('global.html');
  const institutional = read('institutional.html');
  assert.match(global, /<title>Cross-Border Execution Control — EXECUTIA®<\/title>/);
  assert.doesNotMatch(global, /Global Execution Standard/i);
  assert.match(institutional, /<title>Execution Control for Institutions — EXECUTIA®<\/title>/);
});
