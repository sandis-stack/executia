/**
 * Living Execution Engine — orchestrates isolated modules (no UI).
 */

import { parseMission, ENGINE_DISCLOSURE } from './mission-parser.js';
import { connectCalculator } from './calculator-connector.js';
import { connectAssessment } from './assessment-connector.js';
import { connectPilot } from './pilot-connector.js';
import { buildPlan } from './planning-engine.js';
import { buildExecutionGraph } from './execution-graph.js';
import { runValidation } from './validation-engine.js';
import { buildEvidence } from './evidence-engine.js';
import { runPrediction } from './prediction-engine.js';
import { formatCurrency } from '../execution-value-engine.js';

export const LIFECYCLE_PHASES = [
  { id: 'mission', label: 'Mission' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'planning', label: 'Planning' },
  { id: 'execution-graph', label: 'Execution Graph' },
  { id: 'validation', label: 'Validation' },
  { id: 'prediction', label: 'Prediction' },
  { id: 'execution-ready', label: 'Execution Ready' },
];

/**
 * @param {string} missionText
 */
export function generateExecutionScenario(missionText) {
  const parsed = parseMission(missionText);
  if (!parsed.ok) return parsed;

  const calculator = connectCalculator();
  const assessment = connectAssessment();
  const plan = buildPlan(parsed, calculator);
  const graph = buildExecutionGraph(plan, parsed);
  const validation = runValidation(plan, assessment);
  const evidence = buildEvidence(plan, validation);
  const prediction = runPrediction(plan, calculator, assessment);

  const executionScore = computeExecutionScore(calculator, assessment, validation, prediction);
  const executionQuality = assessment.connected
    ? assessment.executionQuality
    : calculator.connected
      ? calculator.executionQuality
      : 'Prototype';

  const scenario = {
    mission: parsed.mission,
    objectives: plan.objectives,
    stakeholders: plan.stakeholders,
    projects: plan.projects,
    tasks: plan.tasks,
    risks: plan.risks,
    timeline: plan.timeline,
    budget: plan.budget,
    dependencies: plan.dependencies,
    requiredDocuments: plan.requiredDocuments,
    executionStandard: plan.executionStandard,
    graph,
    validation,
    evidence,
    prediction,
    executionValue: buildExecutionValueContext(calculator),
    assessmentContext: buildAssessmentContext(assessment),
    disclosure: ENGINE_DISCLOSURE,
    kind: 'Demonstration',
  };

  const pilot = connectPilot(scenario, assessment, calculator);
  scenario.pilotRecommendation = pilot;

  const outputs = buildOutputs(scenario, executionScore, executionQuality, pilot, calculator);

  return {
    ok: true,
    missionText: parsed.mission.statement,
    scenario,
    outputs,
    calculator,
    assessment,
    pilot,
    executionScore,
    executionQuality,
    completed: true,
    decision: prediction.executionReady ? 'EXECUTION_READY' : 'REVIEW_REQUIRED',
  };
}

function computeExecutionScore(calculator, assessment, validation, prediction) {
  const base = assessment.connected
    ? assessment.executionScore
    : calculator.connected
      ? calculator.executionScore
      : 48;
  const blended = Math.round(
    base * 0.45 + validation.passRate * 0.25 + prediction.executionReadiness * 0.3,
  );
  return {
    value: Math.min(95, Math.max(30, blended)),
    kind: assessment.connected ? 'Calculated' : calculator.connected ? 'Estimated' : 'Demonstration',
  };
}

function buildExecutionValueContext(calculator) {
  if (!calculator.connected) {
    return { connected: false, kind: 'Demo' };
  }
  return {
    connected: true,
    kind: 'Estimated',
    estimatedExecutionLoss: calculator.estimatedExecutionLoss,
    recoverableValue: calculator.recoverableValue,
    estimatedRoi: calculator.estimatedRoi,
    priorityAreas: calculator.priorityAreas,
  };
}

function buildAssessmentContext(assessment) {
  if (!assessment.connected) {
    return { connected: false, kind: 'Demo' };
  }
  return {
    connected: true,
    kind: 'Calculated',
    organization: assessment.organization,
    executionDomain: assessment.executionDomain,
    executionScore: assessment.executionScore,
    gapAnalysis: assessment.gapAnalysis,
    pilotReadiness: assessment.pilotReadiness,
  };
}

function buildOutputs(scenario, executionScore, executionQuality, pilot, calculator) {
  return {
    missionSummary: {
      headline: scenario.mission.headline,
      domain: scenario.mission.domainLabel,
      kind: 'Calculated',
    },
    executionPlan: {
      objectives: scenario.objectives.length,
      projects: scenario.projects.length,
      tasks: scenario.tasks.length,
      stakeholders: scenario.stakeholders.length,
      kind: 'Estimated',
    },
    executionGraph: {
      nodes: scenario.graph.nodes.length,
      edges: scenario.graph.edges.length,
      kind: scenario.graph.kind,
    },
    executionScore,
    executionRisks: {
      items: scenario.risks,
      count: scenario.risks.length,
      kind: 'Estimated',
    },
    executionQuality: {
      value: executionQuality,
      kind: calculator?.connected || scenario.assessmentContext?.connected ? 'Calculated' : 'Demonstration',
    },
    estimatedBudget: scenario.budget,
    estimatedTimeline: scenario.timeline,
    evidenceRequirements: {
      items: scenario.evidence.items,
      summary: scenario.evidence.summary,
      kind: scenario.evidence.kind,
    },
    recommendedNextActions: {
      items: pilot.actions,
      recommendation: pilot.recommendation,
      readiness: pilot.readiness,
      kind: pilot.kind,
    },
  };
}

export function formatBudget(budget) {
  return formatCurrency(budget.total);
}

export function phasePayload(result, phaseId) {
  const { scenario, outputs, calculator, assessment } = result;
  switch (phaseId) {
    case 'mission':
      return { mission: scenario.mission, disclosure: scenario.disclosure };
    case 'analysis':
      return {
        domain: scenario.mission.domainLabel,
        verb: scenario.mission.verb,
        executionValue: scenario.executionValue,
        assessmentContext: scenario.assessmentContext,
      };
    case 'planning':
      return {
        objectives: scenario.objectives,
        stakeholders: scenario.stakeholders,
        projects: scenario.projects,
        tasks: scenario.tasks.slice(0, 6),
        timeline: scenario.timeline,
        budget: scenario.budget,
        dependencies: scenario.dependencies,
        requiredDocuments: scenario.requiredDocuments,
        executionStandard: scenario.executionStandard,
      };
    case 'execution-graph':
      return { graph: scenario.graph };
    case 'validation':
      return { validation: scenario.validation, evidence: scenario.evidence };
    case 'prediction':
      return { prediction: scenario.prediction };
    case 'execution-ready':
      return { outputs, pilot: scenario.pilotRecommendation };
    default:
      return null;
  }
}
