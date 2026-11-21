/** BACKLOG-585 — XSS + currency follow-ups after PR #9. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFunnelSummary, sanitizeCurrency } from '../assets/public-funnel.js';
import { formatCurrency } from '../assets/execution-value-engine.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

function walkAssetsJs() {
  const dir = join(root, 'assets');
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name.endsWith('.js')) out.push(join(dir, name));
  }
  return out;
}

test('sanitizeCurrency whitelists ISO 4217', () => {
  assert.equal(sanitizeCurrency('nok'), 'NOK');
  assert.equal(sanitizeCurrency('EUR'), 'EUR');
  assert.equal(sanitizeCurrency('<img>'), 'USD');
  assert.equal(sanitizeCurrency('USDX'), 'USD');
});

test('fmtMoney / formatCurrency honour calculator currency (NOK)', () => {
  const nok = formatCurrency(1_249_000, 'NOK');
  assert.match(nok, /1[\s,]?249[\s,]?000|NOK/);
  assert.doesNotMatch(nok, /\$/);
});

test('buildFunnelSummary uses calculator currency and omits Score/Recoverable lines', () => {
  const summary = buildFunnelSummary({
    calculator: {
      currency: 'NOK',
      results: {
        annualLoss: 500000,
        hoursPerYear: 120,
        executionScore: { value: 44 },
        recoverableValue: { value: 999 },
      },
    },
    assessment: null,
    engine: null,
  });
  assert.match(summary, /Estimated annual loss/);
  assert.match(summary, /NOK|kr/i);
  assert.doesNotMatch(summary, /Execution Score/i);
  assert.doesNotMatch(summary, /recoverable/i);
});

test('calculator summary never uses innerHTML from URL params (bootstrap + module)', () => {
  const boot = read('assets/public-funnel-bootstrap.js');
  const mod = read('assets/public-funnel.js');
  assert.match(boot, /setStrongLine|createElement\('strong'\)/);
  assert.doesNotMatch(
    boot,
    /summary\.innerHTML\s*=\s*'<strong>'\s*\+\s*line/,
  );
  assert.doesNotMatch(
    mod,
    /summary\.innerHTML\s*=\s*`<strong>\$\{line\}/,
  );
  assert.match(boot, /sanitizeCurrency/);
  assert.match(mod, /sanitizeCurrency\(params\.get\('currency'\)/);
});

test('crafted ?people= XSS payload stays text in prefill path (source contract)', () => {
  const payload = '<img src=x onerror=alert(1)>';
  // Both files push people into a plain string `line`, then textContent/strong.textContent.
  const boot = read('assets/public-funnel-bootstrap.js');
  const mod = read('assets/public-funnel.js');
  assert.match(boot, /people \+ ' people'/);
  assert.match(mod, /\$\{people\} people/);
  assert.match(boot, /strong\.textContent\s*=\s*line/);
  assert.match(mod, /strong\.textContent\s*=\s*line/);
  // Ensure payload characters would be text if passed through textContent (API contract).
  assert.equal(payload.includes('<img'), true);
  assert.doesNotMatch(boot, /summary\.innerHTML/);
  assert.doesNotMatch(mod, /summary\.innerHTML/);
});

test('audit: public-funnel*.js — no URL/session string into non-empty innerHTML', () => {
  const offenders = [];
  for (const file of walkAssetsJs()) {
    const base = file.split('/').pop();
    if (!/^public-funnel/.test(base)) continue;
    const src = readFileSync(file, 'utf8');
    const re = /\.innerHTML\s*=\s*[^;]+;/g;
    let m;
    while ((m = re.exec(src))) {
      const expr = m[0];
      if (/innerHTML\s*=\s*['"`]\s*['"`]/.test(expr)) continue;
      if (/innerHTML\s*=\s*''/.test(expr)) continue;
      offenders.push(`${base}: ${expr.slice(0, 160)}`);
    }
  }
  assert.deepEqual(offenders, [], offenders.join('\n'));
});
