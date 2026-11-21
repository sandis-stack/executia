import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  calculateSmallBusinessLoss,
  HEADCOUNT_BANDS,
  roundTo2SigFigs,
  SMALL_BUSINESS_WEEKS,
  HOURS_PER_WORKING_DAY,
  bandForId,
} from '../assets/small-business-loss.js';
import {
  currencyFromCountry,
  formatMoney,
  resolveCurrency,
  CURRENCIES,
} from '../assets/calculator-currency.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('small business: 5 people / 4 h / 3 stuck matches manual formulas', () => {
  const result = calculateSmallBusinessLoss({
    people: 5,
    hourlyCost: 55,
    hoursPerWeek: 4,
    stuckPerMonth: 3,
    delayWeekCost: 1100,
  });
  const duplicate = 5 * 4 * 55 * SMALL_BUSINESS_WEEKS;
  const delays = 3 * 12 * 1100;
  assert.equal(result.duplicateWork, Math.round(duplicate));
  assert.equal(result.delays, Math.round(delays));
  assert.equal(result.annualLoss, Math.round(duplicate + delays));
  assert.equal(result.hoursPerYear, 5 * 4 * SMALL_BUSINESS_WEEKS);
  assert.equal(
    result.workingDays,
    Math.round(((5 * 4 * SMALL_BUSINESS_WEEKS) / HOURS_PER_WORKING_DAY) * 10) / 10,
  );
});

test('small business: people=1 exact (stuck default 1 path)', () => {
  const result = calculateSmallBusinessLoss({
    people: 1,
    hourlyCost: 550,
    hoursPerWeek: 4,
    stuckPerMonth: 1,
    delayWeekCost: 10_000,
  });
  const duplicate = 1 * 4 * 550 * SMALL_BUSINESS_WEEKS;
  const delays = 1 * 12 * 10_000;
  assert.equal(result.annualLoss, Math.round(duplicate + delays));
  assert.equal(result.hoursPerYear, 184);
  assert.equal(result.workingDays, 24.5);
});

test('formula exact for 1, 5, 20, 100, 2000 people', () => {
  for (const people of [1, 5, 20, 100, 2000]) {
    const hourly = 55;
    const hours = people >= 50 ? 3 : 4;
    const stuck = people >= 250 ? 30 : people >= 50 ? 10 : people >= 10 ? 3 : 1;
    const delay = people >= 50 ? 5000 : 1100;
    const result = calculateSmallBusinessLoss({
      people,
      hourlyCost: hourly,
      hoursPerWeek: hours,
      stuckPerMonth: stuck,
      delayWeekCost: delay,
    });
    const dup = people * hours * hourly * SMALL_BUSINESS_WEEKS;
    const del = stuck * 12 * delay;
    assert.equal(result.exact.duplicateWork, dup, `dup people=${people}`);
    assert.equal(result.exact.delays, del, `del people=${people}`);
    assert.equal(result.annualLoss, Math.round(dup + del), `sum people=${people}`);
  }
});

test('roundTo2SigFigs: 86541 → 87000', () => {
  assert.equal(roundTo2SigFigs(86_541), 87_000);
  assert.equal(roundTo2SigFigs(461_200), 460_000);
});

test('band defaults: stuck 1 for 1–9, 3 for 10–49; org people 100/500', () => {
  assert.equal(bandForId('1-9').stuckDefault, 1);
  assert.equal(bandForId('10-49').stuckDefault, 3);
  assert.equal(bandForId('50-249').peopleDefault, 100);
  assert.equal(bandForId('50-249').mode, 'org');
  assert.equal(bandForId('250+').peopleDefault, 500);
  assert.equal(bandForId('250+').stuckDefault, 30);
  assert.ok(HEADCOUNT_BANDS.every((b) => b.hoursDefault >= 3));
});

test('PO 15:27 delays omitted until both inputs present', () => {
  const without = calculateSmallBusinessLoss({
    people: 5,
    hourlyCost: 550,
    hoursPerWeek: 4,
    stuckPerMonth: null,
    delayWeekCost: null,
  });
  assert.equal(without.delaysKnown, false);
  assert.equal(without.delays, 0);
  assert.equal(without.display.delays, null);
  assert.equal(without.annualLoss, Math.round(5 * 4 * 550 * SMALL_BUSINESS_WEEKS));
  assert.match(without.formulas.delays, /Not known/);

  const partial = calculateSmallBusinessLoss({
    people: 5,
    hourlyCost: 550,
    hoursPerWeek: 4,
    stuckPerMonth: 3,
    delayWeekCost: null,
  });
  assert.equal(partial.delaysKnown, false);
  assert.equal(partial.delays, 0);

  const both = calculateSmallBusinessLoss({
    people: 5,
    hourlyCost: 550,
    hoursPerWeek: 4,
    stuckPerMonth: 3,
    delayWeekCost: 10_000,
  });
  assert.equal(both.delaysKnown, true);
  assert.equal(both.delays, 3 * 12 * 10_000);
});

