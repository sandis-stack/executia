/**
 * Engine · Classification learning
 * Expense category, VAT treatment, recurring subscriptions.
 * Never learns payment consent — each payable is a new obligation.
 */

import { getRule, putRule } from './rules-store.js';
import {
  createRule,
  replaceWithContradiction,
  shouldApplySilently,
  strengthen,
} from './confidence.js';
import { canLearnSupplierSubject, normalizeSupplierKey } from './supplier-learning.js';

export const RULE_KINDS = {
  EXPENSE_CATEGORY: 'expense_category',
  VAT_TREATMENT: 'vat_treatment',
  RECURRING: 'recurring',
};

function confirmValue(kind, supplier, value, at) {
  if (!canLearnSupplierSubject(supplier)) return null;
  if (value == null || value === '') return null;
  const key = normalizeSupplierKey(supplier);
  const existing = getRule(kind, key);
  if (!existing) {
    return putRule(createRule({ kind, key, value, at }));
  }
  if (JSON.stringify(existing.value) === JSON.stringify(value)) {
    return putRule(strengthen(existing, at));
  }
  return putRule(replaceWithContradiction(existing, value, at));
}

export function confirmExpenseCategory(supplier, category, at = new Date().toISOString()) {
  return confirmValue(RULE_KINDS.EXPENSE_CATEGORY, supplier, category, at);
}

export function confirmVatTreatment(supplier, treatment, at = new Date().toISOString()) {
  // treatment: { rate } or { deductible: boolean, rate }
  return confirmValue(RULE_KINDS.VAT_TREATMENT, supplier, treatment, at);
}

/**
 * @deprecated Payment consent must never be learned. Kept as no-op for API stability.
 */
export function confirmPaymentBehaviour() {
  return null;
}

export function confirmRecurring(supplier, recurring, at = new Date().toISOString()) {
  // recurring: true | false | { cadence: 'monthly' }
  return confirmValue(RULE_KINDS.RECURRING, supplier, recurring, at);
}

/**
 * Apply classification rules silently when confidence allows.
 * @returns {{ invoice: object, applied: object[] }}
 */
export function applyClassificationLearning(invoice) {
  const applied = [];
  let next = { ...invoice };
  if (!canLearnSupplierSubject(next.supplier)) {
    return { invoice: next, applied };
  }

  const key = normalizeSupplierKey(next.supplier);

  // VAT treatment
  if (next.vat?.rate == null) {
    const vatRule = getRule(RULE_KINDS.VAT_TREATMENT, key);
    if (shouldApplySilently(vatRule) && vatRule.value?.rate != null) {
      next = {
        ...next,
        vat: { ...next.vat, rate: vatRule.value.rate },
      };
      applied.push({
        kind: RULE_KINDS.VAT_TREATMENT,
        key,
        value: vatRule.value,
        confidence: vatRule.confidence,
        source: 'learning',
      });
    }
  }

  // Expense category → stored on invoice for accounting consequence later
  if (!next.expenseCategory) {
    const catRule = getRule(RULE_KINDS.EXPENSE_CATEGORY, key);
    if (shouldApplySilently(catRule)) {
      next.expenseCategory = catRule.value;
      applied.push({
        kind: RULE_KINDS.EXPENSE_CATEGORY,
        key,
        value: catRule.value,
        confidence: catRule.confidence,
        source: 'learning',
      });
    }
  }

  // Recurring flag
  if (next.recurring == null) {
    const recRule = getRule(RULE_KINDS.RECURRING, key);
    if (shouldApplySilently(recRule)) {
      next.recurring = recRule.value;
      applied.push({
        kind: RULE_KINDS.RECURRING,
        key,
        value: recRule.value,
        confidence: recRule.confidence,
        source: 'learning',
      });
    }
  }

  // Never auto-approve payment from Learning — consent is not learnable

  return { invoice: next, applied };
}
