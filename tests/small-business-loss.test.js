import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSmallBusinessLoss,
  SMALL_BUSINESS_WEEKS,
  HOURS_PER_WORKING_DAY,
} from '../assets/small-business-loss.js';
import {
  currencyFromCountry,
  formatMoney,
  resolveCurrency,
} from '../assets/calculator-currency.js';
import {
  calculateExecutionValue,
  validateOrganizationInputs,
} from '../assets/execution-value-engine.js';

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

test('small business: 1 person defaults produce a positive result', () => {
  const result = calculateSmallBusinessLoss({
    people: 1,
    hourlyCost: 550,
    hoursPerWeek: 4,
    stuckPerMonth: 3,
    delayWeekCost: 10_000,
  });
  assert.ok(result.annualLoss > 0);
  assert.ok(result.hoursPerYear > 0);
});

test('currency maps NO→NOK and eurozone→EUR', () => {
  assert.equal(currencyFromCountry('NO'), 'NOK');
  assert.equal(currencyFromCountry('DE'), 'EUR');
  assert.equal(currencyFromCountry('US'), 'USD');
  assert.equal(resolveCurrency({ country: 'NO' }), 'NOK');
  assert.match(formatMoney(412000, 'NOK'), /412/);
});

test('organization validation never silent — below mins suggest small business', () => {
  const low = validateOrganizationInputs({
    industry: 'technology',
    annualRevenue: '100000',
    employees: '1',
    countries: '1',
    activeProjects: '1',
    averageProjectValue: '1000',
  });
  assert.equal(low.ok, false);
  assert.equal(low.suggestSmall, true);
  assert.ok(low.messages.employees);
  assert.ok(low.messages.annualRevenue);
});

test('organization large case still returns enterprise value (= recoverable)', () => {
  const result = calculateExecutionValue({
    industry: 'technology',
    annualRevenue: 500_000_000,
    employees: 2000,
    countries: 8,
    activeProjects: 40,
    averageProjectValue: 2_000_000,
    ebitMargin: 12,
    majorRisks: ['project-delivery'],
  });
  assert.ok(result.estimatedExecutionLoss.value > 0);
  assert.equal(result.enterpriseValueCreated.value, result.recoverableValue.value);
  assert.ok(result.enterpriseValueCreated.value > 0);
});
