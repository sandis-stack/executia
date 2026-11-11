// TASK-21b proof of "no visual change", from prototypes.mjs captures.
// Usage: node evidence/website-21b-20261111/tools/compare.mjs <beforeDir> <afterDir>
// Pixel diff, per width and page: after at the routed URL (/life, /life/, …) and at the file URL against before at the
// file URL (the only place the page rendered before). Writes evidence/website-21b-20261111/compare/pixel-diff.json and,
// as compact JPEGs, compare/<width>/<page>.jpg = before at the routed URL | after at the routed URL.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const sharpDir =
  process.env.SHARP_DIR ||
  '/Users/sandis/EXECUTIA/repositories/LIFE/WORKTREES/g3-fixes-20261110/node_modules/.pnpm/sharp@0.34.5/node_modules/sharp';
const sharp = createRequire(import.meta.url)(sharpDir);
const [beforeDir, afterDir] = process.argv.slice(2);
if (!beforeDir || !afterDir) throw new Error('usage: compare.mjs <beforeDir> <afterDir>');
const out = join(here, '..', 'compare');
const WIDTHS = [320, 390, 768, 1440];
const PAGES = ['life', 'life-proof', 'invoice-proof'];
const GAP = 16;

async function raw(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, info };
}

async function diff(a, b) {
  const [x, y] = await Promise.all([raw(a), raw(b)]);
  if (x.info.width !== y.info.width || x.info.height !== y.info.height) {
    return { same: false, size: [`${x.info.width}×${x.info.height}`, `${y.info.width}×${y.info.height}`] };
  }
  let pixels = 0;
  for (let i = 0; i < x.data.length; i += 4) {
    if (x.data[i] !== y.data[i] || x.data[i + 1] !== y.data[i + 1] || x.data[i + 2] !== y.data[i + 2] || x.data[i + 3] !== y.data[i + 3]) pixels += 1;
  }
  return { same: pixels === 0, size: `${x.info.width}×${x.info.height}`, differentPixels: pixels };
}

async function pair(a, b, file) {
  const [x, y] = await Promise.all([sharp(a).png().toBuffer({ resolveWithObject: true }), sharp(b).png().toBuffer({ resolveWithObject: true })]);
  const width = x.info.width + GAP + y.info.width;
  const height = Math.max(x.info.height, y.info.height);
  await sharp({ create: { width, height, channels: 3, background: '#ff00ff' } })
    .composite([
      { input: x.data, left: 0, top: 0 },
      { input: y.data, left: x.info.width + GAP, top: 0 },
    ])
    .jpeg({ quality: 72, mozjpeg: true })
    .toFile(file);
}

const result = {};
for (const w of WIDTHS) {
  mkdirSync(join(out, String(w)), { recursive: true });
  for (const p of PAGES) {
    const beforeFile = join(beforeDir, String(w), `${p}_file.png`);
    result[`${w} ${p}`] = {
      routedAfterVsFileBefore: await diff(join(afterDir, String(w), `${p}.png`), beforeFile),
      routedSlashAfterVsFileBefore: await diff(join(afterDir, String(w), `${p}_slash.png`), beforeFile),
      fileAfterVsFileBefore: await diff(join(afterDir, String(w), `${p}_file.png`), beforeFile),
    };
    await pair(join(beforeDir, String(w), `${p}.png`), join(afterDir, String(w), `${p}.png`), join(out, String(w), `${p}.jpg`));
    const r = result[`${w} ${p}`];
    console.log(
      `${w} ${p.padEnd(14)} routed=${r.routedAfterVsFileBefore.differentPixels ?? r.routedAfterVsFileBefore.size} slash=${r.routedSlashAfterVsFileBefore.differentPixels ?? r.routedSlashAfterVsFileBefore.size} file=${r.fileAfterVsFileBefore.differentPixels ?? r.fileAfterVsFileBefore.size}`,
    );
  }
}
writeFileSync(join(out, 'pixel-diff.json'), `${JSON.stringify(result, null, 1)}\n`);
