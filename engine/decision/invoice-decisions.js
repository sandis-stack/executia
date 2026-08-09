/**
 * Engine · Invoice decision requirements
 * Surfaces judgement only when genuinely required.
 */

/**
 * @param {object} invoice
 * @returns {{ type: string, prompt: string, options: { id: string, label: string }[] } | null}
 */
export function nextRequiredDecision(invoice) {
  if (!invoice.context) {
    return {
      type: 'context',
      prompt: 'Business or personal?',
      options: [
        { id: 'business', label: 'Business' },
        { id: 'personal', label: 'Personal' },
      ],
    };
  }

  const supplier = String(invoice.supplier || '').trim();
  if (!supplier || /^unknown$/i.test(supplier)) {
    return {
      type: 'supplier',
      prompt: 'Supplier is unknown. Accept and continue?',
      options: [
        { id: 'accept_unknown', label: 'Accept unknown supplier' },
        { id: 'set_later', label: 'Hold — I will identify later' },
      ],
    };
  }

  // Bank pending/booked proves payment motion — never ask the person to reconcile
  const bankStatus = invoice.paymentTruth?.status;
  const bankProvesPayment = bankStatus === 'booked' || bankStatus === 'pending';

  // Each payable is a new obligation — but already-settled / bank-proven skip consent
  if (
    !invoice.paymentSettled &&
    !bankProvesPayment &&
    invoice.amount != null &&
    invoice.dueDate &&
    !invoice.decisions.some((d) => d.type === 'approve_payment')
  ) {
    return {
      type: 'approve_payment',
      prompt: 'Approve payment for the due date?',
      options: [
        { id: 'approve', label: 'Approve' },
        { id: 'hold', label: 'Hold payment' },
      ],
    };
  }

  return null;
}

/**
 * @param {object} invoice
 * @param {string} decisionType
 * @param {string} optionId
 */
export function applyDecision(invoice, decisionType, optionId) {
  const record = {
    type: decisionType,
    optionId,
    at: new Date().toISOString(),
  };
  const decisions = [...(invoice.decisions || []), record];
  const patch = { decisions, pendingDecision: null };

  if (decisionType === 'context') {
    patch.context = optionId;
  }
  if (decisionType === 'supplier' && optionId === 'accept_unknown') {
    patch.supplier = invoice.supplier || 'Unknown supplier';
  }
  if (decisionType === 'supplier' && optionId === 'set_later') {
    patch.pendingDecision = { type: 'supplier_hold', at: record.at };
  }
  if (decisionType === 'approve_payment' && optionId === 'hold') {
    patch.pendingDecision = { type: 'payment_hold', at: record.at };
  }
  if (decisionType === 'payment_reversed' && optionId === 'acknowledge') {
    patch.pendingDecision = null;
  }

  return { ...invoice, ...patch, updatedAt: new Date().toISOString() };
}
