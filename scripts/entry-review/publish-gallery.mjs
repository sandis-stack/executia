#!/usr/bin/env node
/**
 * Publish ENTRY review screenshots to a public gallery URL (no auth).
 *
 * Preferred: https://executia-entry-review-gallery.vercel.app
 * Fallback: Surge
 *
 * A review is incomplete until this URL returns HTTP 200 without login
 * and serves the PNG assets.
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile, cp, rm, readdir, access, readFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const latest = path.join(root, 'evidence/entry-review/latest');
const shotsDir = path.join(latest, 'screenshots');
const staging = path.join(root, '.tmp-entry-review-gallery');
const project = process.env.ENTRY_GALLERY_PROJECT || 'executia-entry-review-gallery';
const scope = process.env.ENTRY_REVIEW_SCOPE || 'executia';
const ALIAS = process.env.ENTRY_GALLERY_ALIAS || `https://${project}.vercel.app`;
const SURGE_DOMAIN = process.env.ENTRY_GALLERY_SURGE || 'executia-entry-review-gallery.surge.sh';

function run(cmd, args, cwd = root) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => {
      out += d;
      process.stdout.write(d);
    });
    child.stderr.on('data', (d) => {
      err += d;
      process.stderr.write(d);
    });
    child.on('error', reject);
    child.on('exit', (code) => resolve({ code: code ?? 1, out, err }));
  });
}

function gitShort() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim();
  } catch {
    return 'unknown';
  }
}

function assertRequiredCommit(short) {
  const required = (process.env.ENTRY_REQUIRE_COMMIT || '').trim();
  if (!required) return;
  const full = execSync('git rev-parse HEAD', { cwd: root }).toString().trim();
  const ok = short === required || full.startsWith(required) || required.startsWith(short);
  if (!ok) {
    throw new Error(`ENTRY_REQUIRE_COMMIT=${required} but HEAD is ${short}`);
  }
}

const CANONICAL = new Set([
  'full-desktop-1440x1000.png',
  'full-tablet-1024x900.png',
  'full-mobile-390x844.png',
  'mobile-nav-open.png',
  'sections/hero.png',
  'sections/platform.png',
  'sections/products.png',
  'sections/engine.png',
  'sections/vision.png',
  'sections/pilot.png',
]);

async function listPngs(dir, prefix = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isDirectory()) {
      files.push(...(await listPngs(path.join(dir, e.name), rel)));
    } else if (e.name.endsWith('.png')) {
      const norm = rel.replace(/\\/g, '/');
      if (CANONICAL.has(norm)) files.push(norm);
    }
  }
  return files.sort((a, b) => {
    const ai = [...CANONICAL].indexOf(a);
    const bi = [...CANONICAL].indexOf(b);
    return ai - bi;
  });
}

function galleryHtml({ previewUrl, commit, images, generatedAt }) {
  const cards = images
    .map((rel) => {
      const title = rel.replace(/^sections\//, 'section · ').replace(/\.png$/, '');
      return `<figure class="card">
  <figcaption>${escapeHtml(title)}</figcaption>
  <a href="${escapeHtml(rel)}" target="_blank" rel="noopener noreferrer">
    <img src="${escapeHtml(rel)}" alt="${escapeHtml(title)}" loading="lazy" />
  </a>
</figure>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>EXECUTIA ENTRY — Visual Review Gallery</title>
  <meta name="robots" content="noindex" />
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; font-family: "Source Sans 3", system-ui, sans-serif; background: #0c1220; color: #eef3fa; }
    header { padding: 28px 24px 12px; border-bottom: 1px solid rgba(200,214,232,.12); }
    h1 { margin: 0 0 8px; font-size: 1.35rem; font-weight: 600; letter-spacing: -0.02em; }
    .meta { color: #a4b4c8; font-size: 14px; line-height: 1.5; }
    .meta a { color: #c9d7ea; }
    main { padding: 24px; display: grid; gap: 28px; grid-template-columns: 1fr; max-width: 1200px; margin: 0 auto; }
    .card { margin: 0; background: #131b2c; border: 1px solid rgba(200,214,232,.12); border-radius: 12px; overflow: hidden; }
    figcaption { padding: 12px 14px; font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase; color: #a4b4c8; border-bottom: 1px solid rgba(200,214,232,.08); }
    img { display: block; width: 100%; height: auto; background: #0a0f18; }
    a { color: inherit; text-decoration: none; }
  </style>
</head>
<body>
  <header>
    <h1>EXECUTIA ENTRY — Visual Review Gallery</h1>
    <p class="meta">
      Generated: ${escapeHtml(generatedAt)}<br />
      Commit: <code>${escapeHtml(commit)}</code><br />
      Preview: <a href="${escapeHtml(previewUrl)}">${escapeHtml(previewUrl)}</a>
    </p>
  </header>
  <main>
${cards}
  </main>
</body>
</html>
`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function isPublicHtml(url) {
  const res = await fetch(url, {
    method: 'GET',
    redirect: 'manual',
    headers: { 'user-agent': 'executia-entry-review-gallery/1.0' },
  });
  const location = res.headers.get('location') || '';
  const setCookie = res.headers.get('set-cookie') || '';
  const sso =
    res.status === 401 ||
    res.status === 403 ||
    /vercel\.com\/sso|authentication|login/i.test(location) ||
    /_vercel_sso/i.test(setCookie);
  if (sso) return { ok: false, status: res.status, reason: 'authentication_required', location };

  let final = res;
  if (res.status >= 300 && res.status < 400 && location) {
    final = await fetch(new URL(location, url).href, { redirect: 'follow' });
  }
  const text = await final.text();
  const ok = final.status === 200 && /Visual Review Gallery/i.test(text);
  return { ok, status: final.status, reason: ok ? 'ok' : 'non_200_or_unexpected' };
}

async function isPublicPng(url) {
  const res = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    headers: { 'user-agent': 'executia-entry-review-gallery/1.0' },
  });
  const location = res.url || '';
  const sso = res.status === 401 || res.status === 403 || /vercel\.com\/sso|authentication/i.test(location);
  if (sso) return { ok: false, status: res.status, reason: 'authentication_required' };
  const ct = res.headers.get('content-type') || '';
  const buf = Buffer.from(await res.arrayBuffer());
  const isPng = buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const ok = res.status === 200 && (isPng || /image\/png/i.test(ct));
  return { ok, status: res.status, reason: ok ? 'ok' : 'not_png', bytes: buf.length };
}

function extractUrls(text) {
  return [...new Set([...text.matchAll(/https:\/\/[a-z0-9.-]+\.vercel\.app/gi)].map((m) => m[0]))];
}

async function buildStaging(previewUrl) {
  await rm(staging, { recursive: true, force: true });
  await mkdir(path.join(staging, 'sections'), { recursive: true });
  await access(shotsDir);

  for (const rel of CANONICAL) {
    const src = path.join(shotsDir, rel);
    const dest = path.join(staging, rel);
    try {
      await access(src);
      await mkdir(path.dirname(dest), { recursive: true });
      await copyFile(src, dest);
    } catch {
      // missing file checked below
    }
  }

  const images = await listPngs(staging);
  if (images.length < CANONICAL.size) {
    const missing = [...CANONICAL].filter((f) => !images.includes(f));
    throw new Error(`Missing canonical screenshots for gallery: ${missing.join(', ')}`);
  }

  const generatedAt = new Date().toISOString();
  const commit = gitShort();
  assertRequiredCommit(commit);
  const html = galleryHtml({ previewUrl, commit, images, generatedAt });
  await writeFile(path.join(staging, 'index.html'), html);
  await writeFile(
    path.join(staging, 'vercel.json'),
    JSON.stringify({ version: 2, cleanUrls: true, trailingSlash: false }, null, 2)
  );
  return { images, generatedAt, commit };
}

async function publishVercel() {
  await run('npx', ['vercel', 'link', '--yes', '--project', project, '--scope', scope], staging);
  const deploy = await run(
    'npx',
    ['vercel', 'deploy', '--yes', '--prod', '--name', project, '--scope', scope],
    staging
  );
  const found = extractUrls(deploy.out + '\n' + deploy.err);
  return { code: deploy.code, candidates: [ALIAS, ...found] };
}

async function publishSurge() {
  const result = await run('npx', ['--yes', 'surge', staging, SURGE_DOMAIN]);
  return { code: result.code, url: `https://${SURGE_DOMAIN}` };
}

async function main() {
  let previewUrl = process.env.ENTRY_URL || '';
  if (!previewUrl) {
    try {
      previewUrl = (await readFile(path.join(latest, 'PREVIEW_URL.txt'), 'utf8')).trim();
    } catch {
      previewUrl = 'https://executia-entry-review.vercel.app';
    }
  }

  const built = await buildStaging(previewUrl.replace(/\/?$/, ''));

  let chosen = null;
  let probe = null;
  const vercel = await publishVercel();
  for (const url of vercel.candidates) {
    const base = url.replace(/\/?$/, '');
    probe = await isPublicHtml(base + '/');
    if (!probe.ok) continue;
    const pngProbe = await isPublicPng(`${base}/${built.images[0]}`);
    if (pngProbe.ok) {
      chosen = base;
      probe = { ...probe, png: pngProbe };
      break;
    }
  }

  if (!chosen) {
    console.warn('[publish-gallery] Vercel gallery not public. Falling back to Surge.');
    const surge = await publishSurge();
    const base = surge.url.replace(/\/?$/, '');
    probe = await isPublicHtml(base + '/');
    if (probe.ok) {
      const pngProbe = await isPublicPng(`${base}/${built.images[0]}`);
      if (pngProbe.ok) {
        chosen = base;
        probe = { ...probe, png: pngProbe };
      }
    }
  }

  if (!chosen || !probe?.ok) {
    console.error('[publish-gallery] FAILED — screenshots are not publicly reviewable.');
    process.exit(1);
  }

  const publicImages = built.images.map((rel) => `${chosen}/${rel}`);
  const payload = {
    publishedAt: built.generatedAt,
    url: chosen,
    indexUrl: `${chosen}/`,
    commit: built.commit,
    previewUrl: previewUrl.replace(/\/?$/, ''),
    images: publicImages,
    public: probe,
  };

  await writeFile(path.join(latest, 'gallery.json'), JSON.stringify(payload, null, 2));
  await writeFile(path.join(latest, 'GALLERY_URL.txt'), chosen + '\n');

  // Keep a local mirror of the published index for archives (not for external review)
  await writeFile(path.join(latest, 'screenshots', 'index.html'), await readFile(path.join(staging, 'index.html'), 'utf8'));

  console.log(`[publish-gallery] PUBLIC OK ${chosen}`);
  for (const img of publicImages) console.log(`  ${img}`);
  process.stdout.write(chosen + '\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
