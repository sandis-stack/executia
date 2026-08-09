/**
 * Engine · Invoice execution object
 * Canonical fields only — no vendor-specific shape.
 */

export const INVOICE_STATES = {
  RECEIVED: 'received',
  EVIDENCE_CAPTURED: 'evidence_captured',
  CLASSIFYING: 'classifying',
  NEEDS_DECISION: 'needs_decision',
  EXECUTING: 'executing',
  COMPLETE: 'complete',
};

export const EVIDENCE_STATUS = {
  MISSING: 'missing',
  CAPTURED: 'captured',
  VERIFIED: 'verified',
};

export const SYNC_STATUS = {
  NOT_REQUIRED: 'not_required',
  PENDING: 'pending',
  SYNCED: 'synced',
  FAILED: 'failed',
  STUBBED: 'stubbed',
};

/**
 * @param {object} input
 * @returns {object} invoice execution object
 */
export function createInvoice(input = {}) {
  const now = new Date().toISOString();
  return {
    id: input.id || `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    type: 'invoice',
    source: input.source || 'upload',
    document: input.document || null,
    supplier: input.supplier || '',
    amount: input.amount != null ? Number(input.amount) : null,
    currency: input.currency || 'EUR',
    vat: {
      amount: input.vatAmount != null ? Number(input.vatAmount) : null,
      rate: input.vatRate != null ? Number(input.vatRate) : null,
    },
    dueDate: input.dueDate || null,
    context: input.context || null, // 'business' | 'personal' | null
    expenseCategory: input.expenseCategory || null,
    recurring: input.recurring != null ? input.recurring : null,
    executionContext: input.executionContext || {
      vehicle: null,
      project: null,
      property: null,
      costCentre: null,
      paymentMethod: null,
      deadlineBehaviour: null,
      subscription: null,
      customer: null,
      employee: null,
    },
    learning: input.learning || { applied: [], confirmed: [] },
    memory: input.memory || { restored: [] },
    state: INVOICE_STATES.RECEIVED,
    evidenceStatus: EVIDENCE_STATUS.MISSING,
    synchronizationStatus: SYNC_STATUS.NOT_REQUIRED,
    decisions: [],
    pendingDecision: null,
    consequences: {
      vat: null,
      accounting: null,
      payment: null,
      forecast: null,
    },
    sync: {
      accounting: null,
      government: null,
    },
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
}

export function touch(invoice, patch = {}) {
  return {
    ...invoice,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
}
