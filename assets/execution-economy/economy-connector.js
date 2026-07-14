/**
 * Execution Economy — binds public funnel context to economy flow.
 */

import { formatCurrency } from '../execution-value-engine.js';
import {
  loadPublicFunnelContext,
  refinedExecutionScore,
  recoverableValue,
  priorityAreas,
  engineScenarioSummary,
} from '../public-funnel.js';
import {
  BASE_STAGE_DEFINITIONS,
  ECONOMY_STAGE_IDS,
  WAITING_INDICATOR,
  buildStages,
} from './economy-model.js';

export function buildEconomyContext(ctx = loadPublicFunnelContext()) {
  const assessment = ctx.assessment?.results;
  const calc = ctx.calculator?.results;
  const engine = ctx.engine;
  const summary = engineScenarioSummary(ctx);
  const priorities = priorityAreas(ctx);
  const score = refinedExecutionScore(ctx);
  const recover = recoverableValue(ctx);

  const mission = engine?.missionText
    ?? engine?.scenario?.mission?.headline
    ?? null;

  let assessmentStatus = null;
  if (assessment?.ok) {
    assessmentStatus = `Complete · ${assessment.pilotRecommendation.readiness}`;
  }

  return {
    mission,
    executionScore: score,
    executionValue: recover,
    estimatedLoss: calc?.estimatedExecutionLoss?.value ?? null,
    assessmentSummary: assessment?.ok
      ? `Score ${assessment.executionScore.value}/100 · ${assessment.pilotRecommendation.value}`
      : null,
    assessmentStatus,
    priorityAreas: priorities,
    engineSummary: summary,
    scenario: engine?.scenario ?? null,
    engineCompleted: Boolean(engine?.completed),
    calculatorReady: Boolean(calc),
    assessmentReady: Boolean(assessment?.ok),
  };
}

function formatEvidenceSummary(summary) {
  if (!summary) return WAITING_INDICATOR;
  if (typeof summary === 'string') return summary;
  const total = summary.obligationsCount ?? 0;
  const satisfied = summary.satisfiedObligations?.length ?? 0;
  return `${satisfied} of ${total} evidence obligations satisfied`;
}

function indicator(stageId, context) {
  const { scenario, engineSummary } = context;

  switch (stageId) {
    case 'execution':
      return context.mission
        ? context.mission.slice(0, 56)
        : WAITING_INDICATOR;
    case 'evidence':
      return formatEvidenceSummary(scenario?.evidence?.summary);
    case 'knowledge':
      return scenario?.graph
        ? `${scenario.graph.nodes.length} nodes · ${scenario.graph.edges.length} relationships`
        : WAITING_INDICATOR;
    case 'trust':
      return context.assessmentStatus ?? WAITING_INDICATOR;
    case 'execution-score':
      return context.executionScore != null
        ? `${context.executionScore}/100`
        : WAITING_INDICATOR;
    case 'execution-value':
      if (context.executionValue != null) {
        return `Recoverable ${formatCurrency(context.executionValue)}`;
      }
      return WAITING_INDICATOR;
    case 'capital':
      if (context.executionScore != null && context.executionValue != null) {
        return `Capital index from score ${context.executionScore} + value baseline`;
      }
      return WAITING_INDICATOR;
    case 'growth':
      if (context.priorityAreas?.length) {
        return `Priority: ${context.priorityAreas[0]}`;
      }
      return context.executionValue != null ? 'Growth envelope from value baseline' : WAITING_INDICATOR;
    case 'new-opportunities':
      if (context.assessmentSummary) {
        return context.assessmentSummary.slice(0, 72);
      }
      return WAITING_INDICATOR;
    case 'continuous-learning':
      if (engineSummary?.readiness != null) {
        return `Readiness ${engineSummary.readiness}%`;
      }
      return context.engineCompleted ? 'Learning from engine scenario' : WAITING_INDICATOR;
    case 'better-execution':
      if (context.engineCompleted && engineSummary?.decision) {
        return engineSummary.decision.replace(/_/g, ' ');
      }
      return context.mission ? 'Cycle ready — bind full engine scenario' : WAITING_INDICATOR;
    default:
      return WAITING_INDICATOR;
  }
}

function stageKind(stageId, context, indicatorText) {
  if (indicatorText === WAITING_INDICATOR) return 'Demo';
  if (['execution-value', 'capital', 'growth'].includes(stageId) && context.executionValue != null) {
    return 'Estimated';
  }
  if (['execution-score', 'trust', 'new-opportunities'].includes(stageId) && context.assessmentReady) {
    return 'Calculated';
  }
  if (context.engineCompleted) return 'Demonstration';
  if (context.calculatorReady) return 'Estimated';
  return 'Calculated';
}

function enrichStage(base, context) {
  const ind = indicator(base.id, context);
  const kind = stageKind(base.id, context, ind);
  const stage = {
    ...base,
    inputs: [...base.inputs],
    outputs: [...base.outputs],
    indicator: ind,
    kind,
    live: ind !== WAITING_INDICATOR,
  };

  if (base.id === 'execution' && context.mission) {
    stage.outputs = [`Mission: ${context.mission.slice(0, 80)}`];
  }
  if (base.id === 'execution-value' && context.estimatedLoss != null) {
    stage.inputs = [...stage.inputs, `Estimated loss ${formatCurrency(context.estimatedLoss)}`];
  }
  if (base.id === 'execution-score' && context.executionScore != null) {
    stage.outputs = [`Score ${context.executionScore}/100`];
  }
  if (base.id === 'evidence' && context.scenario?.evidence?.summary) {
    stage.outputs = [formatEvidenceSummary(context.scenario.evidence.summary)];
  }
  if (base.id === 'new-opportunities' && context.priorityAreas?.length) {
    stage.inputs = [...stage.inputs, ...context.priorityAreas.slice(0, 2)];
  }
  if (base.id === 'better-execution' && context.mission) {
    stage.inputs = [...stage.inputs, `Mission: ${context.mission.slice(0, 48)}`];
  }

  return stage;
}

export function buildEconomyFlow(ctx = loadPublicFunnelContext()) {
  const context = buildEconomyContext(ctx);
  const stages = buildStages(BASE_STAGE_DEFINITIONS).map((base) => enrichStage(base, context));

  return {
    context,
    stages,
    stageIds: ECONOMY_STAGE_IDS,
  };
}
