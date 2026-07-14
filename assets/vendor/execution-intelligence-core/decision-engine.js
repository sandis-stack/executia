/**
 * Execution Intelligence — Decision Engine v1.0
 * Authority: EXECUTIA_EXECUTION_INTELLIGENCE_MODEL.md §10–11
 *
 * Synthesizes Reasoning → Validation → Evidence → Execution Outlook into one governed outcome.
 * Never creates facts, claims, findings, evidence, or outlook.
 */

import { INSUFFICIENT_BASIS } from './constants.js';

/** @typedef {'PROCEED'|'HOLD'|'REJECT'|'ESCALATE'|'INSUFFICIENT BASIS'} DecisionOutcome */

export const DECISION_OUTCOMES = {
  PROCEED: 'PROCEED',
  HOLD: 'HOLD',
  REJECT: 'REJECT',
  ESCALATE: 'ESCALATE',
  INSUFFICIENT_BASIS: INSUFFICIENT_BASIS,
};

const BLOCKING_STATUSES = new Set(['INVALID', 'NOT EVALUABLE']);
const BLOCKING_SEVERITIES = new Set(['MAJOR', 'CRITICAL']);

const AUTHORITY_RULE_IDS = new Set(['ES-REQ-001', 'ES-VAL-030']);
const MANDATORY_REJECT_RULE_IDS = new Set(['ES-REQ-002']);

/**
 * @param {object} finding
 * @returns {boolean}
 */
function isBlockingFinding(finding) {
  return (
    BLOCKING_STATUSES.has(finding.execution_status)
    && BLOCKING_SEVERITIES.has(finding.severity)
  );
}

/**
 * @param {object[]} findings
 * @returns {object[]}
 */
function blockingFindings(findings) {
  return findings.filter(isBlockingFinding);
}

/**
 * @param {object} evidence
 * @returns {object[]}
 */
function requiredObligations(evidence) {
  return (evidence?.obligations ?? []).filter(
    (obligation) => obligation.evidence_status === 'REQUIRED',
  );
}

/**
 * @param {object} obligation
 * @returns {boolean}
 */
function isRequiredEvidenceSatisfied(obligation) {
  return obligation.verification === 'VERIFIED' && obligation.evidence_result === 'SATISFIED';
}

function hasOrganizationProfile(reasoning) {
  return !(reasoning?.insufficientAreas ?? []).some(
    (area) => area.area === 'organization_profile' && area.status === INSUFFICIENT_BASIS,
  );
}

function hasFalseVerifiedEvidence(evidence) {
  return (evidence?.obligations ?? []).some(
    (obligation) =>
      obligation.verification === 'NOT VERIFIABLE' && obligation.evidence_result === 'SATISFIED',
  );
}

/**
 * @param {object} reasoning
 * @param {object} validation
 * @param {object} evidence
 * @param {object} outlook
 * @returns {{ outcome: DecisionOutcome, reason: string, decidingFindings: object[], decidingObligations: object[] }}
 */