test('currency maps NO→NOK and eurozone→EUR', () => {
  assert.equal(currencyFromCountry('NO'), 'NOK');
  assert.equal(currencyFromCountry('DE'), 'EUR');
  assert.equal(currencyFromCountry('US'), 'USD');
  assert.equal(resolveCurrency({ country: 'NO' }), 'NOK');
  assert.match(formatMoney(412000, 'NOK'), /412/);
});

test('public calculator HTML/JS: no removed org terms', () => {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const calc = readFileSync(join(ROOT, 'assets/execution-value-calculator.js'), 'utf8');
  const css = readFileSync(join(ROOT, 'assets/execution-value-calculator.css'), 'utf8');
  const banned = [
    'Recoverable Value',
    'Enterprise Value Created',
    'Execution Score',
    'Enterprise value',
    'loss-rate',
    'payback',
    'ROI',
  ];
  for (const term of banned) {
    assert.equal(html.includes(term), false, `index.html still has ${term}`);
    assert.equal(calc.includes(term), false, `calculator.js still has ${term}`);
  }
  assert.match(css, /\.evc-chart-fill\.neutral/);
  assert.match(calc, /roundTo2SigFigs|display\.annualLoss/);
  assert.match(calc, /Not known yet — enter both delay fields to include delays/);
  assert.match(html, /data-mode-panel="org"/);
  assert.equal(html.includes('id="ev-calculator-form"'), false);
  assert.equal(/\sid="ev-stuck"[^>]*\srequired/.test(html), false);
  assert.equal(/\sid="ev-delay-cost"[^>]*\srequired/.test(html), false);
});

test('BACKLOG-560 V2: breakdown % are whole numbers; exact only in formulas.shares', () => {
  const both = calculateSmallBusinessLoss({
    people: 5,
    hourlyCost: 550,
    hoursPerWeek: 4,
    stuckPerMonth: 1,
    delayWeekCost: 10_000,
  });
  // 506000 dup + 120000 delays → ~80.8 / 19.2 → bars 81 / 19
  assert.equal(both.breakdown.duplicateWorkPct, 81);
  assert.equal(both.breakdown.delaysPct, 19);
  assert.ok(Math.abs(both.breakdown.duplicateWorkPctExact - 80.8306) < 0.01);
  assert.match(both.formulas.shares, /80\.8%/);
  assert.match(both.formulas.shares, /19\.2%/);
  assert.equal(Number.isInteger(both.breakdown.duplicateWorkPct), true);
  assert.equal(Number.isInteger(both.breakdown.delaysPct), true);
});

test('BACKLOG-567 CSS: stacked label/track/value at all widths; unknown copy wraps', () => {
  const css = readFileSync(join(ROOT, 'assets/execution-value-calculator.css'), 'utf8');
  assert.match(css, /BACKLOG-567/);
  // Stacked one-column grid (not side-by-side label|track|value).
  assert.match(css, /\.evc-breakdown-row\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.equal(
    /grid-template-columns:\s*minmax\(0,\s*8\.5rem\)\s+minmax\(0,\s*1fr\)\s+minmax\(0,\s*6\.75rem\)/.test(
      css,
    ),
    false,
  );
  assert.equal(/grid-template-columns:\s*max-content/.test(css), false);
  assert.equal(/minmax\(6\.5rem,\s*11rem\)/.test(css), false);
  assert.match(css, /\.evc-breakdown-amt\.is-unknown/);
  assert.match(css, /\.evc-breakdown-amt\s*\{[^}]*white-space:\s*nowrap/s);
  const calc = readFileSync(join(ROOT, 'assets/execution-value-calculator.js'), 'utf8');
  assert.match(calc, /classList\.add\('is-unknown'\)/);
  assert.match(calc, /Not known yet — enter both delay fields to include delays/);
});

test('BACKLOG-560 Q1: calculator request URL builder never sets score params', () => {
  const calc = readFileSync(join(ROOT, 'assets/execution-value-calculator.js'), 'utf8');
  assert.match(calc, /BACKLOG-560 Q1/);
  assert.match(calc, /source:\s*'calculator'/);
  // Params object must not include these keys.
  assert.equal(/params\.set\(\s*['"]executionScore['"]/.test(calc), false);
  assert.equal(/params\.set\(\s*['"]recoverableValue['"]/.test(calc), false);
  assert.equal(/executionScore\s*:/.test(calc), false);
  assert.equal(/recoverableValue\s*:/.test(calc), false);
  // Persist payload from calculator path also omits them.
  assert.match(calc, /annualLoss:\s*result\.display\.annualLoss/);
  assert.equal(/results:\s*\{[^}]*executionScore/s.test(calc), false);
});
