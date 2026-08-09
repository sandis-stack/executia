/**
 * Engine · Invoice execution flow
 * Person manages no intermediate tasks — only decisions when required.
 */

import {
  INVOICE_STATES,
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
import {
  applyExecutionMemory,
  rememberFromDecision,
  rememberFromCompletedExecution,
} from '../memory/index.js';
import {
  beginMetrics,
  recordRestoreMetrics,
  recordQuestionAsked,
  finalizeMetrics,
} from './metrics.js';
import {
  createAccountingIntent,
  accountingSyncRequested,
  normalizeAccountingSyncStatus,
  ACCOUNTING_SYNC_STATUS,
} from '../accounting/index.js';

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
    executionContext: {
      vehicle: invoice.executionContext?.vehicle || null,
      project: invoice.executionContext?.project || null,
      costCentre: invoice.executionContext?.costCentre || null,
      paymentMethod: invoice.executionContext?.paymentMethod || null,
    },
    // Accounting-ready payload — vendor translation happens in adapter only
    lines: [
      {
        kind: 'expense',
        amount: vat.net,
        vatAmount: vat.vatAmount,
        category: invoice.expenseCategory || null,
        costCentre: invoice.executionContext?.costCentre || null,
        project: invoice.executionContext?.project || null,
        vehicle: invoice.executionContext?.vehicle || null,
        description: `Invoice ${invoice.supplier || ''}`.trim(),
      },
    ],
  };
}

