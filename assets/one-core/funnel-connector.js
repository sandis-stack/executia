/**
 * One Core — binds public funnel context to graph model.
 */

import { formatCurrency } from '../execution-value-engine.js';
import {
  loadPublicFunnelContext,
  refinedExecutionScore,
  recoverableValue,
  priorityAreas,
  engineScenarioSummary,
} from '../public-funnel.js';
import { BASE_NODE_DEFINITIONS, FLOW_NODE_IDS, buildGraphNodes } from './graph-model.js';

export function buildOneCoreContext(ctx = loadPublicFunnelContext()) {
  const assessment = ctx.assessment?.results;
  const calc = ctx.calculator?.results;
  const engine = ctx.engine;
  const summary = engineScenarioSummary(ctx);
  const priorities = priorityAreas(ctx);
  const score = refinedExecutionScore(ctx);
  const value = recoverableValue(ctx);

  const missionText = engine?.missionText
    ?? engine?.scenario?.mission?.headline
    ?? null;

  let assessmentSummary = null;
  if (assessment?.ok) {
    const parts = [
      `Score ${assessment.executionScore.value}/100`,
      assessment.pilotRecommendation?.readiness,
    ];
    if (priorities.length) parts.push(`Priority: ${priorities[0]}`);
    assessmentSummary = parts.join(' · ');
  }

  return {
    mission: missionText,
    missionBound: Boolean(missionText),
    executionScore: score,
    executionValue: value,
    assessmentSummary,
    priorityAreas: priorities,
    organization: ctx.assessment?.inputs?.organization ?? null,
    scenario: engine?.scenario ?? null,
    kind: missionText ? 'Calculated' : 'Demo',
  };
}

function enrichNode(base, context, scenario) {
  const node = { ...base, inputs: [...base.inputs], outputs: [...base.outputs] };

  if (base.id === 'mission' && context.mission) {
    node.missionText = context.mission;
    node.outputs = [`Mission: ${context.mission.slice(0, 80)}`];
    node.kind = 'Calculated';
  } else if (base.id === 'mission') {
    node.missionText =
      'Your governing objective binds here after Living Engine — every object in ONE derives from Mission.';
    node.kind = 'Demo';
  }

  if (base.id === 'objectives' && scenario?.objectives?.length) {
    node.outputs = scenario.objectives.slice(0, 3).map((o) => o.text.slice(0, 60));
    node.kind = 'Estimated';
  }

  if (base.id === 'projects' && scenario?.projects?.length) {
    node.outputs = scenario.projects.map((p) => p.name);
    node.kind = 'Estimated';
  }

  if (base.id === 'people' && scenario?.stakeholders?.length) {
    node.outputs = scenario.stakeholders.slice(0, 4).map((s) => s.role);
    node.kind = 'Estimated';
  }

  if (base.id === 'documents' && scenario?.requiredDocuments?.length) {
    node.outputs = scenario.requiredDocuments.map((d) => d.name);
    node.kind = 'Calculated';
  }

  if (base.id === 'finance' && scenario?.budget) {
    node.outputs = [`Budget ${formatCurrency(scenario.budget.total)} (estimated)`];
    node.kind = 'Estimated';
  }

  if (base.id === 'execution' && scenario?.executionStandard) {
    node.outputs = scenario.executionStandard.flow ?? node.outputs;
    node.kind = 'Calculated';
  }

  if (base.id === 'validation' && scenario?.validation) {
    node.outputs = [`${scenario.validation.passRate}% pass · ${scenario.validation.summary}`];
    node.kind = 'Calculated';
  }

  if (base.id === 'evidence' && scenario?.evidence) {
    node.outputs = [scenario.evidence.summary];
    node.kind = 'Calculated';
  }

  if (base.id === 'prediction' && scenario?.prediction) {
    node.outputs = [`Readiness ${scenario.prediction.executionReadiness}%`];
    node.kind = 'Estimated';
  }

  if (base.id === 'continuous-improvement' && context.priorityAreas?.length) {
    node.inputs = [...node.inputs, ...context.priorityAreas.slice(0, 2)];
    node.kind = context.priorityAreas.length ? 'Calculated' : node.kind;
  }

  if (context.executionScore != null && ['objectives', 'prediction', 'learning'].includes(base.id)) {
    node.inputs = [...node.inputs, `Execution Score ${context.executionScore}/100`];
  }

  if (context.executionValue != null && base.id === 'finance') {
    node.inputs = [...node.inputs, `Recoverable value ${formatCurrency(context.executionValue)}`];
  }

  if (context.assessmentSummary && base.id === 'objectives') {
    node.inputs = [...node.inputs, context.assessmentSummary];
  }

  return node;
}

export function buildOneCoreGraph(ctx = loadPublicFunnelContext()) {
  const context = buildOneCoreContext(ctx);
  const scenario = context.scenario;
  const definitions = { ...BASE_NODE_DEFINITIONS };

  const nodes = buildGraphNodes(definitions).map((base) =>
    enrichNode(base, context, scenario),
  );

  return {
    context,
    nodes,
    missionNode: nodes.find((n) => n.id === 'mission'),
    flowIds: FLOW_NODE_IDS,
  };
}
