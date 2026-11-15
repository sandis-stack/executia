import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = readFileSync(join(root, 'assets/app.css'), 'utf8');
const ej = readFileSync(join(root, 'assets/executive-journey.css'), 'utf8');

test('home radius tokens are defined once in app.css', () => {
  assert.match(app, /--radius-card:\s*12px/);
  assert.match(app, /--radius-control:\s*12px/);
  assert.match(app, /--radius-pill:\s*999px/);
  assert.match(app, /--radius:\s*var\(--radius-card\)/);
});

test('engine journey boxes use the home radius tokens', () => {
  assert.match(ej, /border-radius:\s*var\(--radius-card/);
  assert.match(ej, /\.ej-decision\s*\{[^}]*border-radius:\s*var\(--radius-control/s);
  assert.match(ej, /\.ej-validation-frame/);
});

test('vercelignore keeps evidence out of Git builds', () => {
  const ignore = readFileSync(join(root, '.vercelignore'), 'utf8');
  assert.match(ignore, /^evidence\/$/m);
  assert.match(ignore, /^\*\.md$/m);
});
