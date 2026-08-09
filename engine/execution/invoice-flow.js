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
import {
  evaluateExecutionCompletion,
  accountingSyncNeedsHuman,
} from './completion.js';

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

  // Outstanding judgement must not be overwritten by automatic advance
  if (
    current.pendingDecision?.type === 'payment_match' ||
    current.pendingDecision?.type === 'payment_reversed' ||
    current.pendingDecision?.type === 'accounting_sync'
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

  // Establish Engine truth (consequences + accounting intent) — not Execution Complete
  const vat = current.consequences?.vat || computeVatConsequence(current);
  const accounting = current.consequences?.accounting || computeAccountingConsequence(current, vat);
  const payment =
    current.consequences?.payment || computePaymentConsequence(current, current.decisions || []);
  const forecast = current.consequences?.forecast || computeForecastConsequence(current, vat);
  const accountingIntent =
    current.accountingIntent || createAccountingIntent(current, accounting, payment);

  const syncRequested = accountingSyncRequested(current);
  current = touch(current, {
    consequences: { vat, accounting, payment, forecast },
    accountingIntent,
    truthEstablished: true,
    truthEstablishedAt: current.truthEstablishedAt || new Date().toISOString(),
    synchronizationStatus: syncRequested
      ? ACCOUNTING_SYNC_STATUS.QUEUED
      : ACCOUNTING_SYNC_STATUS.NOT_REQUIRED,
    completedAt: null,
  });

  // Synchronization via adapters only — retryable while Executing
  let accountingSync = current.sync?.accounting || null;
  if (!syncRequested) {
    accountingSync = {
      status: ACCOUNTING_SYNC_STATUS.NOT_REQUIRED,
      detail: 'Accounting synchronization not required by policy',
    };
  } else if (adapters.accountingAdapter?.synchronizeAccounting) {
    current = touch(current, { synchronizationStatus: ACCOUNTING_SYNC_STATUS.SYNCING });
    accountingSync = await adapters.accountingAdapter.synchronizeAccounting(accountingIntent, {
      getEvidence: adapters.getEvidence,
    });
  } else {
    accountingSync = {
      status: ACCOUNTING_SYNC_STATUS.FAILED,
      detail: 'No accounting adapter bound. Engine truth preserved; execution remains pending.',
      metadata: { reason: 'credentials_missing' },
    };
  }

  accountingSync = {
    ...accountingSync,
    status: normalizeAccountingSyncStatus(accountingSync?.status),
  };

  let governmentSync = current.sync?.government || null;
  if (current.context === 'business' && adapters.governmentAdapter?.synchronizeFiling) {
    governmentSync = await adapters.governmentAdapter.synchronizeFiling({
      kind: 'vat_consequence',
      payload: vat,
    });
    governmentSync = {
      ...governmentSync,
      status: normalizeAccountingSyncStatus(governmentSync?.status),
    };
  } else {
    governmentSync = { status: ACCOUNTING_SYNC_STATUS.NOT_REQUIRED };
  }

  current = touch(current, {
    synchronizationStatus: accountingSync.status,
    sync: { accounting: accountingSync, government: governmentSync },
  });

  // Auth/config/immutable — Needs Decision (never pretend Complete)
  if (accountingSyncNeedsHuman(accountingSync)) {
    current = recordQuestionAsked(current, 'accounting_sync');
    return finalizeMetrics(
      touch(current, {
        state: INVOICE_STATES.NEEDS_DECISION,
        pendingDecision: {
          type: 'accounting_sync',
          prompt: 'Accounting synchronization needs your attention.',
          options: [{ id: 'retry', label: 'Try again' }, { id: 'acknowledge', label: 'Continue later' }],
        },
        completedAt: null,
      }),
      { complete: false },
    );
  }

  const verdict = evaluateExecutionCompletion(current);
  if (!verdict.complete) {
    // Temporary failure / queued / syncing → remain Executing for automatic retry
    return finalizeMetrics(
      touch(current, {
        state: INVOICE_STATES.EXECUTING,
        pendingDecision: null,
        completedAt: null,
        completion: verdict,
      }),
      { complete: false },
    );
  }

  current = touch(current, {
    state: INVOICE_STATES.COMPLETE,
    completedAt: new Date().toISOString(),
    synchronizationStatus: accountingSync.status,
    sync: { accounting: accountingSync, government: governmentSync },
    pendingDecision: null,
    completion: verdict,
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

  // Accounting sync: retry continues execution; acknowledge parks as Executing (not Complete)
  if (decisionType === 'accounting_sync' && optionId === 'acknowledge') {
    const current = applyDecision(invoice, decisionType, optionId);
    return touch(current, {
      state: INVOICE_STATES.EXECUTING,
      pendingDecision: null,
      completedAt: null,
    });
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
