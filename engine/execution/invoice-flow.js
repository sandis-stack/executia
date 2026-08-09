/**
 * Engine · Invoice execution flow
 * Person manages no intermediate tasks — only decisions when required.
 */

import {
  INVOICE_STATES,
  SYNC_STATUS,
  createInvoice,
  touch,
} from '../objects/invoice.js';
import { attachEvidence, verifyEvidence } from '../evidence/capture.js';
import { nextRequiredDecision, applyDecision } from '../decision/invoice-decisions.js';
import {
  applyLearnedTruth,
  confirmFromDecision,
  confirmFromCompletedExecution,
} from '../learning/index.js';

function round2(n) {
  return Math.round(n * 100) / 100;
}

function computeVatConsequence(invoice) {
  const amount = Number(invoice.amount) || 0;
  let vatAmount = invoice.vat?.amount;
  let rate = invoice.vat?.rate;
  if (vatAmount == null && rate != null) {
    vatAmount = round2(amount - amount / (1 + rate / 100));
  }
  if (vatAmount == null && amount > 0) {
    // Default assumption for business invoices in EU-style demos — Engine truth, not vendor rule UI
    rate = rate != null ? rate : 25;
    vatAmount = round2(amount - amount / (1 + rate / 100));
  }
  const net = round2(amount - (vatAmount || 0));
  return {
    currency: invoice.currency,
    gross: amount,
    net,
    vatAmount: vatAmount != null ? round2(vatAmount) : null,
    vatRate: rate != null ? rate : null,
    context: invoice.context,
  };
}

function computeAccountingConsequence(invoice, vat) {
  return {
    intent: 'record_supplier_invoice',
    supplier: invoice.supplier,
    currency: invoice.currency,
    gross: vat.gross,
    net: vat.net,
    vatAmount: vat.vatAmount,
    vatRate: vat.vatRate,
    dueDate: invoice.dueDate,
    context: invoice.context,
    evidenceId: invoice.document?.id || null,
    // Accounting-ready payload — vendor translation happens in adapter only
    lines: [
      {
        kind: 'expense',
        amount: vat.net,
        vatAmount: vat.vatAmount,
        category: invoice.expenseCategory || null,
        description: `Invoice ${invoice.supplier || ''}`.trim(),
      },
    ],
  };
}

function computePaymentConsequence(invoice, decisions) {
  const approved = decisions.some((d) => d.type === 'approve_payment' && d.optionId === 'approve');
  const held = decisions.some((d) => d.type === 'approve_payment' && d.optionId === 'hold');
  return {
    dueDate: invoice.dueDate,
    amount: invoice.amount,
    currency: invoice.currency,
    status: held ? 'held' : approved ? 'scheduled' : invoice.dueDate ? 'tracked' : 'none',
    surfaceLater: Boolean(invoice.dueDate),
  };
}

function computeForecastConsequence(invoice, vat) {
  if (invoice.amount == null) return { updated: false };
  return {
    updated: true,
    outflow: vat.gross,
    currency: invoice.currency,
    on: invoice.dueDate || null,
  };
}

/**
 * Advance invoice as far as possible until a decision is required or complete.
 * @param {object} invoice
 * @param {{ accountingAdapter?: object, governmentAdapter?: object }} adapters
 */
