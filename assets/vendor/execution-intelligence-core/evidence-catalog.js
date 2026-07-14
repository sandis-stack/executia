/**
 * Execution Standard evidence obligation catalog.
 * Authority: EXECUTIA_EXECUTION_INTELLIGENCE_MODEL.md §8
 *
 * Each entry maps one Execution Standard rule to its proof obligation class.
 * Obligations are created from validation findings — never from templates.
 */

export const EVIDENCE_OBLIGATION_CATALOG = {
  'ES-REQ-002': {
    text: 'Proof that the objective claim cites the governing mission statement.',
  },
  'ES-REQ-001': {
    text: 'Proof of accountable executive authority for named stakeholder roles.',
  },
  'ES-VAL-010': {
    text: 'Proof that declared execution constraints are governed and mission-backed.',
  },
  'ES-VAL-020': {
    text: 'Proof that execution sequencing dependencies are declared and fact-backed.',
  },
  'ES-VAL-030': {
    text: 'Proof that mission geographic scope aligns with declared organization footprint.',
  },
  'ES-CTX-010': {
    text: 'Proof that organization profile is complete for context-bound execution claims.',
  },
};

/**
 * @param {string} ruleId
 * @returns {object|null}
 */
export function obligationForRule(ruleId) {
  return EVIDENCE_OBLIGATION_CATALOG[ruleId] ?? null;
}