function resolveOutcome(reasoning, validation, evidence, outlook) {
  const findings = validation?.findings ?? [];
  const blocked = blockingFindings(findings);
  const required = requiredObligations(evidence);
  const findingById = Object.fromEntries(findings.map((finding) => [finding.finding_id, finding]));

  if (!hasOrganizationProfile(reasoning)) {
    return {
      outcome: DECISION_OUTCOMES.INSUFFICIENT_BASIS,
      reason: 'Required organization information is not available to support an execution decision.',
      decidingFindings: [],
      decidingObligations: [],
    };
  }

  if (hasFalseVerifiedEvidence(evidence)) {
    return {
      outcome: DECISION_OUTCOMES.INSUFFICIENT_BASIS,
      reason: 'Required evidence cannot be verified from the available information.',
      decidingFindings: [],
      decidingObligations: required,
    };
  }

  for (const finding of blocked) {
    if (
      finding.execution_status === 'INVALID'
      && finding.severity === 'CRITICAL'
      && MANDATORY_REJECT_RULE_IDS.has(finding.rule_id)
    ) {
      return {
        outcome: DECISION_OUTCOMES.REJECT,
        reason: `Mandatory Execution Standard rule ${finding.rule_id} failed.`,
        decidingFindings: [finding],
        decidingObligations: [],
      };
    }
  }

  for (const obligation of required) {
    const linkedFinding = findingById[obligation.finding_id];
    if (
      obligation.evidence_result === INSUFFICIENT_BASIS
      && linkedFinding?.execution_status === 'NOT EVALUABLE'
      && BLOCKING_SEVERITIES.has(linkedFinding.severity)
    ) {
      return {
        outcome: DECISION_OUTCOMES.REJECT,
        reason: 'Required evidence cannot be satisfied for a not-evaluable finding.',
        decidingFindings: linkedFinding ? [linkedFinding] : [],
        decidingObligations: [obligation],
      };
    }
  }

  for (const finding of blocked) {
    if (
      finding.execution_status === 'INVALID'
      && finding.severity === 'CRITICAL'
      && AUTHORITY_RULE_IDS.has(finding.rule_id)
    ) {
      return {
        outcome: DECISION_OUTCOMES.ESCALATE,
        reason: `Governance approval required under ${finding.rule_id}.`,
        decidingFindings: [finding],
        decidingObligations: [],
      };
    }
  }

  for (const finding of blocked) {
    if (finding.execution_status === 'NOT EVALUABLE' && finding.rule_id === 'ES-REQ-001') {
      return {
        outcome: DECISION_OUTCOMES.ESCALATE,
        reason: 'Accountable executive authority cannot be established.',
        decidingFindings: [finding],
        decidingObligations: [],
      };
    }
  }

  const criticalInvalid = blocked.filter(
    (finding) => finding.execution_status === 'INVALID' && finding.severity === 'CRITICAL',
  );
  if (criticalInvalid.length >= 2) {
    return {
      outcome: DECISION_OUTCOMES.ESCALATE,
      reason: 'Unresolved critical validation conflicts require executive review.',
      decidingFindings: criticalInvalid,
      decidingObligations: [],
    };
  }

  const requiredReady = required.every(isRequiredEvidenceSatisfied);
  const proceedGate =
    hasOrganizationProfile(reasoning)
    && !hasFalseVerifiedEvidence(evidence)
    && !validation?.summary?.blocked
    && requiredReady
    && outlook?.status === 'READY';

  if (proceedGate) {
    return {
      outcome: DECISION_OUTCOMES.PROCEED,
      reason:
        'Current execution can continue because no execution blockers were identified from the available verified information.',
      decidingFindings: [],
      decidingObligations: required.filter(isRequiredEvidenceSatisfied),
    };
  }

  if (
    required.some(
      (obligation) =>
        obligation.verification === 'MISSING'
        || obligation.evidence_result === 'UNSATISFIED'
        || obligation.evidence_result === INSUFFICIENT_BASIS,
    )
  ) {
    const decidingObligations = required.filter(
      (obligation) =>
        obligation.verification === 'MISSING'
        || obligation.evidence_result === 'UNSATISFIED'
        || obligation.evidence_result === INSUFFICIENT_BASIS,
    );
    return {
      outcome: DECISION_OUTCOMES.HOLD,
      reason: 'Execution cannot continue because required evidence is missing.',
      decidingFindings: blocked,
      decidingObligations,
    };
  }

  if (validation?.summary?.blocked) {
    return {
      outcome: DECISION_OUTCOMES.HOLD,
      reason: 'Execution cannot continue because open validation issues must be resolved first.',
      decidingFindings: blocked,
      decidingObligations: required,
    };
  }

  if (outlook?.status !== 'READY') {
    return {
      outcome: DECISION_OUTCOMES.HOLD,
      reason: 'Execution cannot continue because execution readiness is not established.',
      decidingFindings: blocked,
      decidingObligations: required,
    };
  }

  return {
    outcome: DECISION_OUTCOMES.HOLD,
    reason: 'Execution cannot continue because additional resolution is required before proceeding.',
    decidingFindings: blocked,
    decidingObligations: required,
  };
}

/**
 * @param {DecisionOutcome} outcome
 * @param {object[]} decidingFindings
 * @param {object[]} decidingObligations
 * @param {object} outlook
 * @param {object} validation
 * @returns {object[]}
 */
function buildRequiredActions(outcome, decidingFindings, decidingObligations, outlook, validation) {
  if (outcome === DECISION_OUTCOMES.PROCEED) {
    return [
      {
        action_id: 'action-proceed-001',
        text: 'Proceed under the stated execution assumptions.',
        references: outlook?.scenario?.scenario_id ? [outlook.scenario.scenario_id] : [],
      },
    ];
  }

  const actions = [];
  let actionIndex = 0;

  decidingObligations.forEach((obligation) => {
    actionIndex += 1;
    actions.push({
      action_id: `action-${String(actionIndex).padStart(3, '0')}`,
      text: `Provide proof for obligation ${obligation.obligation_id}: ${obligation.obligation_text}`,
      references: [obligation.obligation_id, obligation.finding_id, obligation.rule_id],
    });
  });

  decidingFindings.forEach((finding) => {
    actionIndex += 1;
    actions.push({
      action_id: `action-${String(actionIndex).padStart(3, '0')}`,
      text: `Resolve finding ${finding.finding_id} under rule ${finding.rule_id}.`,
      references: [finding.finding_id, finding.claim_id, finding.rule_id],
    });
  });

  if (outcome === DECISION_OUTCOMES.ESCALATE) {
    actionIndex += 1;
    actions.push({
      action_id: `action-${String(actionIndex).padStart(3, '0')}`,
      text: 'Route to executive sponsor or governing authority for approval.',
      references: decidingFindings.map((finding) => finding.finding_id),
    });
  }

  if (!actions.length && validation?.summary?.blocked) {
    actions.push({
      action_id: 'action-001',
      text: 'Resolve blocking validation findings before re-evaluation.',
      references: validation.summary.blockedClaims ?? [],
    });
  }

  return actions;
}

