/** BACKLOG-575 — F1–F5 public polish. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

test('F5 visible CTA is Request a pilot on nav + homepage hero', () => {
  assert.match(read('assets/platform-nav.js'), /Request a pilot/);
  assert.match(read('assets/homepage-hero.js'), /Request a pilot/);
  assert.match(read('assets/executive-journey.js'), /Request a pilot/);
  assert.match(read('index.html'), />Request a pilot</);
  assert.doesNotMatch(read('assets/platform-nav.js'), /Request Pilot</);
  assert.doesNotMatch(read('index.html'), /Request Pilot</);
});
