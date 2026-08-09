/**
 * LIFE · Bank intake edge
 * Binds banking adapter; Engine never imports bank vendors.
 */

import {
  getBankAdapter,
  probeOpenBanking,
} from '/adapters/banking/index.js';
import {
  ingestFromBankAdapter,
  getBankMetrics,
  resolveAmbiguousPaymentMatch,
  tryMatchInvoiceToBankAwaiting,
} from '/engine/payment/index.js';
import { getRuntimeAdapters } from './adapters.js';
import { getInvoice, listInvoices, saveInvoice } from './store.js';

function ports() {
  return {
    listInvoices,
    getInvoiceById: getInvoice,
    onInvoice: (invoice) => {
      saveInvoice(invoice);
    },
    resolvePaymentMatch: resolveAmbiguousPaymentMatch,
  };
}

/**
 * Poll bank adapter for payment-truth events.
 */
export async function pollBankIntake({ provider = 'local-bank', onlyIds = null } = {}) {
  const bankAdapter = getBankAdapter(provider);
  const runtime = getRuntimeAdapters();

  const result = await ingestFromBankAdapter(bankAdapter, runtime, ports(), { onlyIds });

  return {
    ...result,
    provider: bankAdapter.adapterInfo,
    openBankingProbe: provider === 'open-banking' ? await probeOpenBanking() : null,
    metrics: getBankMetrics(),
  };
}

/**
 * After a document invoice arrives, attach to bank-first unmatched payments.
 */
export async function matchInvoiceAgainstBankAwaiting(invoice) {
  const runtime = getRuntimeAdapters();
  return tryMatchInvoiceToBankAwaiting(invoice, runtime, ports());
}

export { getBankMetrics, resolveAmbiguousPaymentMatch };