/**
 * @param {DecisionOutcome} outcome
 * @param {object[]} decidingFindings
 * @param {object[]} decidingObligations
 * @param {object} outlook
 * @returns {object[]}
 */
function buildReEvaluationConditions(outcome, decidingFindings, decidingObligations, outlook) {
  if (outcome === DECISION_OUTCOMES.PROCEED) {
    return (outlook?.invalid_conditions ?? []).map((condition) => ({
      condition_id: condition.condition_id,
      text: condition.text,
      references: [...(condition.references ?? [])],
    }));
  }

  const conditions = [];

  decidingFindings.forEach((finding) => {
    conditions.push({
      condition_id: `reeval-${finding.finding_id}`,
      text: `Finding ${finding.finding_id} must change from ${finding.execution_status} before re-evaluation.`,
      references: [finding.finding_id, finding.claim_id, finding.rule_id],
    });
  });

  decidingObligations.forEach((obligation) => {
    conditions.push({
      condition_id: `reeval-${obligation.obligation_id}`,
      text: `Obligation ${obligation.obligation_id} must reach VERIFIED and SATISFIED before re-evaluation.`,
      references: [obligation.obligation_id, obligation.finding_id],
    });
  });

  if (!conditions.length && outlook?.status !== 'READY') {
    conditions.push({
      condition_id: 'reeval-outlook-ready',
      text: 'Execution outlook must reach READY before re-evaluation.',
      references: outlook?.scenario?.scenario_id ? [outlook.scenario.scenario_id] : [],
    });
  }

  return conditions;
}

/**
 * @param {DecisionOutcome} outcome
 * @param {string} reason
 * @param {object[]} decidingFindings
 * @param {object[]} decidingObligations
 * @param {object} outlook
 * @param {object} reasoning
 * @returns {object[]}
 */
function buildBecause(outcome, reason, decidingFindings, decidingObligations, outlook, reasoning) {
  const because = [];
  let index = 0;

  because.push({
    factor_id: `because-${String(++index).padStart(3, '0')}`,
    text: reason,
    references: [
      ...(outlook?.scenario?.scenario_id ? [outlook.scenario.scenario_id] : []),
    ],
  });

  decidingFindings.forEach((finding) => {
    because.push({
      factor_id: `because-${String(++index).padStart(3, '0')}`,
      text: finding.explanation,
      references: [finding.finding_id, finding.claim_id, finding.rule_id],
    });
  });

  decidingObligations.forEach((obligation) => {
    because.push({
      factor_id: `because-${String(++index).padStart(3, '0')}`,
      text: obligation.explanation,
      references: [obligation.obligation_id, obligation.finding_id, obligation.rule_id],
    });
  });

  if (outcome === DECISION_OUTCOMES.PROCEED && outlook?.confidence) {
    because.push({
      factor_id: `because-${String(++index).padStart(3, '0')}`,
      text: `Execution outlook confidence is ${outlook.confidence}.`,
      references: [outlook.scenario?.scenario_id ?? 'outlook-scenario-001'],
    });
  }

  const claimIds = new Set([
    ...decidingFindings.map((finding) => finding.claim_id),
    ...(reasoning?.claims ?? []).map((claim) => claim.id),
  ]);

  return { because, claimIds };
}

/**
 * @param {object} reasoning
 * @param {object} validation
 * @param {object} evidence
 * @param {object} outlook
 * @returns {object}
 */
export function runDecision(reasoning, validation, evidence, outlook) {
  const resolved = resolveOutcome(reasoning, validation, evidence, outlook);
  const outlookId = outlook?.scenario?.scenario_id ?? null;

  const supportingFindings = [
    ...new Set(
      [
        ...resolved.decidingFindings,
        ...(validation?.findings ?? []).filter((finding) => finding.execution_status === 'VALID'),
      ].map((finding) => finding.finding_id),
    ),
  ];

  const supportingEvidence = [
    ...new Set((evidence?.obligations ?? []).map((obligation) => obligation.obligation_id)),
  ];

  const { because, claimIds } = buildBecause(
    resolved.outcome,
    resolved.reason,
    resolved.decidingFindings,
    resolved.decidingObligations,
    outlook,
    reasoning,
  );

  const supportingClaims = [...claimIds].filter(Boolean);

  const required_actions = buildRequiredActions(
    resolved.outcome,
    resolved.decidingFindings,
    resolved.decidingObligations,
    outlook,
    validation,
  );

  const re_evaluation_conditions = buildReEvaluationConditions(
    resolved.outcome,
    resolved.decidingFindings,
    resolved.decidingObligations,
    outlook,
  );

  return {
    summary: {
      decision: resolved.outcome,
      reason: resolved.reason,
      outlook_id: outlookId,
      supporting_claims: supportingClaims,
      supporting_findings: supportingFindings,
      supporting_evidence: supportingEvidence,
      required_actions_count: required_actions.length,
      re_evaluation_conditions_count: re_evaluation_conditions.length,
    },
    decision: resolved.outcome,
    because,
    supporting_claims: supportingClaims,
    supporting_findings: supportingFindings,
    supporting_evidence: supportingEvidence,
    required_actions,
    re_evaluation_conditions,
  };
}
