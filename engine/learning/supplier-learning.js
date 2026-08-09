/**
 * Engine · Supplier / merchant / counterparty learning
 * Learns only from confirmed execution.
 */

import { getRule, putRule } from './rules-store.js';
import {
  createRule,
  replaceWithContradiction,
  shouldApplySilently,
  strengthen,
} from './confidence.js';

export const RULE_KINDS = {
  CONTEXT: 'context', // business | personal
  COUNTERPARTY: 'counterparty', // known supplier identity
  MERCHANT: 'merchant', // alias of supplier key
};

export function normalizeSupplierKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function isUnknownSupplier(name) {
  const key = normalizeSupplierKey(name);
  return !key || key === 'unknown' || key === 'unknown supplier';
}

/**
 * Product test: confirmation must reduce future administration.
 */
export function canLearnSupplierSubject(supplier) {
  return !isUnknownSupplier(supplier);
}

export function confirmSupplierContext(supplier, context, at = new Date().toISOString()) {
  if (!canLearnSupplierSubject(supplier)) return null;
  if (context !== 'business' && context !== 'personal') return null;

  const key = normalizeSupplierKey(supplier);
  const existing = getRule(RULE_KINDS.CONTEXT, key);

  if (!existing) {
    return putRule(createRule({ kind: RULE_KINDS.CONTEXT, key, value: context, at }));
  }
  if (existing.value === context) {
    return putRule(strengthen(existing, at));
  }
  return putRule(replaceWithContradiction(existing, context, at));
}

export function confirmKnownCounterparty(supplier, at = new Date().toISOString()) {
  if (!canLearnSupplierSubject(supplier)) return null;
  const key = normalizeSupplierKey(supplier);
  const existing = getRule(RULE_KINDS.COUNTERPARTY, key);
  if (!existing) {
    return putRule(
      createRule({
        kind: RULE_KINDS.COUNTERPARTY,
        key,
        value: String(supplier).trim(),
        at,
      }),
    );
  }
  return putRule(strengthen({ ...existing, value: String(supplier).trim() }, at));
}

/**
 * Apply silent context from confirmed supplier truth.
 * @returns {{ invoice: object, applied: object[] }}
 */
export function applySupplierLearning(invoice) {
  const applied = [];
  let next = { ...invoice };

  if (isUnknownSupplier(next.supplier)) {
    return { invoice: next, applied };
  }

  const key = normalizeSupplierKey(next.supplier);

  if (!next.context) {
    const rule = getRule(RULE_KINDS.CONTEXT, key);
    if (shouldApplySilently(rule)) {
      next.context = rule.value;
      applied.push({
        kind: RULE_KINDS.CONTEXT,
        key,
        value: rule.value,
        confidence: rule.confidence,
        band: rule.confidence >= 0.85 ? 'high' : 'medium',
        source: 'learning',
      });
    }
  }

  return { invoice: next, applied };
}
