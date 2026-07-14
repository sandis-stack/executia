/**
 * Execution Standard validation rules — canonical catalog.
 * Authority: EXECUTIA_EXECUTION_INTELLIGENCE_MODEL.md §7
 * Standard flow: Request → Validation → Decision → Registry → Ledger → Audit
 */

/** @typedef {'INFO'|'WARNING'|'MAJOR'|'CRITICAL'} Severity */
/** @typedef {'VALID'|'INVALID'|'NOT EVALUABLE'} ExecutionStatus */

/**
 * @param {object} claim
 * @returns {boolean}
 */
function isObjectiveClaim(claim) {
  return claim.id === 'claim-mission-objective';
}

/**
 * @param {object} claim
 * @returns {boolean}
 */
function isConstraintClaim(claim) {
  return claim.id.startsWith('claim-constraint-');
}

/**
 * @param {object} claim
 * @returns {boolean}
 */
function isStakeholderClaim(claim) {
  return claim.id.startsWith('claim-stakeholder-');
}

/**
 * @param {object} claim
 * @returns {boolean}
 */
function isDependencyClaim(claim) {
  return claim.id.startsWith('claim-dependency-');
}

/**
 * @param {object} claim
 * @returns {boolean}
 */
function isBindingClaim(claim) {
  return claim.id.startsWith('claim-binding-');
}

/**
 * @param {object} claim
 * @returns {boolean}
 */
function isOrgProfileClaim(claim) {
  return claim.id === 'claim-org-profile-bound';
}

function stakeholderRole(claim) {
  const match = claim.statement.match(/role: (.+)\.$/);
  return match ? match[1].trim().toLowerCase() : '';
}

function allPremisesPresent(claim, factById) {
  return (claim.premiseIds ?? []).every((id) => Boolean(factById[id]));
}

