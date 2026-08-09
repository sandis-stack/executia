/**
 * Engine · AccountingIntent
 * Provider-neutral accounting synchronization payload.
 * No Fiken / Tripletex / Visma terminology.
 */

/**
 * @typedef {object} AccountingIntent
 * @property {string} executionObjectId
 * @property {string} counterparty
 * @property {string|null} documentDate
 * @property {string|null} dueDate
 * @property {number|null} grossAmount
 * @property {number|null} netAmount
 * @property {number|null} vatAmount
 * @property {object} vatTreatment
 * @property {object} classification
 * @property {object} evidenceReference
 * @property {object|null} paymentTruth
 * @property {string} currency
 * @property {string} intent
 */

/**
 * Build AccountingIntent from an execution object and Engine consequences.
 * Decision logic stays in the Engine — adapters only translate.
 */
export function createAccountingIntent(invoice, accountingConsequence = null, paymentConsequence = null) {
  const accounting = accountingConsequence || invoice.consequences?.accounting || {};
  const payment = paymentConsequence || invoice.consequences?.payment || null;
  const documentDate =
    (invoice.document?.storedAt || invoice.createdAt || '').slice(0, 10) || null;

  return {
    executionObjectId: invoice.id,
    counterparty: invoice.supplier || accounting.supplier || '',
    documentDate,
    dueDate: invoice.dueDate || accounting.dueDate || null,
    grossAmount: accounting.gross != null ? Number(accounting.gross) : invoice.amount,
    netAmount: accounting.net != null ? Number(accounting.net) : null,
    vatAmount: accounting.vatAmount != null ? Number(accounting.vatAmount) : invoice.vat?.amount,
    vatTreatment: {
      rate: accounting.vatRate != null ? Number(accounting.vatRate) : invoice.vat?.rate,
      amount: accounting.vatAmount != null ? Number(accounting.vatAmount) : invoice.vat?.amount,
      context: invoice.context || accounting.context || null,
    },
    classification: {
      context: invoice.context || accounting.context || null,
      expenseCategory: invoice.expenseCategory || null,
      executionContext: accounting.executionContext || invoice.executionContext || null,
      lines: accounting.lines || [],
    },
    evidenceReference: {
      evidenceId: invoice.document?.id || accounting.evidenceId || null,
      documentName: invoice.document?.name || null,
      mimeType: invoice.document?.mimeType || null,
      contentHash: invoice.document?.contentHash || null,
    },
    paymentTruth: payment
      ? {
          status: payment.status || null,
          bankConfirmed: Boolean(payment.bankConfirmed),
          transactionId: payment.transactionId || null,
          amount: payment.amount != null ? Number(payment.amount) : null,
          currency: payment.currency || invoice.currency || null,
        }
      : invoice.paymentTruth
        ? {
            status: invoice.paymentTruth.status,
            bankConfirmed: invoice.paymentTruth.status === 'booked',
            transactionId: invoice.paymentTruth.transactionId || null,
            amount: invoice.paymentTruth.amount,
            currency: invoice.paymentTruth.currency,
          }
        : null,
    currency: invoice.currency || accounting.currency || 'NOK',
    intent: accounting.intent || 'record_supplier_invoice',
  };
}

/**
 * Whether Engine requests external accounting synchronization for this execution.
 * Personal context is not an accounting-system write — not adapter logic.
 */
export function accountingSyncRequested(invoice) {
  return invoice?.context === 'business';
}
