/**
 * Engine · Bank transaction intake
 * Provider-independent. Evidence/list I/O via ports.
 */

import { createInvoice, INVOICE_STATES, touch } from '../objects/invoice.js';
import { advanceInvoice } from '../execution/invoice-flow.js';
import { matchBankTransaction, matchReceiptToAwaiting } from './matching.js';
import {
  PAYMENT_TRUTH,
  createPaymentTruth,
  appendPaymentHistory,
} from './truth.js';
import { bankEventKey, findBankEvent, rememberBankEvent } from './idempotency.js';
import { bumpBankMetric } from './metrics.js';

function absAmount(tx) {
  if (tx.metadata?.absoluteAmount != null) return Math.abs(Number(tx.metadata.absoluteAmount));
  return Math.abs(Number(tx.amount));
}

/**
 * Apply a booked/pending bank match onto an invoice.
 */
export function applyBankPaymentTruth(invoice, tx, { matchMeta = null } = {}) {
  const status =
    tx.status === 'reversed'
      ? PAYMENT_TRUTH.REVERSED
      : tx.status === 'pending'
        ? PAYMENT_TRUTH.PENDING
        : PAYMENT_TRUTH.BOOKED;

  let truth = createPaymentTruth({
    ...(invoice.paymentTruth || {}),
    status,
    provider: tx.provider,
    transactionId: tx.transactionId,
    accountId: tx.accountId,
    bookedAt: tx.bookedAt,
    amount: absAmount(tx),
    currency: tx.currency,
    counterparty: tx.counterparty,
    reference: tx.reference,
    matchedAt: new Date().toISOString(),
    history: invoice.paymentTruth?.history || [],
  });

  truth = appendPaymentHistory(truth, {
    type: status,
    transactionId: tx.transactionId,
    status: tx.status,
    match: matchMeta,
  });

  const settled = status === PAYMENT_TRUTH.BOOKED;
  return touch(invoice, {
    paymentTruth: truth,
    paymentSettled: settled ? true : invoice.paymentSettled && status !== PAYMENT_TRUTH.REVERSED,
    paymentConfirmed: settled,
  });
}

/**
 * Reopen execution when payment is reversed.
 */
export function applyReversal(invoice, tx) {
  let truth = createPaymentTruth({
    ...(invoice.paymentTruth || {}),
    status: PAYMENT_TRUTH.REVERSED,
    provider: tx.provider,
    transactionId: tx.transactionId,
    accountId: tx.accountId,
    bookedAt: tx.bookedAt,
    amount: absAmount(tx),
    currency: tx.currency,
    counterparty: tx.counterparty,
    reference: tx.reference,
    matchedAt: new Date().toISOString(),
    history: invoice.paymentTruth?.history || [],
  });
  truth = appendPaymentHistory(truth, {
    type: 'reversed',
    transactionId: tx.transactionId,
    status: 'reversed',
  });

  return touch(invoice, {
    paymentTruth: truth,
    paymentSettled: false,
    paymentConfirmed: false,
    state: INVOICE_STATES.NEEDS_DECISION,
    completedAt: null,
    pendingDecision: {
      type: 'payment_reversed',
      prompt: 'Payment was reversed. Review this obligation.',
      options: [{ id: 'acknowledge', label: 'Continue execution' }],
    },
  });
}

function createAwaitingFromBank(tx) {
  return createInvoice({
    source: 'bank',
    supplier: tx.counterparty || '',
    amount: absAmount(tx),
    currency: tx.currency,
    dueDate: null,
    paymentSettled: tx.status === 'booked',
    paymentConfirmed: tx.status === 'booked',
    awaitingEvidence: true,
    paymentReference: tx.reference || null,
    paymentTruth: createPaymentTruth({
      status: tx.status === 'pending' ? PAYMENT_TRUTH.PENDING : PAYMENT_TRUTH.BOOKED,
      provider: tx.provider,
      transactionId: tx.transactionId,
      accountId: tx.accountId,
      bookedAt: tx.bookedAt,
      amount: absAmount(tx),
      currency: tx.currency,
      counterparty: tx.counterparty,
      reference: tx.reference,
      matchedAt: new Date().toISOString(),
      history: [{ type: 'unmatched_bank', transactionId: tx.transactionId, at: new Date().toISOString() }],
    }),
    sourceIdentity: {
      key: bankEventKey(tx),
      provider: tx.provider,
      transactionId: tx.transactionId,
      accountId: tx.accountId,
    },
  });
}

/**
 * Process one normalized bank transaction.
 * @param {object} tx
 * @param {object} runtimeAdapters
 * @param {{ listInvoices: () => object[], getInvoiceById?: Function, onInvoice: Function }} ports
 */
