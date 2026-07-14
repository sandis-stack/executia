/**
 * Living Execution Engine — orchestrates intelligence modules (no UI).
 */

import { parseMission, ENGINE_DISCLOSURE } from './mission-parser.js';
import { connectCalculator } from './calculator-connector.js';
import { connectAssessment } from './assessment-connector.js';
import { runReasoningEngine, INSUFFICIENT_BASIS } from './reasoning-engine.js';
import { formatCurrency } from '../execution-value-engine.js';

export { INSUFFICIENT_BASIS };

export const LIFECYCLE_PHASES = [
  { id: 'mission', label: 'Mission' },
  { id: 'intent', label: 'Intent' },
  { id: 'context', label: 'Execution Context' },
  { id: 'reasoning', label: 'Reasoning' },
  { id: 'validation', label: 'Validation' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'outlook', label: 'Execution Outlook' },
  { id: 'decision', label: 'Decision' },
];

function insufficientPhase(name) {
  return {
    status: INSUFFICIENT_BASIS,
    phase: name,
    message: `${name} requires a subsequent Execution Intelligence component.`,
  };
}

function buildExecutionValueContext(calculator) {
  if (!calculator.connected) {
    return { connected: false };
  }
  return {
    connected: true,
    estimatedExecutionLoss: calculator.estimatedExecutionLoss,
    recoverableValue: calculator.recoverableValue,
    priorityAreas: calculator.priorityAreas,
  };
}

function buildAssessmentContext(assessment) {
  if (!assessment.connected) {
    return { connected: false };
  }
  return {
    connected: true,
    organization: assessment.organization,
    executionDomain: assessment.executionDomain,
    executionScore: assessment.executionScore,
    gapAnalysis: assessment.gapAnalysis,
    pilotReadiness: assessment.pilotReadiness,
  };
}

function buildOutputs(reasoning, calculator, assessment) {
  return {
    missionSummary: {
      headline: reasoning.mission.headline,
      statement: reasoning.mission.statement,
    },
    reasoning: {
      claimCount: reasoning.claims.length,
      chainLength: reasoning.chain.length,
      insufficientAreas: reasoning.insufficientAreas,
      status: reasoning.status,
    },
    executionScore: {
      value: INSUFFICIENT_BASIS,
      reason: 'Execution score requires Validation and Execution Outlook components.',
    },
    executionQuality: {
      value: assessment.connected
        ? assessment.executionQuality
        : calculator.connected
          ? calculator.executionQuality
          : INSUFFICIENT_BASIS,
    },
    estimatedBudget: {
      total: INSUFFICIENT_BASIS,
      reason: 'Budget not declared in mission or organization facts.',
    },
    estimatedTimeline: {
      months: INSUFFICIENT_BASIS,
      reason: 'Timeline not declared in mission or organization facts.',
    },
    validation: insufficientPhase('Validation'),
    evidence: insufficientPhase('Evidence'),
    executionOutlook: insufficientPhase('Execution Outlook'),
    decision: {
      outcome: INSUFFICIENT_BASIS,
      reason: 'Decision requires Validation, Evidence, and Execution Outlook.',
    },
  };
}

/**
 * @param {string} missionText
 */
export function generateExecutionScenario(missionText) {
  const parsed = parseMission(missionText);
  if (!parsed.ok) return parsed;

  const calculator = connectCalculator();
  const assessment = connectAssessment();
  const reasoning = runReasoningEngine(missionText, { calculator, assessment });
  if (!reasoning.ok) return reasoning;

  const scenario = {
    mission: reasoning.mission,
    intent: reasoning.intent,
    executionContext: reasoning.executionContext,
    facts: reasoning.facts,
    claims: reasoning.claims,
    reasoningChain: reasoning.chain,
    insufficientAreas: reasoning.insufficientAreas,
    objectives: reasoning.intent.objectives.map((objective) => ({
      id: objective.id,
      text: objective.text,
      source: objective.source,
    })),
    constraints: reasoning.intent.constraints,
    stakeholders: reasoning.intent.stakeholders.map((stakeholder) => ({
      id: stakeholder.id,
      role: stakeholder.role,
      source: stakeholder.source,
    })),
    dependencies: reasoning.intent.dependencies,
    geography: reasoning.intent.geography,
    projects: [],
    tasks: [],
    risks: [],
    timeline: { value: INSUFFICIENT_BASIS },
    budget: { total: INSUFFICIENT_BASIS },
    graph: { nodes: [], edges: [] },
    validation: insufficientPhase('Validation'),
    evidence: insufficientPhase('Evidence'),
    prediction: insufficientPhase('Execution Outlook'),
    executionValue: buildExecutionValueContext(calculator),
    assessmentContext: buildAssessmentContext(assessment),
    disclosure: ENGINE_DISCLOSURE,
    kind: 'ExecutionIntelligence',
  };

  const outputs = buildOutputs(reasoning, calculator, assessment);

  return {
    ok: true,
    missionText: reasoning.mission.statement,
    reasoning,
    scenario,
    outputs,
    calculator,
    assessment,
    executionScore: outputs.executionScore,
    executionQuality: outputs.executionQuality,
    completed: true,
    decision: outputs.decision.outcome,
  };
}

export function formatBudget(budget) {
  if (!budget || budget.total === INSUFFICIENT_BASIS) return INSUFFICIENT_BASIS;
  return formatCurrency(budget.total);
}

export function phasePayload(result, phaseId) {
  const { scenario, outputs, reasoning } = result;
  switch (phaseId) {
    case 'mission':
      return { mission: scenario.mission, disclosure: scenario.disclosure };
    case 'intent':
    case 'analysis':
      return {
        intent: scenario.intent,
        objectives: scenario.objectives,
        constraints: scenario.constraints,
        geography: scenario.geography,
      };
    case 'context':
      return {
        executionContext: scenario.executionContext,
        executionValue: scenario.executionValue,
        assessmentContext: scenario.assessmentContext,
        facts: scenario.facts.filter((fact) => fact.type === 'organization' || fact.type === 'context'),
      };
    case 'reasoning':
    case 'planning':
      return {
        claims: scenario.claims,
        chain: scenario.reasoningChain,
        stakeholders: scenario.stakeholders,
        dependencies: scenario.dependencies,
        insufficientAreas: scenario.insufficientAreas,
      };
    case 'validation':
      return { validation: scenario.validation };
    case 'evidence':
      return { evidence: scenario.evidence };
    case 'prediction':
    case 'outlook':
      return { outlook: scenario.prediction, executionOutlook: outputs.executionOutlook };
    case 'execution-ready':
    case 'decision':
      return { outputs, decision: outputs.decision, reasoning };
    default:
      return null;
  }
}
