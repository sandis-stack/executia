/**
 * Execution Intelligence — Evidence Engine v1.0
 * Authority: EXECUTIA_EXECUTION_INTELLIGENCE_MODEL.md §8
 *
 * Every validation finding creates one evidence obligation.
 * Flow: Finding → Obligation → Evidence Status → Verification → Evidence Result
 *
 * Evidence never validates, never creates findings, and never infers proof.
 */

import { obligationForRule } from './evidence-catalog.js';

/** @typedef {'REQUIRED'|'OPTIONAL'|'NOT REQUIRED'} EvidenceStatus */
/** @typedef {'VERIFIED'|'MISSING'|'NOT VERIFIABLE'} Verification */
/** @typedef {'SATISFIED'|'UNSATISFIED'|'INSUFFICIENT BASIS'|'NOT APPLICABLE'} EvidenceResult */

/**
 * @param {object} finding
 * @returns {EvidenceStatus}
 */
function evidenceStatusForFinding(finding) {
  if (finding.execution_status === 'INVALID' || finding.execution_status === 'NOT EVALUABLE') {
    return 'REQUIRED';
  }
  if (finding.severity === 'WARNING') {
    return 'OPTIONAL';
  }
  return 'NOT REQUIRED';
}

/**
 * @param {object[]} facts
 * @param {object} finding
 * @returns {object[]}
 */
function findAttachedProof(facts, finding) {
  return facts.filter((fact) => {
    if (fact.type !== 'proof_artifact') {
      return false;
    }
    if (fact.finding_id === finding.finding_id) {
      return true;
    }
    if (fact.claim_id === finding.claim_id && fact.rule_id === finding.rule_id) {
      return true;
    }
    if (Array.isArray(fact.covers_findings) && fact.covers_findings.includes(finding.finding_id)) {
      return true;
    }
    return false;
  });
}

/**
 * @param {EvidenceStatus} evidenceStatus
 * @param {object} finding
 * @param {object[]} proofArtifacts
 */
function resolveVerificationAndResult(evidenceStatus, finding, proofArtifacts) {
  if (evidenceStatus === 'NOT REQUIRED') {
    return {
      verification: 'NOT VERIFIABLE',
      evidence_result: 'NOT APPLICABLE',
      explanation: 'Informational finding — no proof obligation applies under the Execution Standard.',
      proof_artifact_refs: [],
    };
  }

  if (finding.execution_status === 'NOT EVALUABLE') {
    return {
      verification: 'NOT VERIFIABLE',
      evidence_result: 'INSUFFICIENT BASIS',
      explanation: 'Finding is not evaluable; required proof cannot be verified without additional declared facts.',
      proof_artifact_refs: [],
    };
  }

  if (proofArtifacts.length > 0) {
    return {
      verification: 'VERIFIED',
      evidence_result: 'SATISFIED',
      explanation: 'Declared proof artifact satisfies the evidence obligation.',
      proof_artifact_refs: proofArtifacts.map((artifact) => artifact.id),
    };
  }

  if (evidenceStatus === 'REQUIRED') {
    return {
      verification: 'MISSING',
      evidence_result: 'UNSATISFIED',
      explanation: 'Required proof artifact is not declared in available facts.',
      proof_artifact_refs: [],
    };
  }

  return {
    verification: 'NOT VERIFIABLE',
    evidence_result: 'INSUFFICIENT BASIS',
    explanation: 'Optional proof is not declared; obligation cannot be verified without inference.',
    proof_artifact_refs: [],
  };
}

/**
 * @param {object} reasoning - Reasoning Engine output
 * @param {object} validation - Validation Engine output
 * @returns {object}
 */
export function runEvidence(reasoning, validation) {
  const facts = reasoning?.facts ?? [];
  const findings = validation?.findings ?? [];

  const obligations = findings.map((finding, index) => {
    const catalogEntry = obligationForRule(finding.rule_id);
    const evidence_status = evidenceStatusForFinding(finding);
    const proofArtifacts = findAttachedProof(facts, finding);
    const outcome = resolveVerificationAndResult(evidence_status, finding, proofArtifacts);

    return {
      obligation_id: `obligation-${String(index + 1).padStart(3, '0')}`,
      finding_id: finding.finding_id,
      rule_id: finding.rule_id,
      rule_text: finding.rule_text,
      claim_id: finding.claim_id,
      obligation_text: catalogEntry?.text ?? `Evidence obligation for Execution Standard rule ${finding.rule_id}.`,
      evidence_status,
      verification: outcome.verification,
      evidence_result: outcome.evidence_result,
      proof_artifact_refs: outcome.proof_artifact_refs,
      explanation: outcome.explanation,
    };
  });

  const satisfiedObligations = obligations
    .filter((obligation) => obligation.evidence_result === 'SATISFIED')
    .map((obligation) => obligation.obligation_id);
  const unsatisfiedObligations = obligations
    .filter((obligation) => obligation.evidence_result === 'UNSATISFIED')
    .map((obligation) => obligation.obligation_id);
  const insufficientBasisObligations = obligations
    .filter((obligation) => obligation.evidence_result === 'INSUFFICIENT BASIS')
    .map((obligation) => obligation.obligation_id);

  return {
    summary: {
      obligationsCount: obligations.length,
      evidenceStatusDistribution: countBy(obligations, (obligation) => obligation.evidence_status),
      verificationDistribution: countBy(obligations, (obligation) => obligation.verification),
      resultDistribution: countBy(obligations, (obligation) => obligation.evidence_result),
      satisfiedObligations,
      unsatisfiedObligations,
      insufficientBasisObligations,
    },
    obligations,
  };
}

/**
 * @param {object[]} items
 * @param {(item: object) => string} keyFn
 */
function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}
