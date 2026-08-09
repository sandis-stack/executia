/**
 * Translate provider-neutral AccountingIntent → Fiken purchase representation.
 * Mapping only — no classification / VAT / context decisions.
 */

/** Convert major currency units to Fiken øre/cents integers. */
export function toFikenAmount(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return null;
  return Math.round(Number(amount) * 100);
}

/**
 * Map Engine VAT rate onto Fiken vatType enum (translation table, not a decision).
 */
export function mapVatType(vatTreatment = {}) {
  const rate = Number(vatTreatment.rate);
  if (rate == null || Number.isNaN(rate) || rate === 0) return 'NONE';
  if (rate >= 20) return 'HIGH';
  if (rate >= 12) return 'MEDIUM';
  if (rate > 0) return 'LOW';
  return 'NONE';
}

/**
 * @param {object} intent AccountingIntent
 * @param {{ supplierId: number|string, expenseAccount: string }} refs
 */
export function translateIntentToFikenPurchase(intent, refs) {
  const vatType = mapVatType(intent.vatTreatment || {});
  const linesIn = intent.classification?.lines?.length
    ? intent.classification.lines
    : [
        {
          description: `Invoice ${intent.counterparty || ''}`.trim(),
          amount: intent.netAmount,
          vatAmount: intent.vatAmount,
        },
      ];

  const lines = linesIn.map((line) => {
    const net = toFikenAmount(line.amount != null ? line.amount : intent.netAmount);
    const vat = toFikenAmount(line.vatAmount != null ? line.vatAmount : intent.vatAmount) || 0;
    return {
      description: line.description || `Invoice ${intent.counterparty || ''}`.trim() || 'Expense',
      netAmount: net,
      vatAmount: vat,
      vatType,
      account: refs.expenseAccount,
    };
  });

  return {
    date: intent.documentDate || new Date().toISOString().slice(0, 10),
    kind: 'SUPPLIER_INVOICE',
    supplierId: Number(refs.supplierId),
    currency: (intent.currency || 'NOK').toUpperCase(),
    dueDate: intent.dueDate || undefined,
    identifier: `executia:${intent.executionObjectId}`,
    currencyRate: (intent.currency || 'NOK').toUpperCase() === 'NOK' ? undefined : undefined,
    lines,
    note: [
      `EXECUTIA execution ${intent.executionObjectId}`,
      intent.evidenceReference?.evidenceId ? `evidence:${intent.evidenceReference.evidenceId}` : null,
      intent.paymentTruth?.transactionId ? `payment:${intent.paymentTruth.transactionId}` : null,
    ]
      .filter(Boolean)
      .join(' · '),
  };
}

export function translateIntentToFikenContact(intent) {
  return {
    name: intent.counterparty || 'Unknown supplier',
    supplier: true,
    customer: false,
    note: `Created by EXECUTIA for execution ${intent.executionObjectId}`,
  };
}
