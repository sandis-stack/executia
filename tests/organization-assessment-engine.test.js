import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateExecutionValue } from '../assets/execution-value-engine.js';
import {
  calculateOrganizationAssessment,
  ASSESSMENT_DISCLOSURE,
  QUALIFICATION_FOCUS,
} from '../assets/organization-assessment-engine.js';

function calculatorPayload(overrides = {}) {
  const inputs = {
    industry: 'technology',
    annualRevenue: 100_000_000,
    employees: 800,
    countries: 3,
    activeProjects: 20,
    averageProjectValue: 2_000_000,
    ebitMargin: 12,
    majorRisks: ['project-delivery'],
  };
  return {
    inputs,
    results: calculateExecutionValue(inputs),
    ...overrides,
  };
}

test('requires calculator payload before assessment runs', () => {
  const result = calculateOrganizationAssessment(null, {});
  assert.equal(result.ok, false);
  assert.equal(result.error, 'CALCULATOR_REQUIRED');
});

test('consumes calculator results and returns product outputs', () => {
  const result = calculateOrganizationAssessment(calculatorPayload(), {
    organization: 'Acme Corp',
    contact: 'Jane Director',
    email: 'jane@acme.example',
    executionDomain: 'Financial control',
    selfAssessment: {
      authorityValidation: 2,
      governanceReadiness: 2,
      executionQualification: 3,
      evidenceAudit: 2,
      visibilityControl: 2,
    },
  });

  assert.equal(result.ok, true);
  assert.ok(result.executionScore.value >= 18 && result.executionScore.value <= 95);
  assert.ok(result.gapAnalysis.value.length > 0);
  assert.ok(result.valueReport.value.calculatorBaseline.estimatedExecutionLoss.value > 0);
  assert.ok(result.improvementPlan.value.length > 0);
  assert.ok(result.pilotRecommendation.value.length > 0);
  assert.equal(result.meta.calculatorConsumed, true);
  assert.equal(result.meta.disclosure, ASSESSMENT_DISCLOSURE);
});

test('value report includes calculator baseline fields', () => {
  const payload = calculatorPayload();
  const result = calculateOrganizationAssessment(payload, {
    organization: 'Northwind',
    contact: 'Alex',
    selfAssessment: {
      authorityValidation: 4,
      governanceReadiness: 4,
      executionQualification: 4,
      evidenceAudit: 4,
      visibilityControl: 4,
    },
  });

  const report = result.valueReport.value;
  assert.equal(report.organization, 'Northwind');
  assert.equal(
    report.calculatorBaseline.estimatedExecutionLoss.value,
    payload.results.estimatedExecutionLoss.value,
  );
  assert.equal(
    report.calculatorBaseline.recoverableValue.value,
    payload.results.recoverableValue.value,
  );
});

test('qualification focus merged from layer concepts', () => {
  assert.deepEqual(QUALIFICATION_FOCUS, [
    'Authority validation',
    'Governance readiness',
    'Execution qualification',
    'Proof eligibility',
  ]);
});

test('lower self-assessment increases gap count', () => {
  const high = calculateOrganizationAssessment(calculatorPayload(), {
    organization: 'A',
    contact: 'B',
    selfAssessment: {
      authorityValidation: 5,
      governanceReadiness: 5,
      executionQualification: 5,
      evidenceAudit: 5,
      visibilityControl: 5,
    },
  });
  const low = calculateOrganizationAssessment(calculatorPayload(), {
    organization: 'A',
    contact: 'B',
    selfAssessment: {
      authorityValidation: 1,
      governanceReadiness: 1,
      executionQualification: 1,
      evidenceAudit: 1,
      visibilityControl: 1,
    },
  });

  assert.ok(low.gapAnalysis.value.length >= high.gapAnalysis.value.length);
  assert.ok(low.executionScore.value < high.executionScore.value);
});