export const EXECUTION_STANDARD_RULES = [
  {
    id: 'ES-REQ-002',
    phase: 'Request',
    text: 'A declared execution objective claim must cite the mission fact.',
    appliesTo: isObjectiveClaim,
    evaluate({ claim, factById }) {
      const evaluatedAgainst = [...(claim.premiseIds ?? [])];
      if (!factById['fact-mission-statement']) {
        return {
          executionStatus: 'NOT EVALUABLE',
          severity: 'MAJOR',
          explanation: 'Mission fact is not available to evaluate the objective claim.',
          evaluatedAgainst,
        };
      }
      if (!claim.premiseIds?.includes('fact-mission-statement')) {
        return {
          executionStatus: 'INVALID',
          severity: 'CRITICAL',
          explanation: 'Objective claim does not cite the mission fact.',
          evaluatedAgainst,
        };
      }
      return {
        executionStatus: 'VALID',
        severity: 'INFO',
        explanation: 'Objective claim cites the declared mission fact.',
        evaluatedAgainst,
      };
    },
  },
  {
    id: 'ES-REQ-001',
    phase: 'Request',
    text: 'Accountable executive authority must be identifiable before execution proceeds.',
    appliesTo: isStakeholderClaim,
    evaluate({ claim, factById }) {
      const evaluatedAgainst = [...(claim.premiseIds ?? [])];
      if (!allPremisesPresent(claim, factById)) {
        return {
          executionStatus: 'NOT EVALUABLE',
          severity: 'MAJOR',
          explanation: 'Stakeholder claim premises are incomplete.',
          evaluatedAgainst,
        };
      }
      const role = stakeholderRole(claim);
      if (role === 'executive sponsor') {
        return {
          executionStatus: 'VALID',
          severity: 'INFO',
          explanation: 'Executive sponsor authority is named in the stakeholder claim.',
          evaluatedAgainst,
        };
      }
      if (role === 'sponsor') {
        return {
          executionStatus: 'VALID',
          severity: 'WARNING',
          explanation: 'Sponsor role is named; executive sponsor authority is not uniquely identified.',
          evaluatedAgainst,
        };
      }
      return {
        executionStatus: 'VALID',
        severity: 'WARNING',
        explanation: `Role "${role}" does not establish executive sponsor authority.`,
        evaluatedAgainst,
      };
    },
  },
  {
    id: 'ES-VAL-010',
    phase: 'Validation',
    text: 'Governed execution constraints declared in claims must cite mission constraint facts.',
    appliesTo: isConstraintClaim,
    evaluate({ claim, factById }) {
      const evaluatedAgainst = [...(claim.premiseIds ?? [])];
      const constraintFactId = claim.premiseIds?.find((id) => id.startsWith('fact-constraint-'));
      if (!constraintFactId || !factById[constraintFactId]) {
        return {
          executionStatus: 'NOT EVALUABLE',
          severity: 'MAJOR',
          explanation: 'Constraint fact cited by the claim is not available.',
          evaluatedAgainst,
        };
      }
      return {
        executionStatus: 'VALID',
        severity: 'INFO',
        explanation: 'Constraint claim cites a mission constraint fact under the Execution Standard validation phase.',
        evaluatedAgainst,
      };
    },
  },
  {
    id: 'ES-VAL-020',
    phase: 'Validation',
    text: 'Execution sequencing dependencies must be declared and fact-backed before proceed.',
    appliesTo: isDependencyClaim,
    evaluate({ claim, factById }) {
      const evaluatedAgainst = [...(claim.premiseIds ?? [])];
      const dependencyFactId = claim.premiseIds?.find((id) => id.startsWith('fact-dependency-'));
      if (!dependencyFactId || !factById[dependencyFactId]) {
        return {
          executionStatus: 'NOT EVALUABLE',
          severity: 'MAJOR',
          explanation: 'Dependency fact cited by the claim is not available.',
          evaluatedAgainst,
        };
      }
      return {
        executionStatus: 'VALID',
        severity: 'INFO',
        explanation: 'Dependency claim cites a mission dependency fact.',
        evaluatedAgainst,
      };
    },
  },
  {
    id: 'ES-VAL-030',
    phase: 'Validation',
    text: 'Mission geographic scope must align with declared organization footprint.',
    appliesTo: isBindingClaim,
    evaluate({ claim, factById }) {
      const evaluatedAgainst = [...(claim.premiseIds ?? [])];
      const countriesFact = factById['fact-org-countries'];
      const geoFactId = claim.premiseIds?.find((id) => id.startsWith('fact-geo-'));

      if (!countriesFact || !geoFactId || !factById[geoFactId]) {
        return {
          executionStatus: 'NOT EVALUABLE',
          severity: 'MAJOR',
          explanation: 'Geography or organization footprint facts required for binding validation are missing.',
          evaluatedAgainst,
        };
      }

      const countries = Number(countriesFact.value);
      if (!Number.isFinite(countries)) {
        return {
          executionStatus: 'NOT EVALUABLE',
          severity: 'MAJOR',
          explanation: 'Organization country footprint is not a evaluable numeric fact.',
          evaluatedAgainst,
        };
      }

      if (countries <= 1 && claim.statement.includes('while organization declares operations in 1 country')) {
        return {
          executionStatus: 'INVALID',
          severity: 'CRITICAL',
          explanation: 'Mission geography exceeds declared single-country organization footprint.',
          evaluatedAgainst,
        };
      }

      if (countries > 1) {
        return {
          executionStatus: 'VALID',
          severity: 'WARNING',
          explanation: 'Multi-country footprint requires explicit authority mapping for referenced geography.',
          evaluatedAgainst,
        };
      }

      return {
        executionStatus: 'VALID',
        severity: 'INFO',
        explanation: 'Geographic binding claim is consistent with declared footprint.',
        evaluatedAgainst,
      };
    },
  },
  {
    id: 'ES-CTX-010',
    phase: 'Validation',
    text: 'Organization profile must be complete before context-bound execution claims are valid.',
    appliesTo: isOrgProfileClaim,
    evaluate({ claim, executionContext, factById }) {
      const evaluatedAgainst = [
        ...(claim.premiseIds ?? []),
        'fact-context-completeness',
      ].filter((id, index, list) => list.indexOf(id) === index);

      if (!factById['fact-context-completeness']) {
        return {
          executionStatus: 'NOT EVALUABLE',
          severity: 'MAJOR',
          explanation: 'Execution context completeness fact is not available.',
          evaluatedAgainst,
        };
      }

      if (executionContext?.completeness === 'complete') {
        return {
          executionStatus: 'VALID',
          severity: 'INFO',
          explanation: 'Organization profile is complete for context-bound reasoning.',
          evaluatedAgainst,
        };
      }

      if (executionContext?.completeness === 'partial') {
        return {
          executionStatus: 'INVALID',
          severity: 'MAJOR',
          explanation: 'Organization profile is partial; context-bound claim cannot be fully validated.',
          evaluatedAgainst,
        };
      }

      return {
        executionStatus: 'INVALID',
        severity: 'CRITICAL',
        explanation: 'Organization profile is missing; context-bound claim is not valid.',
        evaluatedAgainst,
      };
    },
  },
];

/**
 * @param {object} claim
 * @returns {object[]}
 */
export function rulesForClaim(claim) {
  return EXECUTION_STANDARD_RULES.filter((rule) => rule.appliesTo(claim));
}