export async function processBankTransaction(tx, runtimeAdapters = {}, ports = {}) {
  if (typeof ports.listInvoices !== 'function' || typeof ports.onInvoice !== 'function') {
    throw new Error('BANK_INTAKE_REQUIRES_PORTS');
  }

  bumpBankMetric('transactionsIngested');

  const key = bankEventKey(tx);
  const existingEvent = findBankEvent(key);
  if (existingEvent && tx.status !== 'reversed') {
    bumpBankMetric('duplicatesPrevented');
    const invoice = ports.getInvoiceById?.(existingEvent.invoiceId) || null;
    return {
      status: 'duplicate',
      transactionId: tx.transactionId,
      invoiceId: existingEvent.invoiceId,
      invoice,
    };
  }

  // Reversal of a previously booked event — allow even if booked key exists
  if (tx.status === 'reversed') {
    const bookedKey = bankEventKey({ ...tx, status: 'booked' });
    const prior = findBankEvent(bookedKey) || existingEvent;
    let invoice = prior?.invoiceId ? ports.getInvoiceById?.(prior.invoiceId) : null;

    if (!invoice) {
      // Try match by counterparty/amount among completed
      const match = matchBankTransaction({ ...tx, status: 'booked' }, ports.listInvoices());
      if (match.kind === 'high') invoice = match.matches[0].invoice;
    }

    if (!invoice) {
      bumpBankMetric('unmatchedTransactions');
      return { status: 'unmatched_reversal', transactionId: tx.transactionId };
    }

    invoice = applyReversal(invoice, tx);
    rememberBankEvent(key, { invoiceId: invoice.id, status: 'reversed' });
    bumpBankMetric('reversals');
    ports.onInvoice(invoice);
    return { status: 'reversed', invoiceId: invoice.id, invoice };
  }

  const invoices = ports.listInvoices();
  const match = matchBankTransaction(tx, invoices);

  if (match.kind === 'high') {
    let invoice = match.matches[0].invoice;
    invoice = applyBankPaymentTruth(invoice, tx, { matchMeta: match.matches[0] });
    rememberBankEvent(key, { invoiceId: invoice.id, status: tx.status });
    bumpBankMetric('automaticMatches');

    // Already Complete (e.g. scheduled earlier) — enrich payment truth, do not reopen
    if (invoice.state === INVOICE_STATES.COMPLETE) {
      const payment = {
        dueDate: invoice.dueDate,
        amount: invoice.amount,
        currency: invoice.currency,
        status: tx.status === 'booked' ? 'settled' : tx.status,
        bankConfirmed: tx.status === 'booked',
        surfaceLater: tx.status !== 'booked',
        transactionId: tx.transactionId,
      };
      invoice = touch(invoice, {
        consequences: { ...(invoice.consequences || {}), payment },
      });
      if (tx.status === 'booked') bumpBankMetric('executionsCompletedFromBankTruth');
      ports.onInvoice(invoice);
      return { status: 'matched', invoiceId: invoice.id, invoice, confidence: 'high' };
    }

    // Bank booked proves settlement — advance without inventing consent for unpaid scheduling
    invoice = await advanceInvoice(invoice, runtimeAdapters);
    if (invoice.state === INVOICE_STATES.COMPLETE) {
      bumpBankMetric('executionsCompletedFromBankTruth');
    }
    ports.onInvoice(invoice);
    return { status: 'matched', invoiceId: invoice.id, invoice, confidence: 'high' };
  }

  if (match.kind === 'ambiguous') {
    bumpBankMetric('ambiguousMatches');
    const options = match.matches.map((m) => ({
      id: m.invoice.id,
      label: `${m.invoice.supplier || 'Invoice'} · ${m.invoice.amount} ${m.invoice.currency}`,
    }));
    // Hold transaction as pending decision on a temporary carrier object
    let carrier = createAwaitingFromBank(tx);
    carrier = touch(carrier, {
      awaitingEvidence: false,
      ambiguousMatch: true,
      state: INVOICE_STATES.NEEDS_DECISION,
      pendingDecision: {
        type: 'payment_match',
        prompt: 'Which obligation does this payment belong to?',
        options: [...options, { id: 'none', label: 'None of these' }],
        bankTransaction: tx,
      },
      evidenceStatus: 'missing',
    });
    // Don't mark settled until chosen
    carrier = touch(carrier, { paymentSettled: false, paymentConfirmed: false });
    rememberBankEvent(key, { invoiceId: carrier.id, status: 'ambiguous' });
    ports.onInvoice(carrier);
    return { status: 'ambiguous', invoiceId: carrier.id, invoice: carrier, candidates: options };
  }

  // No match — card/purchase may arrive before receipt
  let awaiting = createAwaitingFromBank(tx);
  awaiting = await advanceInvoice(awaiting, runtimeAdapters);
  rememberBankEvent(key, { invoiceId: awaiting.id, status: tx.status });
  bumpBankMetric('unmatchedTransactions');
  bumpBankMetric('awaitingEvidenceCreated');
  ports.onInvoice(awaiting);
  return { status: 'awaiting_evidence', invoiceId: awaiting.id, invoice: awaiting };
}

