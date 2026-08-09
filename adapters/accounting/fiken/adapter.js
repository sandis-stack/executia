/**
 * Accounting adapter · Fiken (stub)
 *
 * Translates Engine accounting-ready results for Fiken synchronization only.
 * Contains NO Engine business decisions and NO LIFE workflow logic.
 *
 * Marked STUB until real Fiken credentials/API are configured.
 */

export const adapterInfo = {
  capability: 'accounting',
  vendor: 'fiken',
  mode: 'stub',
};

/**
 * @param {object} accountingConsequence Engine-owned accounting-ready payload
 */
export async function synchronizeAccounting(accountingConsequence) {
  // Stub: do not call Fiken network. Preserve payload for inspection.
  return {
    status: 'stubbed',
    vendor: 'fiken',
    mode: 'stub',
    detail: 'Fiken adapter stub — credentials/API not configured. Engine truth preserved.',
    translated: translateToFikenShape(accountingConsequence),
    at: new Date().toISOString(),
  };
}

/**
 * Vendor translation only — mapping fields, not deciding consequences.
 */
function translateToFikenShape(payload) {
  return {
    // Illustrative Fiken-oriented shape; not a live API request
    supplierName: payload.supplier,
    currency: payload.currency,
    issueDate: null,
    dueDate: payload.dueDate,
    lines: (payload.lines || []).map((line) => ({
      description: line.description,
      net: line.amount,
      vat: line.vatAmount,
    })),
    meta: {
      intent: payload.intent,
      evidenceId: payload.evidenceId,
      context: payload.context,
    },
  };
}
