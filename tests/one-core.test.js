import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FLOW_NODE_IDS,
  BASE_NODE_DEFINITIONS,
  layoutPositions,
  buildEdges,
  buildGraphNodes,
} from '../assets/one-core/graph-model.js';
import {
  buildOneCoreContext,
  buildOneCoreGraph,
} from '../assets/one-core/funnel-connector.js';
import {
  resolveNode,
  keyboardNavigate,
  nextNodeId,
  DEFAULT_SELECTION,
} from '../assets/one-core/interaction.js';
import { calculateExecutionValue } from '../assets/execution-value-engine.js';
import { calculateOrganizationAssessment } from '../assets/organization-assessment-engine.js';
import { generateExecutionScenario } from '../assets/living-engine/orchestrator.js';

test('graph model includes full execution flow', () => {
  assert.equal(FLOW_NODE_IDS.length, 13);
  const nodes = buildGraphNodes();
  assert.equal(nodes.length, 14);
  assert.ok(BASE_NODE_DEFINITIONS.mission);
  assert.ok(BASE_NODE_DEFINITIONS['continuous-improvement'].dependencies.includes('mission'));
});

test('layout and edges connect mission through flow loop', () => {
  const layout = layoutPositions(FLOW_NODE_IDS.length, 640, 480);
  const edges = buildEdges(layout);
  assert.ok(edges.some((e) => e.from === 'mission' && e.type === 'hub'));
  assert.ok(edges.some((e) => e.to === 'mission' && e.type === 'loop'));
});

test('mission binding from living engine context', () => {
  const result = generateExecutionScenario('We want to expand into Germany.');
  const ctx = {
    calculator: null,
    assessment: null,
    engine: {
      missionText: result.missionText,
      completed: true,
      scenario: result.scenario,
      outputs: result.outputs,
    },
  };
  const context = buildOneCoreContext(ctx);
  assert.equal(context.missionBound, true);
  assert.match(context.mission, /Germany/);

  const graph = buildOneCoreGraph(ctx);
  const mission = graph.missionNode;
  assert.match(mission.missionText, /Germany/);
  assert.ok(graph.nodes.find((n) => n.id === 'projects')?.outputs?.length > 0);
});

test('one core context receives score value assessment and priorities', () => {
  const calculatorPayload = {
    inputs: { industry: 'technology' },
    results: calculateExecutionValue({
      industry: 'technology',
      annualRevenue: 100_000_000,
      employees: 500,
      countries: 2,
      activeProjects: 20,
      averageProjectValue: 2_000_000,
      majorRisks: ['project-delivery'],
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
  const ctx = {
    calculator: calculatorPayload,
    assessment: { calculatorSnapshot: calculatorPayload, inputs: assessment.inputs, results: assessment },
    engine: null,
  };
  const context = buildOneCoreContext(ctx);
  assert.equal(context.executionScore, assessment.executionScore.value);
  assert.ok(context.executionValue > 0);
  assert.ok(context.assessmentSummary);
  assert.ok(context.priorityAreas.length > 0);
});

test('node interaction navigation', () => {
  assert.equal(DEFAULT_SELECTION, 'mission');
  assert.equal(nextNodeId('mission', FLOW_NODE_IDS), 'objectives');
  assert.equal(keyboardNavigate({ key: 'ArrowRight' }, 'mission', FLOW_NODE_IDS), 'objectives');
  const graph = buildOneCoreGraph({ calculator: null, assessment: null, engine: null });
  const node = resolveNode('execution', graph.nodes);
  assert.equal(node.id, 'execution');
  assert.ok(node.purpose);
});

test('responsive layout produces positions within canvas', () => {
  const layout = layoutPositions(FLOW_NODE_IDS.length, 320, 400);
  [...layout.nodes, layout.mission].forEach((p) => {
    assert.ok(p.x >= 0 && p.x <= 320);
    assert.ok(p.y >= 0 && p.y <= 400);
  });
});
