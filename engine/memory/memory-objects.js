/**
 * Engine · Execution Memory objects
 * Rich administrative context — not decision rules alone.
 */

export const MEMORY_TYPES = {
  SUPPLIER: 'supplier',
  COUNTERPARTY: 'counterparty',
  PROJECT: 'project',
  VEHICLE: 'vehicle',
  PROPERTY: 'property',
  SUBSCRIPTION: 'subscription',
  CUSTOMER: 'customer',
  EMPLOYEE: 'employee',
};

export function normalizeMemoryKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function memoryId(type, key) {
  return `${type}::${normalizeMemoryKey(key)}`;
}

/**
 * Empty supplier memory — filled only from confirmed execution.
 */
export function createSupplierMemory({ key, displayName, at = new Date().toISOString() }) {
  return {
    type: MEMORY_TYPES.SUPPLIER,
    id: memoryId(MEMORY_TYPES.SUPPLIER, key),
    key: normalizeMemoryKey(key),
    displayName: displayName || key,
    attributes: {
      businessContext: null, // business | personal
      costCentre: null,
      expenseCategory: null,
      recurring: null,
      typicalVatRate: null,
      typicalPaymentMethod: null,
      typicalDeadlineBehaviour: null, // approve_on_due | hold
    },
    links: {
      vehicleId: null,
      projectId: null,
      propertyId: null,
      subscriptionId: null,
      customerId: null,
      employeeId: null,
      counterpartyId: null,
    },
    confidence: 0,
    confirmationCount: 0,
    executionCount: 0,
    lastConfirmed: null,
    lastChanged: at,
    createdAt: at,
  };
}

export function createEntityMemory(type, { key, displayName, attributes = {}, at = new Date().toISOString() }) {
  return {
    type,
    id: memoryId(type, key),
    key: normalizeMemoryKey(key),
    displayName: displayName || key,
    attributes: { ...attributes },
    confidence: 0,
    confirmationCount: 0,
    executionCount: 0,
    lastConfirmed: null,
    lastChanged: at,
    createdAt: at,
  };
}
