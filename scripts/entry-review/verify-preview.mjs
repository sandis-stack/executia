#!/usr/bin/env node
/**
 * Verify a preview URL is publicly accessible (HTTP 200, no Vercel SSO).
 *
 * Usage:
 *   node scripts/entry-review/verify-preview.mjs [url]
 *   ENTRY_URL=https://... node scripts/entry-review/verify-preview.mjs
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

async function resolveUrl() {
  if (process.argv[2]) return process.argv[2];
  if (process.env.ENTRY_URL) return process.env.ENTRY_URL;
  try {
    const t = await readFile(path.join(root, 'evidence/entry-review/latest/PREVIEW_URL.txt'), 'utf8');
    return t.trim();
  } catch {
    return null;
  }
}

async function probe(url) {
  const res = await fetch(url, {
    method: 'GET',
    redirect: 'manual',
    headers: { 'user-agent': 'executia-entry-review/1.0' },
  });
  const location = res.headers.get('location') || '';
  const setCookie = res.headers.get('set-cookie') || '';
  const auth =
    res.status === 401 ||
    res.status === 403 ||
    /vercel\.com\/sso|\/login|authentication/i.test(location) ||
    /_vercel_sso/i.test(setCookie);

  if (auth) {
    return { ok: false, status: res.status, location, reason: 'authentication_required' };
  }

  if (res.status >= 300 && res.status < 400 && location) {
    const next = await fetch(new URL(location, url).href, { redirect: 'follow' });
    return {
      ok: next.status === 200,
      status: next.status,
      location,
      reason: next.status === 200 ? 'ok' : 'non_200_after_redirect',
      bodySnippet: (await next.text()).slice(0, 120),
    };
  }

  const text = await res.text();
  return {
    ok: res.status === 200 && /data-page="entry"|One Execution Standard|after a decision/i.test(text),
    status: res.status,
    location,
    reason: res.status === 200 ? 'ok' : 'non_200',
    bodySnippet: text.slice(0, 120),
  };
}

async function main() {
  const url = await resolveUrl();
  if (!url) {
    console.error('[verify-preview] No URL provided');
    process.exit(1);
  }
  const result = await probe(url.replace(/\/?$/, '/'));
  console.log(JSON.stringify({ url, ...result }, null, 2));
  if (!result.ok) {
    console.error('[verify-preview] FAILED — URL is not publicly reviewable without authentication.');
    process.exit(1);
  }
  console.log('[verify-preview] PUBLIC OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
