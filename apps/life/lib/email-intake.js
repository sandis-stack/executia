/**
 * LIFE · Email intake edge
 * Binds email + documents adapters; Engine never imports them.
 */

import { storeEvidenceBytes } from '/adapters/documents/local.js';
import { getEmailAdapter, probeGmail } from '/adapters/email/index.js';
import { ingestFromEmailAdapter, getIntakeMetrics } from '/engine/intake/index.js';
import { getRuntimeAdapters } from './adapters.js';
import { getInvoice, saveInvoice } from './store.js';

/**
 * Poll configured email adapter and create/advance execution objects.
 */
export async function pollEmailIntake({ provider = 'local-mailbox' } = {}) {
  const emailAdapter = getEmailAdapter(provider);
  const runtime = getRuntimeAdapters();

  const result = await ingestFromEmailAdapter(emailAdapter, runtime, {
    storeEvidence: storeEvidenceBytes,
    getInvoiceById: getInvoice,
    onInvoice: (invoice) => {
      saveInvoice(invoice);
    },
  });

  return {
    ...result,
    provider: emailAdapter.adapterInfo,
    gmailProbe: provider === 'gmail' ? await probeGmail() : null,
    metrics: getIntakeMetrics(),
  };
}
