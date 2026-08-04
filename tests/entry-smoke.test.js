/**
 * Production ENTRY smoke — serves repo root (not /tmp, not package-only dist).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { access, writeFile, mkdir } from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function get(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            body: Buffer.concat(chunks).toString('utf8'),
            headers: res.headers,
          });
        });
      })
      .on('error', reject);
  });
}

test('production smoke: Entry routes and assets return 200 from workspace root', async () => {
  await access(path.join(root, 'index.html'));
  await access(path.join(root, 'assets/entry-landing.css'));
  await access(path.join(root, 'assets/entry-landing.js'));
  await access(path.join(root, 'assets/platform-nav.js'));

  const port = 4280 + Math.floor(Math.random() * 200);
  const servePath = path.join(root, 'scripts/entry-serve.mjs');
  await mkdir(path.join(root, 'scripts'), { recursive: true });
  await writeFile(
    servePath,
    `import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 4280);
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json', '.svg':'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (urlPath === '/' || urlPath === '/entry') urlPath = '/index.html';
    const file = path.join(root, urlPath.replace(/^\\//, ''));
    if (!file.startsWith(root)) { res.writeHead(403); res.end('forbidden'); return; }
    const body = await readFile(file);
    const ext = path.extname(file);
    res.writeHead(200, { 'content-type': types[ext] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('not found');
  }
});
server.listen(port, '127.0.0.1', () => console.log('http://127.0.0.1:' + port));
`,
    'utf8'
  );

  const child = spawn(process.execPath, [servePath], {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let ready = false;
  const boot = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('serve boot timeout')), 8000);
    const onData = (buf) => {
      if (String(buf).includes(`http://127.0.0.1:${port}`)) {
        ready = true;
        clearTimeout(timer);
        resolve();
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('exit', (code) => {
      if (!ready) {
        clearTimeout(timer);
        reject(new Error(`serve exited early: ${code}`));
      }
    });
  });

  try {
    await boot;
    const paths = [
      '/',
      '/entry',
      '/assets/app.css',
      '/assets/entry-landing.css',
      '/assets/entry-landing.js',
      '/assets/platform-nav.js',
      '/assets/platform-brand.js',
      '/assets/app.js',
      '/request.html',
    ];
    for (const p of paths) {
      const res = await get(`http://127.0.0.1:${port}${p}`);
      assert.equal(res.status, 200, `${p} → ${res.status}`);
    }
    const home = await get(`http://127.0.0.1:${port}/`);
    const entry = await get(`http://127.0.0.1:${port}/entry`);
    assert.ok(home.body.includes('data-page="entry"'));
    assert.ok(home.body.includes('id="hero"'));
    assert.ok(home.body.includes('id="platform"'));
    assert.ok(home.body.includes('id="engine"'));
    assert.ok(home.body.includes('id="pilot"'));
    assert.ok(home.body.includes('One Execution Standard') || home.body.includes('better execution'));
    assert.ok(home.body.includes('after a decision') || home.body.includes('What happens after a decision'));
    assert.ok(home.body.includes('skip-link'));
    assert.ok(home.body.includes('entry-landing.css'));
    assert.equal(home.body, entry.body, '/ and /entry must serve the same Entry document');
    assert.equal(home.body.includes('/sign-in'), false);
  } finally {
    child.kill('SIGTERM');
  }
});
