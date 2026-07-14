/**
 * Execution Intelligence — Execution Outlook Engine v1.0
 * Authority: EXECUTIA_EXECUTION_INTELLIGENCE_MODEL.md §9
 *
 * Execution scenario from validated claims and verified evidence only.
 * Flow: Validated Claims → Verified Evidence → Assumptions → Scenario → Confidence → Invalid Conditions
 *
 * Never invents facts, assumes evidence, creates claims, validates, or decides.
 */

import { INSUFFICIENT_BASIS } from './reasoning-engine.js';

/** @typedef {'HIGH'|'MEDIUM'|'LOW'} OutlookConfidence */

const OUTLOOK_SENSITIVE_INSUFFICIENT_AREAS = new Set([
  'organization_profile',
  'geography_binding',
]);

/**
 * @param {object} validation
 * @param {object} evidence
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
function outlookGate(validation, evidence) {
  if (validation?.summary?.blocked) {
    return { ok: false, reason: 'Blocking validation findings remain unaddressed.' };
  }

  const requiredObligations = (evidence?.obligations ?? []).filter(
    (obligation) => obligation.evidence_status === 'REQUIRED',
  );

  for (const obligation of requiredObligations) {
    if (obligation.evidence_result === 'UNSATISFIED' || obligation.verification === 'MISSING') {
      return { ok: false, reason: 'Required evidence is missing.' };
    }
    if (obligation.evidence_result === INSUFFICIENT_BASIS) {
      return { ok: false, reason: 'Required evidence cannot be verified.' };
    }
    if (obligation.verification !== 'VERIFIED' || obligation.evidence_result !== 'SATISFIED') {
      return { ok: false, reason: 'Required evidence is not verified.' };
    }
  }

  const validClaims = (validation?.findings ?? []).filter(
    (finding) => finding.execution_status === 'VALID',
  );
  if (!validClaims.length) {
    return { ok: false, reason: 'No valid claims available for execution outlook.' };
  }

  return { ok: true };
}

/**
 * @param {object} reasoning
 * @param {object} validation
 * @param {object} evidence
 * @param {Set<string>} validClaimIds
 */
function deriveConfidence(reasoning, validation, evidence, validClaimIds) {
  const contextCompleteness = reasoning.executionContext?.completeness ?? 'missing';
  const verifiedCount = (evidence.obligations ?? []).filter(
    (obligation) => obligation.verification === 'VERIFIED' && obligation.evidence_result === 'SATISFIED',
  ).length;
  const requiredCount = (evidence.obligations ?? []).filter(
    (obligation) => obligation.evidence_status === 'REQUIRED',
  ).length;
  const warningFindings = (validation.findings ?? []).filter(
    (finding) => finding.severity === 'WARNING' && validClaimIds.has(finding.claim_id),
  ).length;
  const sensitiveInsufficientAreas = (reasoning.insufficientAreas ?? []).filter((area) =>
    OUTLOOK_SENSITIVE_INSUFFICIENT_AREAS.has(area.area),
  ).length;
  const optionalInsufficient = (evidence.summary?.insufficientBasisObligations ?? []).length;

  if (
    contextCompleteness === 'complete'
    && requiredCount > 0
    && verifiedCount >= requiredCount
    && !sensitiveInsufficientAreas
    && !warningFindings
  ) {
    return 'HIGH';
  }

  if (
    contextCompleteness === 'complete'
    && requiredCount === 0
    && !sensitiveInsufficientAreas
    && !warningFindings
    && !optionalInsufficient
  ) {
    return 'HIGH';
  }

  if (contextCompleteness === 'missing' || sensitiveInsufficientAreas >= 1) {
    return 'LOW';
  }

  return 'MEDIUM';
}

/**
 * @param {object} reasoning
 * @param {object} validation
 * @param {Set<string>} validClaimIds
 * @param {object[]} validatedClaims
 */
function deriveInvalidConditions(reasoning, validation, validClaimIds, validatedClaims) {
  const conditions = [];

  (reasoning.insufficientAreas ?? [])
    .filter((area) => OUTLOOK_SENSITIVE_INSUFFICIENT_AREAS.has(area.area))
    .forEach((area) => {
    conditions.push({
      condition_id: `invalid-area-${area.area}`,
      text: `Outlook invalid if ${area.area} remains ${area.status}.`,
      references: [area.area],
    });
  });

  (validation.findings ?? [])
    .filter((finding) => finding.severity === 'WARNING' && validClaimIds.has(finding.claim_id))
    .forEach((finding) => {
      conditions.push({
        condition_id: `invalid-${finding.finding_id}`,
        text: `Outlook invalid if ${finding.claim_id} outcome changes under ${finding.rule_id}.`,
        references: [finding.finding_id, finding.claim_id, finding.rule_id],
      });
    });

  validatedClaims.forEach((claim) => {
    if (claim.premiseIds?.length) {
      conditions.push({
        condition_id: `invalid-${claim.id}-premises`,
        text: `Outlook invalid if premise facts for ${claim.id} are withdrawn.`,
        references: [...claim.premiseIds],
      });
    }
  });

  if (!conditions.length) {
    return [{ condition_id: 'invalid-none', text: 'NONE IDENTIFIED', references: [] }];
  }

  return conditions;
}

