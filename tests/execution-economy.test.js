import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ECONOMY_STAGE_IDS,
  BASE_STAGE_DEFINITIONS,
  ECONOMY_CYCLE_MESSAGE,
  WAITING_INDICATOR,
  layoutStages,
  buildFlowEdges,
  buildStages,
  keyboardNavigate,
  animationActiveIndex,
  resolveStage,
} from '../assets/execution-economy/economy-model.js';
import {
  buildEconomyContext,
  buildEconomyFlow,
} from '../assets/execution-economy/economy-connector.js';
import { calculateExecutionValue } from '../assets/execution-value-engine.js';
import { calculateOrganizationAssessment } from '../assets/organization-assessment-engine.js';
import { generateExecutionScenario } from '../assets/living-engine/orchestrator.js';

test('economy model defines full value cycle', () => {
  assert.equal(ECONOMY_STAGE_IDS.length, 11);
  assert.ok(ECONOMY_CYCLE_MESSAGE.includes('Execution creates Value'));
  const stages = buildStages();
  assert.equal(stages.length, 11);
  assert.ok(BASE_STAGE_DEFINITIONS['better-execution'].dependencies.includes('execution'));
});

test('flow edges include forward chain and loop', () => {
  const layout = layoutStages(ECONOMY_STAGE_IDS.length, 640);
  const edges = buildFlowEdges(layout);
  assert.ok(edges.some((e) => e.type === 'flow'));
  assert.ok(edges.some((e) => e.type === 'loop' && e.to === 'execution'));
});

test('context binding receives funnel values without duplicate calculation', () => {
  const calculatorPayload = {
    inputs: { industry: 'technology' },
    results: calculateExecutionValue({
      industry: 'technology',
      annualRevenue: 80_000_000,
      employees: 400,
      countries: 2,
      activeProjects: 16,
      averageProjectValue: 1_500_000,
      majorRisks: [],
    }),
  };
  const assessment = calculateOrganizationAssessment(calculatorPayload, {
    organization: 'Acme',
    contact: 'Jane',
    selfAssessment: {
      authorityValidation: 3,
      governanceReadiness: 3,
      executionQualification: 3,
      evidenceAudit: 2,
      visibilityControl: 2,
    },
  });
  const engineResult = generateExecutionScenario('We need ISO certification.');
  const ctx = {
    calculator: calculatorPayload,
    assessment: { calculatorSnapshot: calculatorPayload, inputs: assessment.inputs, results: assessment },
    engine: {
      missionText: engineResult.missionText,
      completed: true,
      scenario: engineResult.scenario,
      outputs: engineResult.outputs,
    },
  };

  const context = buildEconomyContext(ctx);
  assert.match(context.mission, /ISO/);
  assert.equal(context.executionScore, assessment.executionScore.value);
  assert.ok(context.executionValue > 0);
  assert.ok(context.assessmentSummary);

  const flow = buildEconomyFlow(ctx);
  const execution = flow.stages.find((s) => s.id === 'execution');
  const score = flow.stages.find((s) => s.id === 'execution-score');
  const value = flow.stages.find((s) => s.id === 'execution-value');
  assert.equal(execution.live, true);
  assert.match(execution.indicator, /ISO/);
  assert.equal(score.live, true);
  assert.match(score.indicator, /\/100/);
  assert.equal(value.live, true);
  assert.match(value.indicator, /Recoverable/);

  const evidence = flow.stages.find((s) => s.id === 'evidence');
  assert.equal(evidence.live, true);
  assert.equal(typeof evidence.indicator, 'string');
  assert.match(evidence.indicator, /evidence obligations satisfied/);
});

test('stages without funnel data show waiting indicator', () => {
  const flow = buildEconomyFlow({ calculator: null, assessment: null, engine: null });
  flow.stages.forEach((stage) => {
    assert.equal(stage.indicator, WAITING_INDICATOR);
    assert.equal(stage.live, false);
    assert.equal(stage.kind, 'Demo');
  });
});

test('animation and keyboard navigation', () => {
  assert.equal(animationActiveIndex(0, 11), 0);
  assert.equal(animationActiveIndex(11, 11), 0);
  assert.equal(keyboardNavigate({ key: 'ArrowDown' }, 'execution'), 'evidence');
  assert.equal(keyboardNavigate({ key: 'ArrowUp' }, 'evidence'), 'execution');
  const flow = buildEconomyFlow({ calculator: null, assessment: null, engine: null });
  assert.equal(resolveStage('capital', flow.stages)?.id, 'capital');
});

test('responsive layout fits stages within canvas height', () => {
  const narrow = layoutStages(11, 320);
  const wide = layoutStages(11, 900);
  assert.ok(narrow.height >= 400);
  assert.ok(wide.height >= 400);
  narrow.stages.forEach((s) => {
    assert.ok(s.y >= 0 && s.y <= narrow.height);
    assert.ok(s.x >= 0 && s.x <= narrow.width);
  });
});
