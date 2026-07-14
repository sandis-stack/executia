/**
 * Execution Intelligence — Validation Engine v1.0
 * Authority: EXECUTIA_EXECUTION_INTELLIGENCE_MODEL.md §7
 *
 * Validates Claims only — never the Mission directly.
 * Flow: Claim → Rule → Finding → Severity → Execution Status
 */

import { rulesForClaim } from './validation-rules.js';

/** @typedef {'INFO'|'WARNING'|'MAJOR'|'CRITICAL'} Severity */
/** @typedef {'VALID'|'INVALID'|'NOT EVALUABLE'} ExecutionStatus */

const BLOCKING_STATUSES = new Set(['INVALID', 'NOT EVALUABLE']);
const BLOCKING_SEVERITIES = new Set(['MAJOR', 'CRITICAL']);

/**
 * @param {object} reasoning - Reasoning Engine output
 * @returns {object}
 */
export function runValidation(reasoning) {
  const claims = reasoning?.claims ?? [];
  const facts = reasoning?.facts ?? [];
  const executionContext = reasoning?.executionContext ?? {};
  const intent = reasoning?.intent ?? {};
  const factById = Object.fromEntries(facts.map((fact) => [fact.id, fact]));

  const findings = [];
  const rulesApplied = new Set();
  const claimsValidated = new Set();

  claims.forEach((claim) => {
    const applicableRules = rulesForClaim(claim);
    if (!applicableRules.length) {
      return;
    }

    applicableRules.forEach((rule) => {
      rulesApplied.add(rule.id);
      claimsValidated.add(claim.id);

      const result = rule.evaluate({
        claim,
        facts,
        factById,
        executionContext,
        intent,
      });

      findings.push({
        finding_id: `finding-${String(findings.length + 1).padStart(3, '0')}`,
        claim_id: claim.id,
        rule_id: rule.id,
        rule_phase: rule.phase,
        rule_text: rule.text,
        severity: result.severity,
        execution_status: result.executionStatus,
        explanation: result.explanation,
        evaluated_against: result.evaluatedAgainst,
      });
    });
  });

  const severityDistribution = countBy(findings, (finding) => finding.severity);
  const statusDistribution = countBy(findings, (finding) => finding.execution_status);

  const blockedClaims = [...new Set(
    findings
      .filter(
        (finding) =>
          BLOCKING_STATUSES.has(finding.execution_status)
          && BLOCKING_SEVERITIES.has(finding.severity),
      )
      .map((finding) => finding.claim_id),
  )];

  return {
    summary: {
      claimsValidated: claimsValidated.size,
      rulesApplied: rulesApplied.size,
      findingsCount: findings.length,
      severityDistribution,
      statusDistribution,
      blockedClaims,
      blocked: blockedClaims.length > 0,
    },
    findings,
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