/**
 * @param {object} reasoning
 * @param {object} validation
 * @param {object} evidence
 * @returns {object}
 */
export function runExecutionOutlook(reasoning, validation, evidence) {
  const gate = outlookGate(validation, evidence);
  const validFindings = (validation?.findings ?? []).filter(
    (finding) => finding.execution_status === 'VALID',
  );
  const validClaimIds = new Set(validFindings.map((finding) => finding.claim_id));
  const validatedClaims = (reasoning?.claims ?? []).filter((claim) => validClaimIds.has(claim.id));
  const verifiedObligations = (evidence?.obligations ?? []).filter(
    (obligation) => obligation.verification === 'VERIFIED' && obligation.evidence_result === 'SATISFIED',
  );
  const satisfiedObligations = (evidence?.obligations ?? []).filter(
    (obligation) => obligation.evidence_result === 'SATISFIED',
  );

  if (!gate.ok) {
    return {
      status: INSUFFICIENT_BASIS,
      summary: {
        status: INSUFFICIENT_BASIS,
        reason: gate.reason,
        validatedClaimsCount: validClaimIds.size,
        verifiedEvidenceCount: verifiedObligations.length,
        satisfiedObligationsCount: satisfiedObligations.length,
      },
      scenario: null,
      assumptions: [],
      confidence: INSUFFICIENT_BASIS,
      invalid_conditions: [],
    };
  }

  const factById = Object.fromEntries((reasoning.facts ?? []).map((fact) => [fact.id, fact]));
  const assumptionFactIds = [...new Set(validatedClaims.flatMap((claim) => claim.premiseIds ?? []))];
  const assumptions = assumptionFactIds.map((factId, index) => {
    const fact = factById[factId];
    return {
      assumption_id: `assumption-${String(index + 1).padStart(3, '0')}`,
      text: `Declared fact ${factId} remains available and unchanged.`,
      fact_id: factId,
      basis: fact?.label ?? factId,
    };
  });

  if (reasoning.executionContext?.completeness === 'complete' && factById['fact-context-completeness']) {
    assumptions.push({
      assumption_id: `assumption-${String(assumptions.length + 1).padStart(3, '0')}`,
      text: 'Organization execution context remains complete as declared.',
      fact_id: 'fact-context-completeness',
      basis: 'Execution context completeness fact',
    });
  }

  const constraints = (reasoning.intent?.constraints ?? [])
    .filter((constraint) => validClaimIds.has(`claim-${constraint.id}`))
    .map((constraint) => ({
      claim_id: `claim-${constraint.id}`,
      fact_id: `fact-${constraint.id}`,
      marker: constraint.marker,
    }));

  const dependencies = (reasoning.intent?.dependencies ?? [])
    .filter((dependency) => validClaimIds.has(`claim-${dependency.id}`))
    .map((dependency) => ({
      claim_id: `claim-${dependency.id}`,
      fact_id: `fact-${dependency.id}`,
      type: dependency.type,
      target: dependency.target,
    }));

  const reasoningReferences = (reasoning.chain ?? [])
    .filter((step) => step.claim_id && validClaimIds.has(step.claim_id))
    .map((step) => ({
      step_id: step.step_id,
      claim_id: step.claim_id,
      premises: [...(step.premises ?? [])],
    }));

  const evidenceUsed = verifiedObligations.map((obligation) => ({
    obligation_id: obligation.obligation_id,
    finding_id: obligation.finding_id,
    rule_id: obligation.rule_id,
    proof_artifact_refs: [...(obligation.proof_artifact_refs ?? [])],
  }));

  const confidence = deriveConfidence(reasoning, validation, evidence, validClaimIds);
  const invalid_conditions = deriveInvalidConditions(
    reasoning,
    validation,
    validClaimIds,
    validatedClaims,
  );

  const scenario = {
    scenario_id: 'outlook-scenario-001',
    mission_statement: reasoning.mission?.statement ?? '',
    validated_claims: validatedClaims.map((claim) => ({
      claim_id: claim.id,
      statement: claim.statement,
      premise_ids: [...(claim.premiseIds ?? [])],
    })),
    dependencies,
    constraints,
    evidence_used: evidenceUsed,
    reasoning_references: reasoningReferences,
    context_completeness: reasoning.executionContext?.completeness ?? INSUFFICIENT_BASIS,
  };

  return {
    status: 'READY',
    summary: {
      status: 'READY',
      validatedClaimsCount: validatedClaims.length,
      verifiedEvidenceCount: verifiedObligations.length,
      satisfiedObligationsCount: satisfiedObligations.length,
      assumptionsCount: assumptions.length,
      dependenciesCount: dependencies.length,
      constraintsCount: constraints.length,
      confidence,
    },
    scenario,
    assumptions,
    confidence,
    invalid_conditions,
  };
}
