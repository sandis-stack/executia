/**
 * Living Execution Engine — orchestrates intelligence modules (no UI).
 */

import { parseMission, ENGINE_DISCLOSURE } from './mission-parser.js';
import { connectCalculator } from './calculator-connector.js';
import { connectAssessment } from './assessment-connector.js';
import { runReasoningEngine, INSUFFICIENT_BASIS } from './reasoning-engine.js';
import { runValidation } from './validation-engine.js';
import { runEvidence } from './evidence-engine.js';
import { runExecutionOutlook } from './execution-outlook-engine.js';
import { runDecision } from './decision-engine.js';
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

function sanitizeInternalIds(text) {
  return String(text ?? '')
    .replace(/\b(claim|finding|obligation|assumption|action|because|invalid|reeval)-[a-z0-9-]+\b/gi, '')
    .replace(/\bES-[A-Z0-9-]+\b/g, '')
    .replace(/\boutlook-scenario-\d+\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function publicizeActionText(text) {
  const raw = String(text ?? '');
  if (/Proceed under the READY execution outlook/i.test(raw)) {
    return 'Proceed under the stated execution assumptions.';
  }
  if (/Provide proof for obligation/i.test(raw)) {
    const proof = raw.split(':').slice(1).join(':').trim();
    return proof ? `Provide proof: ${sanitizeInternalIds(proof)}` : 'Provide required proof before proceeding.';
  }
  if (/Resolve finding/i.test(raw)) {
    return 'Resolve the open validation issue before proceeding.';
  }
  if (/Route to executive sponsor/i.test(raw)) {
    return 'Obtain executive sponsor or governing authority approval.';
  }
  if (/Resolve blocking validation findings/i.test(raw)) {
    return 'Resolve blocking validation issues before re-evaluation.';
  }
  return sanitizeInternalIds(raw);
}

function publicizeConditionText(text) {
  const raw = String(text ?? '');
  if (/Outlook invalid if/i.test(raw)) {
    if (/remains INSUFFICIENT BASIS/i.test(raw) || /remains unresolved/i.test(raw)) {
      return 'Re-evaluate if unresolved execution areas remain open.';
    }
    if (/outcome changes under/i.test(raw)) {
      return 'Re-evaluate if validated assumptions change.';
    }
    if (/premise facts for/i.test(raw) && /are withdrawn/i.test(raw)) {
      return 'Re-evaluate if supporting facts are withdrawn.';
    }
    return 'Re-evaluate if execution assumptions change.';
  }
  if (/must change from/i.test(raw) || /must reach VERIFIED/i.test(raw)) {
    return 'Complete the open requirement before requesting a new decision.';
  }
  if (/Execution outlook must reach READY/i.test(raw)) {
    return 'Execution readiness must be established before re-evaluation.';
  }
  if (raw === 'NONE IDENTIFIED') {
    return 'No re-evaluation triggers identified.';
  }
  return sanitizeInternalIds(raw);
}

export function buildPublicDecisionSummary(decision) {
  if (!decision?.summary) {
    return {
      decision: INSUFFICIENT_BASIS,
      reason: 'A governed decision could not be formed from the available inputs.',
      required_actions: [],
      re_evaluation_conditions: [],
    };
  }

  return {
    decision: decision.decision,
    reason: sanitizeInternalIds(decision.summary.reason),
    required_actions: (decision.required_actions ?? []).map((action) => publicizeActionText(action.text)),
    re_evaluation_conditions: (decision.re_evaluation_conditions ?? []).map((condition) =>
      publicizeConditionText(condition.text),
    ),
  };
}

function buildOutputs(reasoning, validation, evidence, outlook, decision, calculator, assessment) {
  const publicDecision = buildPublicDecisionSummary(decision);
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
    validation: validation.summary,
    evidence: evidence.summary,
    executionOutlook: outlook.summary,
    executionScore: {
      value: INSUFFICIENT_BASIS,
      reason: 'Execution score requires Decision component.',
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
    decision: {
      outcome: publicDecision.decision,
      reason: publicDecision.reason,
      required_actions: publicDecision.required_actions,
      re_evaluation_conditions: publicDecision.re_evaluation_conditions,
    },
    decisionSummary: publicDecision,
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

  const validation = runValidation(reasoning);
  const evidence = runEvidence(reasoning, validation);
  const outlook = runExecutionOutlook(reasoning, validation, evidence);
  const decision = runDecision(reasoning, validation, evidence, outlook);

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
    validation,
    evidence,
    outlook,
    decision,
    executionValue: buildExecutionValueContext(calculator),
    assessmentContext: buildAssessmentContext(assessment),
    disclosure: ENGINE_DISCLOSURE,
    kind: 'ExecutionIntelligence',
  };

  const outputs = buildOutputs(reasoning, validation, evidence, outlook, decision, calculator, assessment);

  return {
    ok: true,
    missionText: reasoning.mission.statement,
    reasoning,
    validation,
    evidence,
    outlook,
    decisionRecord: decision,
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
      return { validation: scenario.validation, findings: scenario.validation.findings };
    case 'evidence':
      return { evidence: scenario.evidence, obligations: scenario.evidence.obligations };
    case 'prediction':
    case 'outlook':
      return {
        outlook: scenario.outlook,
        executionOutlook: outputs.executionOutlook,
        scenario: scenario.outlook?.scenario,
        assumptions: scenario.outlook?.assumptions,
        confidence: scenario.outlook?.confidence,
        invalid_conditions: scenario.outlook?.invalid_conditions,
      };
    case 'execution-ready':
    case 'decision':
      return { decisionSummary: outputs.decisionSummary ?? outputs.decision };
    default:
      return null;
  }
}
