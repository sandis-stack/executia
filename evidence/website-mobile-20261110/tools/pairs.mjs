// Before | after pairs from audit.mjs captures, as compact JPEGs for the repo (full PNGs stay in scratch).
// Usage: node evidence/website-mobile-20261110/tools/pairs.mjs <beforeDir> <afterDir>
//   <dir>/<width>/<page>.png → compare/<width>/<page>.jpg ; plus compare/how-it-works-<width>.png (section crop, home only,
//   positioned from evidence/website-mobile-20261110/<basename(dir)>/audit-<width>.json).
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const sharpDir =
  process.env.SHARP_DIR ||
  '/Users/sandis/EXECUTIA/repositories/LIFE/WORKTREES/g3-fixes-20261110/node_modules/.pnpm/sharp@0.34.5/node_modules/sharp';
const sharp = createRequire(import.meta.url)(sharpDir);
const [beforeDir, afterDir] = process.argv.slice(2);
if (!beforeDir || !afterDir) throw new Error('usage: pairs.mjs <beforeDir> <afterDir>');
const out = join(here, '..', 'compare');
const GAP = 16;

async function pair(a, b, file, format) {
  const [x, y] = await Promise.all([sharp(a).png().toBuffer({ resolveWithObject: true }), sharp(b).png().toBuffer({ resolveWithObject: true })]);
  const width = x.info.width + GAP + y.info.width;
  const height = Math.max(x.info.height, y.info.height);
  const img = sharp({ create: { width, height, channels: 3, background: '#ff00ff' } }).composite([
    { input: x.data, left: 0, top: 0 },
    { input: y.data, left: x.info.width + GAP, top: 0 },
  ]);
  await (format === 'png' ? img.png() : img.jpeg({ quality: 72, mozjpeg: true })).toFile(file);
}

for (const width of readdirSync(afterDir).filter((d) => /^\d+$/.test(d))) {
  mkdirSync(join(out, width), { recursive: true });
  for (const name of readdirSync(join(afterDir, width)).filter((f) => f.endsWith('.png'))) {
    const before = join(beforeDir, width, name);
    if (!existsSync(before)) continue;
    await pair(before, join(afterDir, width, name), join(out, width, name.replace(/\.png$/, '.jpg')), 'jpg');
  }
}

// "How it works" on the home page, cropped from each capture at the section's own position (audit-<width>.json `how`),
// down to the engine bridge line below it.
const howOf = (dir, width) => {
  const file = join(here, '..', basename(dir), `audit-${width}.json`);
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8'))['/']?.how : null;
};
for (const width of ['320', '390', '768']) {
  const a = join(beforeDir, width, 'home.png');
  const b = join(afterDir, width, 'home.png');
  const howA = howOf(beforeDir, width);
  const howB = howOf(afterDir, width);
  if (!existsSync(a) || !existsSync(b) || !howA || !howB) continue;
  const crop = async (f, how) => {
    const meta = await sharp(f).metadata();
    const top = Math.max(0, how.top - 24);
    return sharp(f).extract({ left: 0, top, width: meta.width, height: Math.min(how.height + 220, meta.height - top) }).png().toBuffer();
  };
  await pair(await crop(a, howA), await crop(b, howB), join(out, `how-it-works-${width}.png`), 'png');
}
console.log('pairs written to', out);
