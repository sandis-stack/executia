import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateExecutionValue,
  DEMO_DISCLOSURE,
  INDUSTRIES,
} from '../assets/execution-value-engine.js';

const baseInputs = {
  industry: 'technology',
  annualRevenue: 100_000_000,
  employees: 500,
  countries: 2,
  activeProjects: 20,
  averageProjectValue: 2_000_000,
  ebitMargin: 12,
  majorRisks: ['project-delivery'],
};

test('calculateExecutionValue returns all required outputs with kinds', () => {
  const result = calculateExecutionValue(baseInputs);

  assert.ok(result.estimatedExecutionLoss.value > 0);
  assert.equal(result.estimatedExecutionLoss.kind, 'Estimated');
  assert.ok(result.recoverableValue.value > 0);
  assert.ok(result.enterpriseValueCreated.value > 0);
  assert.ok(result.executionScore.value >= 18 && result.executionScore.value <= 92);
  assert.equal(result.executionScore.kind, 'Calculated');
  assert.ok(['Moderate', 'Elevated', 'High', 'Critical'].includes(result.executionRisk.value));
  assert.ok(['Strong', 'Moderate', 'Developing', 'Weak'].includes(result.executionQuality.value));
  assert.ok(Number.isFinite(result.estimatedRoi.value));
  assert.ok(result.estimatedPayback.value >= 6 && result.estimatedPayback.value <= 36);
  assert.equal(result.priorityImprovementAreas.value.length, 3);
  assert.ok(['Low', 'Medium', 'High'].includes(result.confidenceLevel.value));
  assert.equal(result.assumptions.disclosure, DEMO_DISCLOSURE);
});

test('execution loss increases with annual revenue', () => {
  const low = calculateExecutionValue({ ...baseInputs, annualRevenue: 50_000_000 });
  const high = calculateExecutionValue({ ...baseInputs, annualRevenue: 200_000_000 });
  assert.ok(high.estimatedExecutionLoss.value > low.estimatedExecutionLoss.value);
});

test('execution loss increases with geographic complexity', () => {
  const single = calculateExecutionValue({ ...baseInputs, countries: 1 });
  const multi = calculateExecutionValue({ ...baseInputs, countries: 8 });
  assert.ok(multi.estimatedExecutionLoss.value > single.estimatedExecutionLoss.value);
});

test('execution score decreases with more major risks', () => {
  const fewer = calculateExecutionValue({ ...baseInputs, majorRisks: [] });
  const more = calculateExecutionValue({
    ...baseInputs,
    majorRisks: ['regulatory', 'multi-site', 'project-delivery', 'supplier'],
  });
  assert.ok(more.executionScore.value <= fewer.executionScore.value);
});

test('confidence level reflects optional inputs', () => {
  const low = calculateExecutionValue({
    ...baseInputs,
    ebitMargin: null,
    majorRisks: [],
  });
  const high = calculateExecutionValue({
    ...baseInputs,
    ebitMargin: 14,
    majorRisks: ['regulatory', 'multi-site'],
  });
  assert.equal(low.confidenceLevel.value, 'Low');
  assert.equal(high.confidenceLevel.value, 'High');
});

test('invalid industry falls back to first industry', () => {
  const result = calculateExecutionValue({ ...baseInputs, industry: 'unknown-industry' });
  assert.equal(result.inputs.industry, INDUSTRIES[0].id);
});

test('visualization values align with metrics', () => {
  const result = calculateExecutionValue(baseInputs);
  assert.equal(result.visualization.executionLoss, result.estimatedExecutionLoss.value);
  assert.equal(result.visualization.recoverableValue, result.recoverableValue.value);
  assert.equal(result.visualization.enterpriseValueCreated, result.enterpriseValueCreated.value);
});
