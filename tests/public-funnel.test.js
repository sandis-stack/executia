import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateExecutionValue } from '../assets/execution-value-engine.js';
import { calculateOrganizationAssessment } from '../assets/organization-assessment-engine.js';
import {
  loadPublicFunnelContext,
  buildFunnelSummary,
  buildFunnelJourney,
  buildRequestUrl,
  buildOneUrl,
  missionContext,
  refinedExecutionScore,
  funnelIsReady,
} from '../assets/public-funnel.js';

test('buildFunnelSummary includes calculator and assessment lines', () => {
  const calculatorPayload = {
    inputs: { industry: 'technology' },
    results: calculateExecutionValue({
      industry: 'technology',
      annualRevenue: 100_000_000,
      employees: 500,
      countries: 2,
      activeProjects: 20,
      averageProjectValue: 2_000_000,
      majorRisks: [],
    }),
  };
  const assessment = calculateOrganizationAssessment(calculatorPayload, {
    organization: 'Acme',
    contact: 'Jane',
    selfAssessment: {
      authorityValidation: 2,
      governanceReadiness: 2,
      executionQualification: 3,
      evidenceAudit: 2,
      visibilityControl: 2,
    },
  });
  const ctx = {
    calculator: calculatorPayload,
    assessment: { calculatorSnapshot: calculatorPayload, inputs: assessment.inputs, results: assessment },
    engine: { completed: true, missionText: 'Test mission', decision: 'APPROVED' },
  };
  const summary = buildFunnelSummary(ctx);
  assert.match(summary, /Estimated execution loss/);
  assert.match(summary, /Refined Execution Score/);
  assert.match(summary, /Living Engine/);
});

test('refinedExecutionScore prefers assessment over calculator', () => {
  const ctx = {
    calculator: { results: { executionScore: { value: 50 } } },
    assessment: { results: { executionScore: { value: 62 } } },
    engine: null,
  };
  assert.equal(refinedExecutionScore(ctx), 62);
});

test('missionContext uses engine mission when present', () => {
  const ctx = {
    calculator: null,
    assessment: null,
    engine: { missionText: 'Custom engine mission' },
  };
  assert.equal(missionContext(ctx), 'Custom engine mission');
});

test('funnelIsReady gates assessment on calculator', () => {
  assert.equal(funnelIsReady('calculator'), false);
  assert.equal(funnelIsReady('assessment'), false);
});

test('buildFunnelJourney marks first incomplete step active', () => {
  const empty = buildFunnelJourney({ calculator: null, assessment: null, engine: null });
  assert.equal(empty[0].id, 'mission');
  assert.equal(empty[0].status, 'active');
  assert.equal(empty[1].status, 'pending');

  const withCalc = buildFunnelJourney({
    calculator: { results: { executionScore: { value: 58 } } },
    assessment: null,
    engine: null,
  });
  assert.equal(withCalc[0].status, 'active');
  assert.equal(withCalc[1].status, 'complete');
  assert.equal(withCalc[2].status, 'pending');
  assert.match(withCalc[1].detail, /58\/100/);
});

test('buildRequestUrl and buildOneUrl are strings when session empty', () => {
  /* sessionStorage unavailable in node — functions still return paths */
  if (typeof sessionStorage === 'undefined') {
    assert.match(buildRequestUrl(), /^\/request\?/);
    assert.match(buildOneUrl(), /^https:\/\/one\.executia\.io\/\?/);
  }
});
