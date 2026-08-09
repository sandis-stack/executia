/**
 * Engine · Learning v0.1
 * Confirmed truth only. Purpose: silence, not intelligence.
 */

import {
  applySupplierLearning,
  confirmKnownCounterparty,
  confirmSupplierContext,
  canLearnSupplierSubject,
} from './supplier-learning.js';
import {
  applyClassificationLearning,
  confirmExpenseCategory,
  confirmRecurring,
  confirmVatTreatment,
} from './classification-learning.js';

export {
  bandForConfidence,
  shouldInterrupt,
  shouldApplySilently,
  CONFIDENCE_BAND,
} from './confidence.js';
export { getRule, listRules, clearRules, resetActiveStore, createMemoryStore, setActiveStore } from './rules-store.js';

/**
 * Ask: will this confirmation reduce future administration?
 * If not — do not store.
 */
export function willReduceFutureAdministration({ decisionType, optionId, invoice }) {
  if (!invoice) return false;
  if (optionId === 'resume' || optionId === 'set_later' || optionId === 'hold') return false;
  if (decisionType === 'supplier' && optionId === 'accept_unknown') return false;
  // Learn context only — never payment consent (each payable is a new obligation)
  if (decisionType === 'approve_payment') return false;
  if (decisionType === 'context') {
    return canLearnSupplierSubject(invoice.supplier);
  }
  return false;
}

/**
 * Apply all silent learned truth before asking for decisions.
 */
export function applyLearnedTruth(invoice) {
  const fromSupplier = applySupplierLearning(invoice);
  const fromClass = applyClassificationLearning(fromSupplier.invoice);
  const applied = [...fromSupplier.applied, ...fromClass.applied];
  return {
    ...fromClass.invoice,
    learning: {
      ...(fromClass.invoice.learning || {}),
      applied: [...(fromClass.invoice.learning?.applied || []), ...applied],
    },
  };
}

/**
 * Persist confirmed truth after a human decision.
 * Never learns assumptions or holds.
 */
export function confirmFromDecision(invoice, decisionType, optionId, extras = {}) {
  if (!willReduceFutureAdministration({ decisionType, optionId, invoice })) {
    return { learned: [], skipped: true };
  }

  const at = new Date().toISOString();
  const learned = [];
  const supplier = invoice.supplier;

  if (decisionType === 'context') {
    const rule = confirmSupplierContext(supplier, optionId, at);
    if (rule) learned.push(rule);
    const counterparty = confirmKnownCounterparty(supplier, at);
    if (counterparty) learned.push(counterparty);

    // Optional classification confirmations when provided with the decision
    if (extras.expenseCategory) {
      const cat = confirmExpenseCategory(supplier, extras.expenseCategory, at);
      if (cat) learned.push(cat);
    }
    if (extras.vatTreatment) {
      const vat = confirmVatTreatment(supplier, extras.vatTreatment, at);
      if (vat) learned.push(vat);
    }
    if (extras.recurring != null) {
      const rec = confirmRecurring(supplier, extras.recurring, at);
      if (rec) learned.push(rec);
    } else if (extras.recurring === true || optionId) {
      // Netflix-style: personal + known subscription merchants can be marked by caller
    }
  }

  // When execution completes with VAT rate present and known supplier, strengthen VAT treatment
  if (extras.confirmVatFromInvoice && invoice.vat?.rate != null && canLearnSupplierSubject(supplier)) {
    const vat = confirmVatTreatment(supplier, { rate: invoice.vat.rate }, at);
    if (vat) learned.push(vat);
  }

  return { learned, skipped: false };
}

/**
 * After completion, record only document-grounded facts that reduce future admin.
 * Never learn Engine defaults or payment consent.
 * Context is confirmed only at decision time.
 */
export function confirmFromCompletedExecution(invoice) {
  if (!canLearnSupplierSubject(invoice.supplier)) return { learned: [] };
  const learned = [];
  const at = new Date().toISOString();

  const counterparty = confirmKnownCounterparty(invoice.supplier, at);
  if (counterparty) learned.push(counterparty);

  // Only explicit VAT on the object (upload / prior confirm) — never consequence defaults
  if (invoice.vat?.rate != null) {
    const vat = confirmVatTreatment(invoice.supplier, { rate: invoice.vat.rate }, at);
    if (vat) learned.push(vat);
  }

  if (invoice.expenseCategory) {
    const cat = confirmExpenseCategory(invoice.supplier, invoice.expenseCategory, at);
    if (cat) learned.push(cat);
  }

  if (invoice.recurring != null) {
    const rec = confirmRecurring(invoice.supplier, invoice.recurring, at);
    if (rec) learned.push(rec);
  }

  return { learned };
}