export async function advanceInvoice(invoice, adapters = {}) {
  let current = { ...invoice };

  if (current.state === INVOICE_STATES.COMPLETE) return current;

  if (current.pendingDecision?.type === 'supplier_hold' || current.pendingDecision?.type === 'payment_hold') {
    return touch(current, {
      state: INVOICE_STATES.NEEDS_DECISION,
      pendingDecision: {
        ...current.pendingDecision,
        prompt:
          current.pendingDecision.type === 'payment_hold'
            ? 'Payment is held. Approve when ready.'
            : 'Supplier identity is held. Continue when ready.',
        options: [{ id: 'resume', label: 'Resume execution' }],
      },
    });
  }

  if (current.state === INVOICE_STATES.RECEIVED && current.document) {
    current = attachEvidence(current, current.document);
  }

  if (current.state === INVOICE_STATES.EVIDENCE_CAPTURED || current.evidenceStatus === 'captured') {
    current = verifyEvidence(current);
    current = touch(current, { state: INVOICE_STATES.CLASSIFYING });
  }

  // Classification: Engine normalizes known fields; does not call vendors
  if (current.state === INVOICE_STATES.CLASSIFYING) {
    current = touch(current, {
      state: INVOICE_STATES.EXECUTING,
    });
  }

  // Apply confirmed learning before asking — silence when confidence allows
  current = applyLearnedTruth(current);

  const decision = nextRequiredDecision(current);
  if (decision) {
    return touch(current, {
      state: INVOICE_STATES.NEEDS_DECISION,
      pendingDecision: decision,
    });
  }

  current = touch(current, { state: INVOICE_STATES.EXECUTING, pendingDecision: null });

  const vat = computeVatConsequence(current);
  const accounting = computeAccountingConsequence(current, vat);
  const payment = computePaymentConsequence(current, current.decisions || []);
  const forecast = computeForecastConsequence(current, vat);

  current = touch(current, {
    consequences: { vat, accounting, payment, forecast },
    synchronizationStatus: SYNC_STATUS.PENDING,
  });

  // Synchronization via adapters only
  let accountingSync = null;
  if (adapters.accountingAdapter?.synchronizeAccounting) {
    accountingSync = await adapters.accountingAdapter.synchronizeAccounting(accounting);
  } else {
    accountingSync = { status: SYNC_STATUS.STUBBED, detail: 'No accounting adapter bound' };
  }

  let governmentSync = null;
  if (current.context === 'business' && adapters.governmentAdapter?.synchronizeFiling) {
    governmentSync = await adapters.governmentAdapter.synchronizeFiling({
      kind: 'vat_consequence',
      payload: vat,
    });
  } else {
    governmentSync = { status: SYNC_STATUS.NOT_REQUIRED };
  }

  const syncStatus =
    accountingSync?.status === SYNC_STATUS.FAILED ? SYNC_STATUS.FAILED : accountingSync?.status || SYNC_STATUS.STUBBED;

  current = touch(current, {
    state: INVOICE_STATES.COMPLETE,
    completedAt: new Date().toISOString(),
    synchronizationStatus: syncStatus,
    sync: {
      accounting: accountingSync,
      government: governmentSync,
    },
    pendingDecision: null,
  });

  // Reinforce residual confirmed truths that reduce future administration
  const completedLearn = confirmFromCompletedExecution(current);
  if (completedLearn.learned?.length) {
    current = touch(current, {
      learning: {
        ...(current.learning || {}),
        confirmed: [...(current.learning?.confirmed || []), ...completedLearn.learned],
      },
    });
  }

  return current;
}

/**
 * Apply a human decision then continue execution.
 */
export async function decideAndAdvance(invoice, decisionType, optionId, adapters = {}, learningExtras = {}) {
  let current = applyDecision(invoice, decisionType, optionId);

  if (decisionType === 'supplier' && optionId === 'set_later') {
    return touch(current, { state: INVOICE_STATES.NEEDS_DECISION });
  }
  if (decisionType === 'approve_payment' && optionId === 'hold') {
    return touch(current, { state: INVOICE_STATES.NEEDS_DECISION });
  }
  if (optionId === 'resume') {
    current = touch(current, {
      pendingDecision: null,
      decisions: [
        ...(current.decisions || []),
        { type: 'resume', optionId: 'resume', at: new Date().toISOString() },
      ],
    });
    // Clear hold by injecting approve if payment was held
    if (invoice.pendingDecision?.type === 'payment_hold') {
      current = applyDecision(current, 'approve_payment', 'approve');
    }
    if (invoice.pendingDecision?.type === 'supplier_hold') {
      current = applyDecision(current, 'supplier', 'accept_unknown');
    }
  }

  // Store confirmed truth only when it will reduce future administration
  const learned = confirmFromDecision(current, decisionType, optionId, learningExtras);
  if (learned.learned?.length) {
    current = touch(current, {
      learning: {
        ...(current.learning || {}),
        confirmed: [...(current.learning?.confirmed || []), ...learned.learned],
      },
    });
  }

  return advanceInvoice(current, adapters);
}

export function startInvoiceFromUpload(meta, evidenceRef) {
  return createInvoice({
    ...meta,
    source: meta.source || 'upload',
    document: evidenceRef,
  });
}
