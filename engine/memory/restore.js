/**
 * Engine · Memory restore
 * Never ask again if context is already known and confidence is high.
 */

import { shouldApplySilently, bandForConfidence } from '../learning/confidence.js';
import { canLearnSupplierSubject, normalizeSupplierKey } from '../learning/supplier-learning.js';
import { MEMORY_TYPES, memoryId } from './memory-objects.js';
import { getMemoryRecord } from './memory-store.js';

function entityName(id) {
  if (!id) return null;
  const record = getMemoryRecord(id);
  return record?.displayName || null;
}

/**
 * Restore full execution context onto an invoice from Supplier Memory.
 * @returns {object} invoice with memory restore metadata
 */
export function restoreExecutionMemory(invoice) {
  if (!canLearnSupplierSubject(invoice.supplier)) {
    return invoice;
  }

  const key = normalizeSupplierKey(invoice.supplier);
  const record = getMemoryRecord(memoryId(MEMORY_TYPES.SUPPLIER, key));
  if (!shouldApplySilently(record)) {
    return invoice;
  }

  const restored = [];
  let next = { ...invoice };
  const attrs = record.attributes || {};
  const links = record.links || {};
  const executionContext = { ...(next.executionContext || {}) };

  if (!next.context && attrs.businessContext) {
    next.context = attrs.businessContext;
    restored.push({ field: 'context', value: attrs.businessContext });
  }

  if (!next.expenseCategory && attrs.expenseCategory) {
    next.expenseCategory = attrs.expenseCategory;
    restored.push({ field: 'expenseCategory', value: attrs.expenseCategory });
  }

  if (next.recurring == null && attrs.recurring != null) {
    next.recurring = attrs.recurring;
    restored.push({ field: 'recurring', value: attrs.recurring });
  }

  if (next.vat?.rate == null && attrs.typicalVatRate != null) {
    next = {
      ...next,
      vat: { ...next.vat, rate: attrs.typicalVatRate },
    };
    restored.push({ field: 'vat.rate', value: attrs.typicalVatRate });
  }

  if (!executionContext.costCentre && attrs.costCentre) {
    executionContext.costCentre = attrs.costCentre;
    restored.push({ field: 'costCentre', value: attrs.costCentre });
  }

  if (!executionContext.paymentMethod && attrs.typicalPaymentMethod) {
    executionContext.paymentMethod = attrs.typicalPaymentMethod;
    restored.push({ field: 'paymentMethod', value: attrs.typicalPaymentMethod });
  }

  if (!executionContext.deadlineBehaviour && attrs.typicalDeadlineBehaviour) {
    executionContext.deadlineBehaviour = attrs.typicalDeadlineBehaviour;
    restored.push({ field: 'deadlineBehaviour', value: attrs.typicalDeadlineBehaviour });
  }

  const linkFields = [
    ['vehicleId', 'vehicle'],
    ['projectId', 'project'],
    ['propertyId', 'property'],
    ['subscriptionId', 'subscription'],
    ['customerId', 'customer'],
    ['employeeId', 'employee'],
  ];

  for (const [linkKey, field] of linkFields) {
    if (!executionContext[field] && links[linkKey]) {
      const name = entityName(links[linkKey]);
      if (name) {
        executionContext[field] = name;
        restored.push({ field, value: name });
      }
    }
  }

  // Typical deadline behaviour → skip payment decision when approve_on_due
  if (
    attrs.typicalDeadlineBehaviour === 'approve_on_due' &&
    next.amount != null &&
    next.dueDate &&
    !(next.decisions || []).some((d) => d.type === 'approve_payment')
  ) {
    next = {
      ...next,
      decisions: [
        ...(next.decisions || []),
        {
          type: 'approve_payment',
          optionId: 'approve',
          at: new Date().toISOString(),
          source: 'memory',
        },
      ],
    };
    restored.push({ field: 'approve_payment', value: 'approve' });
  }

  next.executionContext = executionContext;
  next.memory = {
    ...(next.memory || {}),
    restored,
    supplierMemoryId: record.id,
    confidence: record.confidence,
    band: bandForConfidence(record.confidence),
    executionCount: record.executionCount,
  };

  return next;
}

/**
 * Whether Memory alone can keep this invoice quiet for known context.
 */
export function memoryHasHighContext(supplier) {
  if (!canLearnSupplierSubject(supplier)) return false;
  const record = getMemoryRecord(memoryId(MEMORY_TYPES.SUPPLIER, normalizeSupplierKey(supplier)));
  return shouldApplySilently(record) && Boolean(record.attributes?.businessContext);
}
