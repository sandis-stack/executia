/**
 * LIFE · Email intake edge
 * Binds email + documents adapters; Engine never imports them.
 */

import { storeEvidenceBytes } from '/adapters/documents/local.js';
import { getEmailAdapter, probeGmail } from '/adapters/email/index.js';
import { ingestFromEmailAdapter, getIntakeMetrics } from '/engine/intake/index.js';
import { getRuntimeAdapters } from './adapters.js';
import { getInvoice, listInvoices, saveInvoice } from './store.js';
import { matchInvoiceAgainstBankAwaiting } from './bank-intake.js';

/**
 * Poll configured email adapter and create/advance execution objects.
 */
export async function pollEmailIntake({ provider = 'local-mailbox' } = {}) {
  const emailAdapter = getEmailAdapter(provider);
  const runtime = getRuntimeAdapters();

  const result = await ingestFromEmailAdapter(emailAdapter, runtime, {
    storeEvidence: storeEvidenceBytes,
    getInvoiceById: getInvoice,
    listInvoices,
    onInvoice: (invoice) => {
      saveInvoice(invoice);
    },
  });

  // Receipt may arrive after bank — match without forcing invoice-first ordering
  const results = [];
  for (const r of result.results || []) {
    if (r.invoice && r.status === 'created') {
      const matched = await matchInvoiceAgainstBankAwaiting(r.invoice);
      if (matched.status === 'matched') {
        results.push({ ...r, invoice: matched.invoice, bankMatch: matched });
        continue;
      }
    }
    results.push(r);
  }

  return {
    ...result,
    results,
    provider: emailAdapter.adapterInfo,
    gmailProbe: provider === 'gmail' ? await probeGmail() : null,
    metrics: getIntakeMetrics(),
  };
}
