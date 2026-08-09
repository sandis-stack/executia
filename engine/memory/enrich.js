/**
 * Engine · Memory enrichment
 * Every completed confirmed execution may enrich Memory.
 * Never from assumptions.
 */

import {
  FIRST_CONFIRM_CONFIDENCE,
  CONFIRM_STEP,
  MAX_CONFIDENCE,
  CONTRADICTION_CONFIDENCE,
} from '../learning/confidence.js';
import {
  MEMORY_TYPES,
  createEntityMemory,
  createSupplierMemory,
  memoryId,
} from './memory-objects.js';
import { getMemoryRecord, putMemoryRecord } from './memory-store.js';
import { canLearnSupplierSubject, normalizeSupplierKey } from '../learning/supplier-learning.js';

function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function strengthenProfile(record, at) {
  const count = (record.confirmationCount || 0) + 1;
  const confidence =
    count === 1
      ? FIRST_CONFIRM_CONFIDENCE
      : Math.min(
          MAX_CONFIDENCE,
          Math.round(((Number(record.confidence) || FIRST_CONFIRM_CONFIDENCE) + CONFIRM_STEP) * 100) / 100,
        );
  return {
    ...record,
    confidence,
    confirmationCount: count,
    lastConfirmed: at,
  };
}

function ensureEntity(type, name, attributes, at) {
  if (!name) return null;
  const id = memoryId(type, name);
  let record = getMemoryRecord(id);
  if (!record) {
    record = createEntityMemory(type, {
      key: name,
      displayName: name,
      attributes,
      at,
    });
    record.confidence = FIRST_CONFIRM_CONFIDENCE;
    record.confirmationCount = 1;
    record.executionCount = 1;
    record.lastConfirmed = at;
    return putMemoryRecord(record);
  }
  let next = {
    ...record,
    displayName: name,
    attributes: { ...record.attributes, ...attributes },
    executionCount: (record.executionCount || 0) + 1,
  };
  next = strengthenProfile(next, at);
  return putMemoryRecord(next);
}

/**
 * Build confirmed patch from invoice + decision extras.
 * Only explicit confirmed fields — never Engine VAT defaults.
 */
export function extractConfirmedContext(invoice, extras = {}) {
  const ec = { ...(invoice.executionContext || {}), ...(extras.executionContext || {}) };
  const patch = {};

  if (invoice.context) patch.businessContext = invoice.context;
  if (extras.context) patch.businessContext = extras.context;

  if (invoice.expenseCategory || extras.expenseCategory) {
    patch.expenseCategory = extras.expenseCategory || invoice.expenseCategory;
  }
  if (invoice.recurring != null || extras.recurring != null) {
    patch.recurring = extras.recurring != null ? extras.recurring : invoice.recurring;
  }
  if (invoice.vat?.rate != null) patch.typicalVatRate = invoice.vat.rate;
  if (extras.vatTreatment?.rate != null) patch.typicalVatRate = extras.vatTreatment.rate;

  if (ec.costCentre || extras.costCentre) patch.costCentre = extras.costCentre || ec.costCentre;
  if (ec.paymentMethod || extras.paymentMethod) {
    patch.typicalPaymentMethod = extras.paymentMethod || ec.paymentMethod;
  }
  if (ec.deadlineBehaviour || extras.deadlineBehaviour) {
    patch.typicalDeadlineBehaviour = extras.deadlineBehaviour || ec.deadlineBehaviour;
  }

  if (ec.vehicle || extras.vehicle) patch.vehicle = extras.vehicle || ec.vehicle;
  if (ec.project || extras.project) patch.project = extras.project || ec.project;
  if (ec.property || extras.property) patch.property = extras.property || ec.property;
  if (ec.subscription || extras.subscription) patch.subscription = extras.subscription || ec.subscription;
  if (ec.customer || extras.customer) patch.customer = extras.customer || ec.customer;
  if (ec.employee || extras.employee) patch.employee = extras.employee || ec.employee;

  return patch;
}

/**
 * Enrich Memory from a confirmed decision payload (extras).
 */
