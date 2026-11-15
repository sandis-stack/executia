/**
 * TASK-37 A3: every sitemap URL must resolve to a local HTML (or known route) that exists.
 * Run: node --test tests/sitemap-urls.test.js
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sitemap = readFileSync(join(root, 'sitemap.xml'), 'utf8');
const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));

const locs = [...sitemap.matchAll(/<loc>(https:\/\/executia\.io[^<]*)<\/loc>/g)].map((m) => m[1]);

test('sitemap has no /1.0', () => {
  assert.equal((sitemap.match(/\/1\.0/g) || []).length, 0);
});

test('sitemap includes engine, pilot, one, cookies, gdpr, about', () => {
  for (const path of ['/engine', '/pilot', '/one', '/cookies', '/gdpr', '/about']) {
    assert.ok(locs.some((u) => u.endsWith(path) || u.endsWith(path + '/')), `missing ${path}`);
  }
});

test('every sitemap URL maps to an existing dest file or index', () => {
  assert.ok(locs.length >= 10, 'expected sitemap entries');
  for (const loc of locs) {
    const path = new URL(loc).pathname.replace(/\/$/, '') || '/';
    if (path === '/') {
      assert.ok(existsSync(join(root, 'index.html')), 'index.html');
      continue;
    }
    const route = vercel.routes.find((r) => r.dest && new RegExp(r.src).test(path));
    assert.ok(route, `no vercel route for ${path}`);
    const dest = route.dest.replace(/^\//, '');
    assert.ok(existsSync(join(root, dest)), `missing file ${dest} for ${path}`);
  }
});
