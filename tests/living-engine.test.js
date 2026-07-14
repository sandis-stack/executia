import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMission } from '../assets/living-engine/mission-parser.js';
import {
  generateExecutionScenario,
  LIFECYCLE_PHASES,
  phasePayload,
  INSUFFICIENT_BASIS,
} from '../assets/living-engine/orchestrator.js';
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
  assert.match(result.mission.statement, /Germany/);
});

test('parseMission rejects short input', () => {
  const result = parseMission('short');
  assert.equal(result.ok, false);
});

test('generateExecutionScenario produces reasoning chain outputs', () => {
  const result = generateExecutionScenario(
    'We need executive sponsor alignment for governed hospital renovation.',
  );
  assert.equal(result.ok, true);
  assert.equal(result.scenario.kind, 'ExecutionIntelligence');
  assert.ok(result.reasoning.claims.length >= 1);
  assert.ok(result.reasoning.chain.length >= 1);
  assert.equal(result.outputs.executionScore.value, INSUFFICIENT_BASIS);
  assert.equal(result.outputs.estimatedBudget.total, INSUFFICIENT_BASIS);
  assert.equal(result.outputs.estimatedTimeline.months, INSUFFICIENT_BASIS);
  assert.ok(result.outputs.validation.claimsValidated >= 1);
  assert.ok(result.outputs.validation.rulesApplied >= 1);
  assert.ok(result.validation.findings.length >= 1);
  assert.ok(result.outputs.evidence.obligationsCount >= 1);
  assert.equal(result.outputs.evidence.obligationsCount, result.validation.findings.length);
  assert.ok(result.evidence.obligations.length >= 1);
  assert.ok(result.outlook.summary);
  assert.equal(LIFECYCLE_PHASES.length, 8);
  assert.ok(phasePayload(result, 'reasoning').claims.length >= 1);
  assert.ok(phasePayload(result, 'validation').findings.length >= 1);
  assert.ok(phasePayload(result, 'evidence').obligations.length >= 1);
  assert.ok(phasePayload(result, 'outlook').outlook);
});

test('generateExecutionScenario runs full intelligence pipeline through Decision', () => {
  const result = generateExecutionScenario(
    'Executive sponsor requires governed expansion into Germany after legal entity setup.',
  );
  assert.equal(result.ok, true);
  assert.ok(['PROCEED', 'HOLD', 'REJECT', 'ESCALATE'].includes(result.decision));
  assert.ok(result.outputs.decisionSummary);
  assert.equal(result.outputs.decision.outcome, result.decision);
  assert.ok(result.outputs.decision.reason);
  assert.ok(Array.isArray(result.outputs.decision.required_actions));
  assert.ok(Array.isArray(result.outputs.decision.re_evaluation_conditions));
  const publicSummary = phasePayload(result, 'decision').decisionSummary;
  assert.ok(publicSummary.reason);
  assert.equal(publicSummary.decision, result.decision);
  assert.equal(JSON.stringify(publicSummary).includes('finding-'), false);
  assert.equal(JSON.stringify(publicSummary).includes('claim-'), false);
  assert.equal(JSON.stringify(publicSummary).includes('obligation-'), false);
  assert.equal(JSON.stringify(publicSummary).includes('ES-'), false);
});

test('engine consumes calculator context in reasoning facts', () => {
  const calculatorPayload = {
    inputs: {
      industry: 'technology',
      annualRevenue: 120_000_000,
      employees: 900,
      countries: 3,
      activeProjects: 24,
      averageProjectValue: 2_500_000,
      majorRisks: ['project-delivery'],
    },
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

  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('executia.executionValue.v1', JSON.stringify(calculatorPayload));
  }

  const result = generateExecutionScenario('We need ISO certification with governed evidence.');
  assert.equal(result.ok, true);
  assert.equal(result.calculator.connected, typeof sessionStorage !== 'undefined');
  if (result.calculator.connected) {
    assert.ok(result.scenario.facts.some((fact) => fact.id === 'fact-org-industry'));
    assert.ok(result.scenario.claims.some((claim) => claim.id === 'claim-org-profile-bound'));
  }
});

test('persistEngineRun stores reasoning for funnel handoff', () => {
  if (typeof sessionStorage === 'undefined') return;
  const result = generateExecutionScenario('We want to reduce project delays with governed visibility.');
  persistEngineRun({
    completed: true,
    missionText: result.missionText,
    decision: result.decision,
    executionScore: result.executionScore.value,
    executionReadiness: INSUFFICIENT_BASIS,
    scenario: result.scenario,
    outputs: result.outputs,
    reasoning: result.reasoning,
  });
  const stored = loadEngineRun();
  assert.equal(stored.completed, true);
  assert.equal(stored.missionText, result.missionText);
  assert.ok(stored.reasoning?.claims?.length >= 1);
  sessionStorage.removeItem(ENGINE_RUN_KEY);
});

test('buildFunnelSummary includes living engine mission lines', () => {
  const result = generateExecutionScenario('I want executive sponsor review before factory commissioning.');
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
        executionScore: { value: INSUFFICIENT_BASIS },
        estimatedTimeline: { months: INSUFFICIENT_BASIS },
        estimatedBudget: { total: INSUFFICIENT_BASIS },
        reasoning: { claimCount: 3, chainLength: 3 },
      },
    },
  };
  assert.equal(missionContext(ctx), 'Expand into Germany');
  const summary = engineScenarioSummary(ctx);
  assert.equal(summary.mission, 'Expand into Germany');
});
