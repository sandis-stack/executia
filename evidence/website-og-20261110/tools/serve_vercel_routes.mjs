// Minimal local server for the static site: applies vercel.json "routes" (dest + redirects), then serves files.
// Usage: node serve_vercel_routes.mjs [port]   (run from the repo root)
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const root = process.cwd();
const port = Number(process.argv[2] || 4320);
const routes = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8')).routes;
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.xml': 'application/xml', '.pdf': 'application/pdf',
};

function resolve(pathname) {
  for (const r of routes) {
    if (!new RegExp(r.src).test(pathname)) continue;
    if (r.status && r.headers?.Location) return { redirect: r.headers.Location, status: r.status };
    if (r.dest) return { file: r.dest };
  }
  return { file: pathname };
}

createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  const hit = resolve(pathname);
  if (hit.redirect) {
    res.writeHead(hit.status, { Location: hit.redirect }).end();
    return;
  }
  const file = normalize(join(root, decodeURIComponent(hit.file)));
  if (!file.startsWith(root)) return res.writeHead(403).end();
  try {
    if (!statSync(file).isFile()) throw new Error('not a file');
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`serving ${root} on http://127.0.0.1:${port}`));
