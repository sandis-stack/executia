/**
 * Engine · Deterministic payment matching
 * Never silently guess ambiguous matches.
 */

function norm(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function absAmount(tx) {
  if (tx.metadata?.absoluteAmount != null) return Math.abs(Number(tx.metadata.absoluteAmount));
  return Math.abs(Number(tx.amount));
}

function openForPayment(invoice) {
  if (!invoice) return false;
  if (invoice.state === 'exception') return false;
  // Bank-first holders and ambiguous carriers are not payment targets
  if (invoice.awaitingEvidence && invoice.source === 'bank') return false;
  if (invoice.ambiguousMatch) return false;
  // Already booked — not a candidate for a new booked match
  if (invoice.paymentTruth?.status === 'booked') return false;
  if (invoice.paymentTruth?.status === 'reversed') return true;
  return ['received', 'evidence_captured', 'classifying', 'needs_decision', 'executing', 'complete'].includes(
    invoice.state,
  );
}

/**
 * Score one invoice against a bank transaction.
 * High confidence requires amount+currency and (reference OR counterparty).
 */
export function scoreMatch(tx, invoice) {
  const amount = absAmount(tx);
  const invAmount = Number(invoice.amount);
  if (amount == null || invAmount == null || Number.isNaN(amount) || Number.isNaN(invAmount)) {
    return { score: 0, reasons: ['missing_amount'] };
  }
  if (Math.abs(amount - invAmount) > 0.009) {
    return { score: 0, reasons: ['amount_mismatch'] };
  }
  if (norm(tx.currency) !== norm(invoice.currency)) {
    return { score: 0, reasons: ['currency_mismatch'] };
  }

  let score = 50; // amount+currency base
  const reasons = ['amount', 'currency'];

  const ref = norm(tx.reference);
  const invRef = norm(invoice.paymentReference || '');
  const invNum = norm(invoice.metadata?.invoiceNumber || '');
  const invIdHint = norm(invoice.id);
  if (ref && invRef && (ref.includes(invRef) || invRef.includes(ref))) {
    score += 40;
    reasons.push('reference');
  } else if (ref && invNum && ref.includes(invNum)) {
    score += 40;
    reasons.push('reference');
  } else if (ref && invIdHint && ref.includes(invIdHint)) {
    score += 30;
    reasons.push('reference_id');
  }

  const cp = norm(tx.counterparty);
  const supplier = norm(invoice.supplier);
  if (cp && supplier && (cp === supplier || cp.includes(supplier) || supplier.includes(cp))) {
    score += 25;
    reasons.push('counterparty');
  }

  if (invoice.dueDate && tx.bookedAt) {
    const due = Date.parse(invoice.dueDate);
    const booked = Date.parse(tx.bookedAt);
    if (!Number.isNaN(due) && !Number.isNaN(booked)) {
      const days = Math.abs(booked - due) / (86400000);
      if (days <= 14) {
        score += 5;
        reasons.push('date_proximity');
      }
    }
  }

  const high =
    score >= 75 &&
    reasons.includes('amount') &&
    reasons.includes('currency') &&
    (reasons.includes('reference') || reasons.includes('counterparty'));

  return { score, reasons, high };
}

/**
 * @param {object} tx
 * @param {object[]} invoices
 * @returns {{ kind: 'high'|'ambiguous'|'none', matches: object[] }}
 */
export function matchBankTransaction(tx, invoices) {
  const candidates = (invoices || []).filter(openForPayment);
  const scored = candidates
    .map((inv) => ({ invoice: inv, ...scoreMatch(tx, inv) }))
    .filter((s) => s.score >= 50)
    .sort((a, b) => b.score - a.score);

  const high = scored.filter((s) => s.high);

  if (high.length === 1) {
    return { kind: 'high', matches: high };
  }
  if (high.length > 1 || scored.length > 1) {
    // Multiple amount+currency matches without a single high winner → ambiguous
    const amountPeers = scored.filter((s) => s.reasons.includes('amount'));
    if (amountPeers.length > 1 && high.length !== 1) {
      return { kind: 'ambiguous', matches: amountPeers };
    }
  }
  if (high.length === 0 && scored.length === 1 && scored[0].high) {
    return { kind: 'high', matches: scored };
  }
  if (scored.length === 1 && scored[0].score >= 75) {
    return { kind: 'high', matches: scored };
  }
  if (scored.length > 1) {
    return { kind: 'ambiguous', matches: scored };
  }
  if (scored.length === 1) {
    // Single weak amount match without counterparty/reference — do not auto-match
    return { kind: 'none', matches: scored };
  }
  return { kind: 'none', matches: [] };
}

/**
 * Match a late receipt/invoice to an awaiting bank-origin object.
 * Does not use openForPayment — those holders are intentionally excluded from bank→invoice matching.
 */
export function matchReceiptToAwaiting(invoiceLike, awaitingList) {
  const txShape = {
    amount: invoiceLike.amount,
    currency: invoiceLike.currency,
    counterparty: invoiceLike.supplier,
    reference: invoiceLike.paymentReference || '',
    bookedAt: invoiceLike.createdAt,
    metadata: { absoluteAmount: invoiceLike.amount },
  };
  const candidates = (awaitingList || []).filter((i) => i.awaitingEvidence && i.source === 'bank');
  const scored = candidates
    .map((inv) => ({ invoice: inv, ...scoreMatch(txShape, inv) }))
    .filter((s) => s.score >= 50)
    .sort((a, b) => b.score - a.score);
  const high = scored.filter((s) => s.high);
  if (high.length === 1) return { kind: 'high', matches: high };
  if (scored.length > 1) return { kind: 'ambiguous', matches: scored };
  if (scored.length === 1 && scored[0].high) return { kind: 'high', matches: scored };
  return { kind: 'none', matches: scored };
}