/**
 * When a document invoice arrives, try to attach to bank-first objects.
 */
export async function tryMatchInvoiceToBankAwaiting(invoice, runtimeAdapters, ports) {
  const awaiting = ports.listInvoices().filter((i) => i.awaitingEvidence && i.source === 'bank');
  if (!awaiting.length) return { status: 'none', invoice };

  const match = matchReceiptToAwaiting(invoice, awaiting);
  if (match.kind !== 'high') return { status: 'none', invoice };

  const bankObj = match.matches[0].invoice;
  let merged = touch(invoice, {
    paymentTruth: bankObj.paymentTruth,
    paymentSettled: bankObj.paymentTruth?.status === PAYMENT_TRUTH.BOOKED,
    paymentConfirmed: bankObj.paymentTruth?.status === PAYMENT_TRUTH.BOOKED,
    awaitingEvidence: false,
    supplier: invoice.supplier || bankObj.supplier,
  });

  // Close the temporary bank object
  const closed = touch(bankObj, {
    state: INVOICE_STATES.COMPLETE,
    awaitingEvidence: false,
    completedAt: new Date().toISOString(),
    mergedIntoId: merged.id,
  });
  ports.onInvoice(closed);

  merged = await advanceInvoice(merged, runtimeAdapters);
  bumpBankMetric('receiptMatches');
  if (merged.state === INVOICE_STATES.COMPLETE) {
    bumpBankMetric('executionsCompletedFromBankTruth');
  }
  ports.onInvoice(merged);
  return { status: 'matched', invoice: merged, bankObjectId: bankObj.id };
}

/**
 * Resolve ambiguous payment_match decision (person picks the obligation).
 */
export async function resolveAmbiguousPaymentMatch(carrier, optionId, runtimeAdapters = {}, ports = {}) {
  const tx = carrier.pendingDecision?.bankTransaction;
  if (!tx) {
    throw new Error('PAYMENT_MATCH_MISSING_BANK_TRANSACTION');
  }

  if (optionId === 'none') {
    const parked = touch(carrier, {
      ambiguousMatch: false,
      awaitingEvidence: true,
      pendingDecision: null,
      state: INVOICE_STATES.EXECUTING,
      paymentSettled: tx.status === 'booked',
      paymentConfirmed: tx.status === 'booked',
    });
    ports.onInvoice?.(parked);
    return parked;
  }

  let target = ports.getInvoiceById?.(optionId);
  if (!target) {
    throw new Error('PAYMENT_MATCH_TARGET_NOT_FOUND');
  }

  target = applyBankPaymentTruth(target, tx, { matchMeta: { manual: true } });
  rememberBankEvent(bankEventKey(tx), { invoiceId: target.id, status: tx.status });

  const closed = touch(carrier, {
    state: INVOICE_STATES.COMPLETE,
    completedAt: new Date().toISOString(),
    ambiguousMatch: false,
    pendingDecision: null,
    mergedIntoId: target.id,
  });
  ports.onInvoice?.(closed);

  if (target.state !== INVOICE_STATES.COMPLETE) {
    target = await advanceInvoice(target, runtimeAdapters);
  } else if (tx.status === 'booked') {
    target = touch(target, {
      consequences: {
        ...(target.consequences || {}),
        payment: {
          dueDate: target.dueDate,
          amount: target.amount,
          currency: target.currency,
          status: 'settled',
          bankConfirmed: true,
          surfaceLater: false,
          transactionId: tx.transactionId,
        },
      },
    });
  }

  if (target.state === INVOICE_STATES.COMPLETE && tx.status === 'booked') {
    bumpBankMetric('executionsCompletedFromBankTruth');
  }
  ports.onInvoice?.(target);
  return target;
}

export async function ingestFromBankAdapter(bankAdapter, runtimeAdapters = {}, ports = {}, receiveOpts = {}) {
  let receive;
  try {
    receive = bankAdapter.receiveTransactions
      ? await bankAdapter.receiveTransactions(receiveOpts)
      : await bankAdapter.receiveEvents?.(receiveOpts);
  } catch (err) {
    return { status: 'error', detail: String(err?.message || err), results: [] };
  }

  if (!receive || receive.status === 'blocked' || receive.status === 'error') {
    return {
      status: receive?.status || 'error',
      detail: receive?.detail || '',
      results: [],
    };
  }

  const txs = receive.transactions || receive.events || [];
  const results = [];
  for (const tx of txs) {
    results.push(await processBankTransaction(tx, runtimeAdapters, ports));
  }
  return { status: 'ok', detail: receive.detail || '', results };
}
