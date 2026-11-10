// Desktop 1440 before/after: counts pixels that differ between two capture labels (desk/*.png, full page).
// Usage: node evidence/website-mobile-20261110/tools/desk-diff.mjs <labelA> <labelB>  → writes desk-diff-<A>-<B>.json
// EVIDENCE_OUT=<dir> reads the captures from <dir>/<label>/desk/; the JSON is still written next to this tool's evidence.
import { createRequire } from 'node:module';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const sharpDir =
  process.env.SHARP_DIR ||
  '/Users/sandis/EXECUTIA/repositories/LIFE/WORKTREES/g3-fixes-20261110/node_modules/.pnpm/sharp@0.34.5/node_modules/sharp';
const sharp = createRequire(import.meta.url)(sharpDir);
const [a, b] = process.argv.slice(2);
if (!a || !b) throw new Error('usage: desk-diff.mjs <labelA> <labelB>');
const root = process.env.EVIDENCE_OUT || join(here, '..');
const dirA = join(root, a, 'desk');
const dirB = join(root, b, 'desk');

const raw = async (file) => sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const result = {};
for (const name of readdirSync(dirA).filter((f) => f.endsWith('.png')).sort()) {
  if (!existsSync(join(dirB, name))) continue;
  const [x, y] = await Promise.all([raw(join(dirA, name)), raw(join(dirB, name))]);
  if (x.info.width !== y.info.width || x.info.height !== y.info.height) {
    result[name] = { size: `${x.info.width}x${x.info.height} vs ${y.info.width}x${y.info.height}`, differing: null };
    continue;
  }
  let differing = 0;
  const box = { x0: Infinity, y0: Infinity, x1: -1, y1: -1 };
  for (let i = 0; i < x.data.length; i += 3) {
    if (x.data[i] === y.data[i] && x.data[i + 1] === y.data[i + 1] && x.data[i + 2] === y.data[i + 2]) continue;
    differing += 1;
    const p = i / 3;
    const px = p % x.info.width;
    const py = Math.floor(p / x.info.width);
    box.x0 = Math.min(box.x0, px);
    box.y0 = Math.min(box.y0, py);
    box.x1 = Math.max(box.x1, px);
    box.y1 = Math.max(box.y1, py);
  }
  result[name] = { size: `${x.info.width}x${x.info.height}`, differing, box: differing ? box : null };
}
writeFileSync(join(here, '..', `desk-diff-${a}-${b}.json`), JSON.stringify(result, null, 1));
for (const [name, r] of Object.entries(result)) {
  const where = r.box ? ` box=${r.box.x0},${r.box.y0}..${r.box.x1},${r.box.y1}` : '';
  console.log(`${name.padEnd(24)} ${r.size.padEnd(22)} differing=${r.differing}${where}`);
}
