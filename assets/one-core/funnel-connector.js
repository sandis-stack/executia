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
import { INSUFFICIENT_BASIS } from '../living-engine/orchestrator.js';
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
  }

  if (base.id === 'projects' && scenario?.claims?.length) {
    node.outputs = scenario.claims.slice(0, 3).map((claim) => claim.statement.slice(0, 60));
  }

  if (base.id === 'people' && scenario?.stakeholders?.length) {
    node.outputs = scenario.stakeholders.slice(0, 4).map((s) => s.role);
  } else if (base.id === 'people') {
    node.outputs = [INSUFFICIENT_BASIS];
  }

  if (base.id === 'finance' && scenario?.budget?.total && scenario.budget.total !== INSUFFICIENT_BASIS) {
    node.outputs = [`Budget ${formatCurrency(scenario.budget.total)}`];
  } else if (base.id === 'finance') {
    node.outputs = [INSUFFICIENT_BASIS];
  }

  if (base.id === 'validation' && scenario?.validation?.summary) {
    const summary = scenario.validation.summary;
    node.outputs = [
      `${summary.claimsValidated} claims validated`,
      `${summary.rulesApplied} rules applied`,
      `${summary.findingsCount} findings`,
    ];
    if (summary.blocked) {
      node.outputs.push(`${summary.blockedClaims.length} blocked claim(s)`);
    }
  } else if (base.id === 'validation') {
    node.outputs = [INSUFFICIENT_BASIS];
  }

  if (base.id === 'evidence' && scenario?.evidence?.summary) {
    const summary = scenario.evidence.summary;
    node.outputs = [
      `${summary.obligationsCount} obligations`,
      `${summary.satisfiedObligations.length} satisfied`,
      `${summary.unsatisfiedObligations.length} unsatisfied`,
    ];
    if (summary.insufficientBasisObligations.length) {
      node.outputs.push(`${summary.insufficientBasisObligations.length} insufficient basis`);
    }
  } else if (base.id === 'evidence') {
    node.outputs = [INSUFFICIENT_BASIS];
  }

  if (base.id === 'prediction' && scenario?.prediction?.status === INSUFFICIENT_BASIS) {
    node.outputs = [INSUFFICIENT_BASIS];
  }

  if (base.id === 'continuous-improvement' && scenario?.reasoningChain?.length) {
    node.outputs = scenario.reasoningChain.slice(0, 2).map((step) => step.inference.slice(0, 60));
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
