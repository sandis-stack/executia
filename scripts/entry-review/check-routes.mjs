#!/usr/bin/env node
/**
 * Route / link smoke against ENTRY_URL (public preview or production).
 *
 * Usage:
 *   ENTRY_URL=https://... node scripts/entry-review/check-routes.mjs
 */
const base = (process.env.ENTRY_URL || 'http://127.0.0.1:4390/').replace(/\/?$/, '');

const ROUTES = [
  '/',
  '/entry',
  '/engine',
  '/one',
  '/pilot',
  '/request',
  '/contact',
  '/docs',
  '/assets/app.css',
  '/assets/entry-landing.css',
  '/assets/entry-landing.js',
  '/assets/platform-nav.js',
  '/assets/platform-brand.js',
];

async function check(path) {
  const url = base + path;
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'executia-entry-review/1.0' },
  });
  const finalUrl = res.url || url;
  const auth = /vercel\.com\/sso/i.test(finalUrl);
  return {
    path,
    status: res.status,
    ok: !auth && res.status >= 200 && res.status < 400,
    auth,
    finalUrl,
  };
}

async function main() {
  const results = [];
  for (const r of ROUTES) {
    results.push(await check(r));
  }
  const failed = results.filter((r) => !r.ok);
  console.log(JSON.stringify({ base, results, failed: failed.length }, null, 2));
  if (failed.length) {
    console.error('[check-routes] FAILED', failed);
    process.exit(1);
  }
  console.log('[check-routes] OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
