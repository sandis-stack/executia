/**
 * Engine · Intake from normalized source events
 *
 * Accepts provider-independent events. Never imports email/document vendors.
 * Evidence I/O is injected (adapters stay outside the Engine).
 */

import { createInvoice, INVOICE_STATES } from '../objects/invoice.js';
import { advanceInvoice } from '../execution/invoice-flow.js';
import {
  detectCandidateDocuments,
  detectPaymentSettled,
  isCandidateAttachment,
} from './detect-candidate.js';
import {
  findBySourceIdentity,
  rememberSourceIdentity,
  sourceIdentityKey,
} from './idempotency.js';
import { bumpIntakeMetric } from './metrics.js';

/**
 * @param {object} event Normalized source event
 * @param {{ accountingAdapter?: object, governmentAdapter?: object }} runtimeAdapters
 * @param {{
 *   storeEvidence: (input: object) => Promise<object>,
 *   getInvoiceById?: (id: string) => object|null,
 * }} ports
 */
export async function processSourceEvent(event, runtimeAdapters = {}, ports = {}) {
  if (typeof ports.storeEvidence !== 'function') {
    throw new Error('INTAKE_REQUIRES_STORE_EVIDENCE_PORT');
  }

  bumpIntakeMetric('emailsInspected');

  const candidates = detectCandidateDocuments(event);
  bumpIntakeMetric('candidateDocumentsDetected', candidates.length);

  if (!candidates.length) {
    bumpIntakeMetric('ignoredNonCandidates');
    return {
      status: 'ignored',
      reason: 'no_candidate_documents',
      results: [],
    };
  }

  const results = [];
  for (const attachment of candidates) {
    results.push(
      await processCandidateAttachment(event, attachment, runtimeAdapters, ports),
    );
  }

  return { status: 'ok', results };
}

async function processCandidateAttachment(event, attachment, runtimeAdapters, ports) {
  if (!isCandidateAttachment(attachment)) {
    return { status: 'ignored', reason: 'unsupported_format' };
  }

  if (!attachment.contentBase64 && !attachment.dataUrl) {
    bumpIntakeMetric('exceptions');
    return {
      status: 'exception',
      reason: 'attachment_unreadable',
      detail: 'Attachment has no readable content reference',
    };
  }

  const identity = {
    provider: event.provider,
    messageId: event.messageId,
    attachmentId: attachment.attachmentId,
    contentHash: attachment.contentHash,
  };
  const key = sourceIdentityKey(identity);
  const existing = findBySourceIdentity(key);
  if (existing?.invoiceId) {
    bumpIntakeMetric('duplicatesPrevented');
    const invoice = ports.getInvoiceById?.(existing.invoiceId) || null;
    return {
      status: 'duplicate',
      reason: 'duplicate_attachment',
      sourceIdentityKey: key,
      invoiceId: existing.invoiceId,
      invoice,
    };
  }

  let evidenceRef;
  try {
    evidenceRef = await ports.storeEvidence({
      name: attachment.filename || attachment.name || 'attachment',
      mimeType: attachment.mimeType,
      contentBase64: attachment.contentBase64,
      dataUrl: attachment.dataUrl,
      size: attachment.size,
      contentHash: attachment.contentHash,
      provenance: {
        source: event.source || 'email',
        provider: event.provider,
        messageId: event.messageId,
        attachmentId: attachment.attachmentId,
        receivedAt: event.receivedAt,
        originalFilename: attachment.filename || attachment.name || null,
        contentHash: attachment.contentHash || null,
        subject: event.subject || null,
        sender: event.sender || null,
      },
    });
  } catch (err) {
    bumpIntakeMetric('exceptions');
    return {
      status: 'exception',
      reason: 'attachment_unreadable',
      detail: String(err?.message || err),
    };
  }

  const meta = event.metadata || {};
  const paymentSettled = detectPaymentSettled(event);

  let invoice = createInvoice({
    source: 'email',
    supplier: meta.suggestedSupplier || '',
    amount: meta.suggestedAmount != null ? Number(meta.suggestedAmount) : null,
    currency: meta.suggestedCurrency || 'NOK',
    vatRate: meta.suggestedVatRate != null ? Number(meta.suggestedVatRate) : null,
    dueDate: paymentSettled ? null : meta.suggestedDueDate || null,
    document: evidenceRef,
    paymentSettled,
    sourceIdentity: {
      key,
      provider: event.provider,
      messageId: event.messageId,
      attachmentId: attachment.attachmentId,
      contentHash: attachment.contentHash || null,
      receivedAt: event.receivedAt,
    },
  });

  rememberSourceIdentity(key, invoice.id);
  bumpIntakeMetric('executionObjectsCreated');

  invoice = await advanceInvoice(invoice, runtimeAdapters);

  if (invoice.state === INVOICE_STATES.NEEDS_DECISION) {
    bumpIntakeMetric('objectsRequiringDecision');
  } else if (invoice.state === INVOICE_STATES.COMPLETE) {
    const humanDecisions = (invoice.decisions || []).filter(
      (d) => d.source !== 'learning' && d.source !== 'memory',
    );
    if (!humanDecisions.length) bumpIntakeMetric('objectsCompletedSilently');
  }

  return {
    status: 'created',
    sourceIdentityKey: key,
    invoiceId: invoice.id,
    invoice,
  };
}

/**
 * Drain email adapter events through Engine intake (ports bind adapters).
 */
export async function ingestFromEmailAdapter(emailAdapter, runtimeAdapters = {}, ports = {}) {
  let receive;
  try {
    receive = await emailAdapter.receiveEvents();
  } catch (err) {
    bumpIntakeMetric('adapterErrors');
    return {
      status: 'error',
      detail: String(err?.message || err),
      results: [],
    };
  }

  if (receive.status === 'blocked' || receive.status === 'error') {
    bumpIntakeMetric('adapterErrors');
    return {
      status: receive.status,
      detail: receive.detail || '',
      results: [],
    };
  }

  const all = [];
  for (const event of receive.events || []) {
    const processed = await processSourceEvent(event, runtimeAdapters, ports);
    for (const result of processed.results || []) {
      if (result.invoice && ports.onInvoice) {
        ports.onInvoice(result.invoice, result);
      }
      all.push(result);
    }
    if (processed.status === 'ignored') {
      all.push({ status: 'ignored', reason: processed.reason, messageId: event.messageId });
    }
  }

  return { status: 'ok', detail: receive.detail || '', results: all };
}
