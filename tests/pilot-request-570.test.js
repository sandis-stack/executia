/**
 * BACKLOG-570 — /pilot + /request film copy, field mapping, mocked Resend.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const FORBIDDEN_PILOT = [
  /institutional/i,
  /Execution Score/i,
  /board briefing/i,
  /ENGINE gates/i,
  /mission-critical/i,
  /governed adoption/i,
  /4–6 weeks/i,
  /4-6 weeks/i,
];

test('pilot.html copy matches film (no removed terms; hero + form)', () => {
  const html = read('pilot.html');
  assert.match(html, /<h1[^>]*>Start with one real process\.<\/h1>/);
  assert.match(html, /Request a pilot/);
  assert.match(html, /href="#request-pilot"/);
  assert.match(html, /Supplier invoices and payments/);
  assert.match(html, /In writing only\. No calls needed\./);
  assert.match(html, /target capability/);
  assert.match(html, /Meridian Industrial Ltd/);
  assert.match(html, /Signal — needs one more document/);
  for (const re of FORBIDDEN_PILOT) {
    assert.equal(re.test(html), false, `forbidden on /pilot: ${re}`);
  }
});

test('request.html plain English; same field names; Supplier invoices first', () => {
  const html = read('request.html');
  assert.match(html, /<h1>Request a pilot<\/h1>/);
  assert.match(html, /Tell us which process you want checked/);
  assert.match(html, /name="organization"/);
  assert.match(html, /name="operator"/);
  assert.match(html, /name="sector"/);
  assert.match(html, /name="context"/);
  assert.match(html, /name="outcome"/);
  assert.match(html, /<label for="organization">Company<\/label>/);
  assert.match(html, /<label for="operator">Your name<\/label>/);
  assert.match(html, /Work email/);
  assert.match(html, /Process to check/);
  assert.match(html, /What went wrong, or what worries you\?/);
  assert.match(html, /Invoices or payments per month/);
  assert.match(html, /Request a pilot<\/button>/);
  assert.doesNotMatch(html, /Submit Execution Case/);
  assert.doesNotMatch(html, /structured pilot response/i);
  const sectorBlock = html.slice(html.indexOf('id="sector"'), html.indexOf('</select>', html.indexOf('id="sector"')));
  assert.match(sectorBlock, /selected>Supplier invoices and payments</);
  assert.ok(
    sectorBlock.indexOf('Supplier invoices and payments') <
      sectorBlock.indexOf('Customer invoices and collections'),
  );
});

test('app.js success only on API ok; error points to contact@executia.io', () => {
  const js = read('assets/app.js');
  assert.match(js, /Request received\. We will reply in writing within 48 hours\./);
  assert.match(js, /contact@executia\.io/);
  assert.match(js, /json\.ok===false/);
});

test('POST /api/request {} → 400 MISSING_REQUIRED_FIELDS; mocked Resend ok path', async () => {
  const prevKey = process.env.RESEND_API_KEY;
  const prevFetch = globalThis.fetch;
  process.env.RESEND_API_KEY = 'test-key';

  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), body: init?.body ? JSON.parse(init.body) : null });
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: 're_test' }),
    };
  };

  try {
    const mod = await import(pathToFileURL(join(root, 'api/request.js')).href);
    const handler = mod.default;

    const missing = await runHandler(handler, { method: 'POST', body: {} });
    assert.equal(missing.status, 400);
    assert.equal(missing.json.ok, false);
    assert.equal(missing.json.error, 'MISSING_REQUIRED_FIELDS');

    const ok = await runHandler(handler, {
      method: 'POST',
      body: {
        organization: 'Acme AS',
        operator: 'Ada',
        email: 'ada@test.local',
        sector: 'Supplier invoices and payments',
        context: 'Duplicate supplier payment',
        outcome: '80',
      },
    });
    assert.equal(ok.status, 200);
    assert.equal(ok.json.ok, true);
    assert.equal(ok.json.email_user_sent, true);
    assert.equal(ok.json.email_operator_sent, true);
    assert.ok(calls.length >= 2, 'Resend called for user + operator');

    // Fail path: Resend not ok → no false success
    globalThis.fetch = async () => ({
      ok: false,
      status: 500,
      text: async () => JSON.stringify({ error: 'boom' }),
    });
    const fail = await runHandler(handler, {
      method: 'POST',
      body: {
        organization: 'Acme AS',
        operator: 'Ada',
        email: 'ada@test.local',
        context: 'Duplicate',
      },
    });
    assert.equal(fail.status, 500);
    assert.equal(fail.json.ok, false);
    assert.equal(fail.json.error, 'EMAIL_DELIVERY_NOT_CONFIRMED');
  } finally {
    globalThis.fetch = prevFetch;
    if (prevKey == null) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = prevKey;
  }
});

function runHandler(handler, { method, body }) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      payload: null,
      setHeader() {},
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        resolve({ status: this.statusCode, json: payload });
        return this;
      },
    };
    handler({ method, body }, res);
  });
}
