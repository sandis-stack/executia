#!/usr/bin/env node
/**
 * Publish ENTRY to public review project (no SSO on production alias).
 *
 * Preferred public URL: https://executia-entry-review.vercel.app
 *
 * Usage:
 *   node scripts/entry-review/publish-preview.mjs
 */
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const project = process.env.ENTRY_REVIEW_PROJECT || 'executia-entry-review';
const scope = process.env.ENTRY_REVIEW_SCOPE || 'executia';
const ALIAS = process.env.ENTRY_REVIEW_ALIAS || `https://${project}.vercel.app`;

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: root,
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

async function isPublic(url) {
  const res = await fetch(url, {
    method: 'GET',
    redirect: 'manual',
    headers: { 'user-agent': 'executia-entry-review/1.0' },
  });
  const location = res.headers.get('location') || '';
  const setCookie = res.headers.get('set-cookie') || '';
  const sso =
    res.status === 401 ||
    res.status === 403 ||
    /vercel\.com\/sso|authentication|login/i.test(location) ||
    /_vercel_sso/i.test(setCookie);
  if (sso) return { ok: false, status: res.status, location, reason: 'authentication_required' };

  if (res.status >= 300 && res.status < 400 && location) {
    const next = await fetch(new URL(location, url).href, { redirect: 'follow' });
    const text = await next.text();
    return {
      ok: next.status === 200 && /data-page="entry"|after a decision/i.test(text),
      status: next.status,
      reason: next.status === 200 ? 'ok' : 'non_200',
    };
  }

  const text = await res.text();
  return {
    ok: res.status === 200 && /data-page="entry"|after a decision|EXECUTIA/i.test(text),
    status: res.status,
    reason: res.status === 200 ? 'ok' : 'non_200',
  };
}

function extractUrls(text) {
  const urls = [...text.matchAll(/https:\/\/[a-z0-9.-]+\.vercel\.app/gi)].map((m) => m[0]);
  return [...new Set(urls)];
}

async function publishSurge() {
  const domain = process.env.ENTRY_SURGE_DOMAIN || `executia-entry-review.surge.sh`;
  const result = await run('npx', ['--yes', 'surge', '.', domain]);
  const url = `https://${domain}`;
  return { url, code: result.code, raw: result.out + result.err };
}

async function main() {
  const outDir = path.join(root, 'evidence/entry-review/latest');
  await mkdir(outDir, { recursive: true });

  await run('npx', ['vercel', 'link', '--yes', '--project', project, '--scope', scope]);
  // Production deploy on the dedicated review project → stable public alias
  const deploy = await run('npx', [
    'vercel',
    'deploy',
    '--yes',
    '--prod',
    '--name',
    project,
    '--scope',
    scope,
  ]);
  const found = extractUrls(deploy.out + '\n' + deploy.err);
  const candidates = [ALIAS, ...found.filter((u) => !/-[\w]+\.vercel\.app$/i.test(u) || u.includes(project))];

  let chosen = null;
  let probe = null;
  for (const url of candidates) {
    probe = await isPublic(url.replace(/\/?$/, '/'));
    if (probe.ok) {
      chosen = url.replace(/\/?$/, '');
      break;
    }
  }

  if (!chosen) {
    console.warn('[publish-preview] Vercel candidates not public. Falling back to Surge.');
    const surge = await publishSurge();
    probe = await isPublic(surge.url.replace(/\/?$/, '/'));
    if (probe.ok) chosen = surge.url.replace(/\/?$/, '');
  }

  const report = {
    publishedAt: new Date().toISOString(),
    url: chosen,
    public: probe,
    project,
    scope,
    candidates,
  };
  await writeFile(path.join(outDir, 'preview.json'), JSON.stringify(report, null, 2));
  await writeFile(path.join(outDir, 'PREVIEW_URL.txt'), (chosen || '') + '\n');

  if (!chosen || !probe?.ok) {
    console.error('[publish-preview] FAILED — no publicly accessible preview without authentication.');
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  console.log(`[publish-preview] PUBLIC OK ${chosen} (HTTP ${probe.status})`);
  process.stdout.write(chosen + '\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