export function enrichFromConfirmedDecision(invoice, decisionType, optionId, extras = {}) {
  if (!canLearnSupplierSubject(invoice.supplier)) return { enriched: [] };
  if (optionId === 'hold' || optionId === 'set_later' || optionId === 'resume') {
    return { enriched: [], skipped: true };
  }
  if (decisionType === 'supplier' && optionId === 'accept_unknown') {
    return { enriched: [], skipped: true };
  }

  const at = new Date().toISOString();
  const patch = extractConfirmedContext(invoice, {
    ...extras,
    context: decisionType === 'context' ? optionId : extras.context,
  });

  if (decisionType === 'approve_payment' && optionId === 'approve') {
    patch.typicalDeadlineBehaviour = patch.typicalDeadlineBehaviour || 'approve_on_due';
  }

  return writeSupplierEnrichment(invoice.supplier, patch, at, { bumpExecution: false });
}

/**
 * Every completed execution enriches Memory (confirmed fields only).
 */
export function enrichFromCompletedExecution(invoice) {
  if (!canLearnSupplierSubject(invoice.supplier)) return { enriched: [] };
  if (invoice.state !== 'complete') return { enriched: [], skipped: true };

  const at = new Date().toISOString();
  const patch = extractConfirmedContext(invoice, {});

  const approved = (invoice.decisions || []).some(
    (d) => d.type === 'approve_payment' && d.optionId === 'approve',
  );
  if (approved) patch.typicalDeadlineBehaviour = patch.typicalDeadlineBehaviour || 'approve_on_due';

  return writeSupplierEnrichment(invoice.supplier, patch, at, { bumpExecution: true });
}

function writeSupplierEnrichment(supplier, patch, at, { bumpExecution }) {
  const key = normalizeSupplierKey(supplier);
  const id = memoryId(MEMORY_TYPES.SUPPLIER, key);
  let record = getMemoryRecord(id) || createSupplierMemory({ key, displayName: supplier, at });

  const enriched = [];
  let contradicted = false;
  const attributes = { ...record.attributes };
  const links = { ...record.links };

  const attrMap = [
    ['businessContext', patch.businessContext],
    ['costCentre', patch.costCentre],
    ['expenseCategory', patch.expenseCategory],
    ['recurring', patch.recurring],
    ['typicalVatRate', patch.typicalVatRate],
    ['typicalPaymentMethod', patch.typicalPaymentMethod],
    ['typicalDeadlineBehaviour', patch.typicalDeadlineBehaviour],
  ];

  for (const [field, value] of attrMap) {
    if (value == null) continue;
    if (attributes[field] == null) {
      attributes[field] = value;
    } else if (!same(attributes[field], value)) {
      attributes[field] = value;
      contradicted = true;
    }
  }

  const entitySpecs = [
    [MEMORY_TYPES.VEHICLE, patch.vehicle, 'vehicleId'],
    [MEMORY_TYPES.PROJECT, patch.project, 'projectId'],
    [MEMORY_TYPES.PROPERTY, patch.property, 'propertyId'],
    [MEMORY_TYPES.SUBSCRIPTION, patch.subscription, 'subscriptionId'],
    [MEMORY_TYPES.CUSTOMER, patch.customer, 'customerId'],
    [MEMORY_TYPES.EMPLOYEE, patch.employee, 'employeeId'],
  ];

  for (const [type, name, linkField] of entitySpecs) {
    if (!name) continue;
    const entityAttrs =
      type === MEMORY_TYPES.PROJECT && patch.costCentre ? { costCentre: patch.costCentre } : {};
    const entity = ensureEntity(type, name, entityAttrs, at);
    if (entity) {
      if (links[linkField] && links[linkField] !== entity.id) contradicted = true;
      links[linkField] = entity.id;
      enriched.push(entity);
    }
  }

  const counterparty = ensureEntity(MEMORY_TYPES.COUNTERPARTY, supplier, { role: 'supplier' }, at);
  if (counterparty) {
    links.counterpartyId = counterparty.id;
    enriched.push(counterparty);
  }

  let next = {
    ...record,
    displayName: String(supplier).trim(),
    attributes,
    links,
    lastChanged: at,
  };

  if (bumpExecution) {
    next.executionCount = (record.executionCount || 0) + 1;
  }

  if (contradicted) {
    next.confidence = CONTRADICTION_CONFIDENCE;
    next.confirmationCount = 1;
    next.lastConfirmed = at;
  } else {
    next = strengthenProfile(next, at);
  }

  const saved = putMemoryRecord(next);
  enriched.unshift(saved);
  return { enriched, supplierMemory: saved };
}