function computePaymentConsequence(invoice, decisions) {
  const truth = invoice.paymentTruth?.status;
  if (truth === 'reversed') {
    return {
      dueDate: invoice.dueDate,
      amount: invoice.amount,
      currency: invoice.currency,
      status: 'reversed',
      bankConfirmed: false,
      surfaceLater: true,
      transactionId: invoice.paymentTruth?.transactionId || null,
    };
  }
  if (truth === 'booked' || invoice.paymentSettled) {
    return {
      dueDate: invoice.dueDate,
      amount: invoice.amount,
      currency: invoice.currency,
      status: 'settled',
      bankConfirmed: truth === 'booked' || Boolean(invoice.paymentConfirmed),
      surfaceLater: false,
      transactionId: invoice.paymentTruth?.transactionId || null,
    };
  }
  if (truth === 'pending') {
    return {
      dueDate: invoice.dueDate,
      amount: invoice.amount,
      currency: invoice.currency,
      status: 'pending',
      bankConfirmed: false,
      surfaceLater: true,
      transactionId: invoice.paymentTruth?.transactionId || null,
    };
  }
  const approved = decisions.some((d) => d.type === 'approve_payment' && d.optionId === 'approve');
  const held = decisions.some((d) => d.type === 'approve_payment' && d.optionId === 'hold');
  return {
    dueDate: invoice.dueDate,
    amount: invoice.amount,
    currency: invoice.currency,
    status: held ? 'held' : approved || truth === 'scheduled' ? 'scheduled' : invoice.dueDate ? 'tracked' : 'none',
    bankConfirmed: false,
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
  let current = beginMetrics({ ...invoice });

  if (current.state === INVOICE_STATES.COMPLETE) return current;

  // Bank match / reversal decisions must not be overwritten
  if (
    current.pendingDecision?.type === 'payment_match' ||
    current.pendingDecision?.type === 'payment_reversed'
  ) {
    current = recordQuestionAsked(current, current.pendingDecision.type);
    return touch(current, { state: INVOICE_STATES.NEEDS_DECISION });
  }

  // Card/bank before receipt — park until evidence arrives (no false Complete)
  if (current.awaitingEvidence && !current.document) {
    return touch(current, {
      state: INVOICE_STATES.EXECUTING,
      pendingDecision: null,
    });
  }

  if (current.pendingDecision?.type === 'supplier_hold' || current.pendingDecision?.type === 'payment_hold') {
    current = recordQuestionAsked(current, current.pendingDecision.type);
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

  const hadContextBeforeMemory = Boolean(current.context);
  // Memory restores execution context; Learning silences repeated context decisions
  current = applyExecutionMemory(current);
  const hadContextBeforeLearning = Boolean(current.context);
  current = applyLearnedTruth(current);
  current = recordRestoreMetrics(current, { hadContextBeforeMemory, hadContextBeforeLearning });

  const decision = nextRequiredDecision(current);
  if (decision) {
    current = recordQuestionAsked(current, decision.type);
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
  const accountingIntent = createAccountingIntent(current, accounting, payment);

  // Engine truth is established before external sync — Fiken offline must not erase it
  const syncRequested = accountingSyncRequested(current);
  current = touch(current, {
    consequences: { vat, accounting, payment, forecast },
    accountingIntent,
    synchronizationStatus: syncRequested
      ? ACCOUNTING_SYNC_STATUS.QUEUED
      : ACCOUNTING_SYNC_STATUS.NOT_REQUESTED,
  });

  // Synchronization via adapters only (translation destination)
  let accountingSync = null;
  if (!syncRequested) {
    accountingSync = {
      status: ACCOUNTING_SYNC_STATUS.NOT_REQUESTED,
      detail: 'Accounting synchronization not requested for this execution',
    };
  } else if (adapters.accountingAdapter?.synchronizeAccounting) {
    current = touch(current, { synchronizationStatus: ACCOUNTING_SYNC_STATUS.SYNCING });
    accountingSync = await adapters.accountingAdapter.synchronizeAccounting(accountingIntent, {
      getEvidence: adapters.getEvidence,
    });
  } else {
    accountingSync = {
      status: ACCOUNTING_SYNC_STATUS.FAILED,
      detail: 'No accounting adapter bound. Engine truth preserved.',
    };
  }

  accountingSync = {
    ...accountingSync,
    status: normalizeAccountingSyncStatus(accountingSync?.status),
  };

  let governmentSync = null;
  if (current.context === 'business' && adapters.governmentAdapter?.synchronizeFiling) {
    governmentSync = await adapters.governmentAdapter.synchronizeFiling({
      kind: 'vat_consequence',
      payload: vat,
    });
  } else {
    governmentSync = { status: ACCOUNTING_SYNC_STATUS.NOT_REQUESTED };
  }

  const syncStatus = accountingSync.status;

  // Surface human attention only when adapter reports genuine divergence / action needed
  if (syncStatus === ACCOUNTING_SYNC_STATUS.REQUIRES_ATTENTION) {
    return touch(current, {
      state: INVOICE_STATES.EXCEPTION,
      synchronizationStatus: syncStatus,
      sync: { accounting: accountingSync, government: governmentSync },
      pendingDecision: {
        type: 'accounting_sync',
        prompt: 'Accounting synchronization needs your attention.',
        options: [{ id: 'acknowledge', label: 'Continue' }],
      },
      completedAt: null,
    });
  }

  current = touch(current, {
    state: INVOICE_STATES.COMPLETE,
    completedAt: new Date().toISOString(),
    // Execution Complete = Engine truth established; sync may still be waiting/failed
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

  // Every completed execution enriches Execution Memory
  const remembered = rememberFromCompletedExecution(current);
  if (remembered.supplierMemory) {
    current = touch(current, {
      memory: {
        ...(current.memory || {}),
        enriched: true,
        supplierMemoryId: remembered.supplierMemory.id,
        executionCount: remembered.supplierMemory.executionCount,
        confidence: remembered.supplierMemory.confidence,
      },
    });
  }

  return finalizeMetrics(current, { complete: true });
}

/**
 * Apply a human decision then continue execution.
 */
export async function decideAndAdvance(invoice, decisionType, optionId, adapters = {}, learningExtras = {}, ports = {}) {
  // Ambiguous bank match — Engine resolves via payment module (ports bind storage)
  if (decisionType === 'payment_match' && typeof ports.resolvePaymentMatch === 'function') {
    return ports.resolvePaymentMatch(invoice, optionId, adapters, ports);
  }

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

  // Attach confirmed execution context carried with the decision
  current = attachConfirmedExtras(current, learningExtras);

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

  // Enrich Execution Memory from confirmed decision context
  rememberFromDecision(current, decisionType, optionId, learningExtras);

  return advanceInvoice(current, adapters);
}

function attachConfirmedExtras(invoice, extras = {}) {
  if (!extras || !Object.keys(extras).length) return invoice;
  const executionContext = {
    ...(invoice.executionContext || {}),
    ...(extras.executionContext || {}),
  };
  if (extras.vehicle) executionContext.vehicle = extras.vehicle;
  if (extras.project) executionContext.project = extras.project;
  if (extras.property) executionContext.property = extras.property;
  if (extras.costCentre) executionContext.costCentre = extras.costCentre;
  if (extras.paymentMethod) executionContext.paymentMethod = extras.paymentMethod;
  if (extras.deadlineTracking) executionContext.deadlineTracking = extras.deadlineTracking;
  if (extras.subscription) executionContext.subscription = extras.subscription;
  if (extras.customer) executionContext.customer = extras.customer;
  if (extras.employee) executionContext.employee = extras.employee;

  return touch(invoice, {
    executionContext,
    expenseCategory: extras.expenseCategory || invoice.expenseCategory,
    recurring: extras.recurring != null ? extras.recurring : invoice.recurring,
  });
}

export function startInvoiceFromUpload(meta, evidenceRef) {
  return createInvoice({
    ...meta,
    source: meta.source || 'upload',
    document: evidenceRef,
  });
}
