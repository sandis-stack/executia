import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMission } from '../assets/living-engine/mission-parser.js';
import { generateExecutionScenario, LIFECYCLE_PHASES, phasePayload } from '../assets/living-engine/orchestrator.js';
import { calculateExecutionValue } from '../assets/execution-value-engine.js';
import { calculateOrganizationAssessment } from '../assets/organization-assessment-engine.js';
import {
  buildFunnelSummary,
  missionContext,
  engineScenarioSummary,
  persistEngineRun,
  loadEngineRun,
  ENGINE_RUN_KEY,
} from '../assets/public-funnel.js';

test('parseMission accepts business objectives', () => {
  const result = parseMission('We want to expand into Germany.');
  assert.equal(result.ok, true);
  assert.equal(result.mission.domain, 'expansion');
});

test('parseMission rejects short input', () => {
  const result = parseMission('short');
  assert.equal(result.ok, false);
});

test('generateExecutionScenario produces full lifecycle outputs', () => {
  const result = generateExecutionScenario('We need to renovate a hospital.');
  assert.equal(result.ok, true);
  assert.equal(result.scenario.mission.domain, 'healthcare');
  assert.ok(result.outputs.executionScore.value >= 30);
  assert.ok(result.outputs.estimatedBudget.total > 0);
  assert.ok(result.outputs.estimatedTimeline.months >= 3);
  assert.equal(result.scenario.kind, 'Demonstration');
  assert.equal(LIFECYCLE_PHASES.length, 7);
  assert.ok(phasePayload(result, 'execution-graph').graph.nodes.length > 0);
});

test('engine consumes calculator and assessment context when provided', () => {
  const calculatorPayload = {
    inputs: { industry: 'technology', employees: 900, annualRevenue: 120_000_000, activeProjects: 24 },
    results: calculateExecutionValue({
      industry: 'technology',
      annualRevenue: 120_000_000,
      employees: 900,
      countries: 3,
      activeProjects: 24,
      averageProjectValue: 2_500_000,
      majorRisks: ['project-delivery'],
    }),
  };
  const assessment = calculateOrganizationAssessment(calculatorPayload, {
    organization: 'Acme Health',
    contact: 'Jane',
    selfAssessment: {
      authorityValidation: 3,
      governanceReadiness: 3,
      executionQualification: 3,
      evidenceAudit: 2,
      visibilityControl: 2,
    },
  });

  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('executia.executionValue.v1', JSON.stringify(calculatorPayload));
    sessionStorage.setItem('executia.organizationAssessment.v1', JSON.stringify({
      calculatorSnapshot: calculatorPayload,
      inputs: assessment.inputs,
      results: assessment,
    }));
  }

  const result = generateExecutionScenario('We need ISO certification.');
  assert.equal(result.ok, true);
  assert.equal(result.calculator.connected, typeof sessionStorage !== 'undefined');
  assert.equal(result.assessment.connected, typeof sessionStorage !== 'undefined');
  if (result.assessment.connected) {
    assert.equal(result.scenario.assessmentContext.organization, 'Acme Health');
  }
});

test('persistEngineRun stores scenario for funnel handoff', () => {
  if (typeof sessionStorage === 'undefined') return;
  const result = generateExecutionScenario('We want to reduce project delays.');
  persistEngineRun({
    completed: true,
    missionText: result.missionText,
    decision: result.decision,
    executionScore: result.executionScore.value,
    executionReadiness: result.scenario.prediction.executionReadiness,
    scenario: result.scenario,
    outputs: result.outputs,
  });
  const stored = loadEngineRun();
  assert.equal(stored.completed, true);
  assert.equal(stored.missionText, result.missionText);
  assert.ok(stored.outputs.executionScore);
  sessionStorage.removeItem(ENGINE_RUN_KEY);
});

test('buildFunnelSummary includes living engine scenario lines', () => {
  const result = generateExecutionScenario('I want to build a factory.');
  const ctx = {
    calculator: null,
    assessment: null,
    engine: {
      completed: true,
      missionText: result.missionText,
      decision: result.decision,
      outputs: result.outputs,
    },
  };
  const summary = buildFunnelSummary(ctx);
  assert.match(summary, /Living Engine/);
  assert.match(summary, /Engine mission/);
  assert.match(summary, /Estimated timeline/);
});

test('missionContext and engineScenarioSummary for pilot handoff', () => {
  const ctx = {
    calculator: null,
    assessment: null,
    engine: {
      completed: true,
      missionText: 'Expand into Germany',
      outputs: {
        missionSummary: { headline: 'Expand into Germany' },
        executionScore: { value: 71 },
        estimatedTimeline: { months: 14 },
        estimatedBudget: { total: 2_400_000 },
        executionRisks: { count: 4 },
        recommendedNextActions: { readiness: 'Qualified' },
      },
    },
  };
  assert.equal(missionContext(ctx), 'Expand into Germany');
  const summary = engineScenarioSummary(ctx);
  assert.equal(summary.score, 71);
  assert.equal(summary.timelineMonths, 14);
});
