import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { routes } = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
const home = readFileSync(join(root, 'index.html'), 'utf8');

/** First matching route without a `has` condition, as Vercel applies `routes` in order. */
function firstRoute(pathname) {
  return routes.find((r) => !r.has && new RegExp(r.src).test(pathname));
}

const lifeHref = /<a data-nav="life" href="([^"]+)">LIFE<\/a>/.exec(home)?.[1];

test('home links LIFE to one destination', () => {
  assert.equal(lifeHref, 'https://life.executia.io');
});

for (const path of ['/life', '/life/', '/apps/life', '/apps/life/', '/apps/life/index.html']) {
  test(`${path} → 308 to the home LIFE destination`, () => {
    const r = firstRoute(path);
    assert.equal(r?.status, 308);
    assert.equal(r?.headers?.Location, lifeHref);
  });
}

for (const [path, dest] of [
  ['/life-proof', '/proofs/life-proof/index.html'],
  ['/invoice-proof', '/proofs/invoice-proof/index.html'],
]) {
  test(`${path} stays as it is`, () => {
    assert.equal(firstRoute(path)?.dest, dest);
  });
}

test('prototype assets are not redirected', () => {
  assert.equal(firstRoute('/apps/life/styles.css'), undefined);
});
