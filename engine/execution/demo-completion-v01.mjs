/**
 * Execution Complete semantics — acceptance A–F
 * Run: node engine/execution/demo-completion-v01.mjs
 */

import { createInvoice } from '../objects/invoice.js';
import { advanceInvoice, decideAndAdvance } from './invoice-flow.js';
import { evaluateExecutionCompletion } from './completion.js';
import { storeEvidenceBytes, clearEvidenceStore, getEvidence } from '../../adapters/documents/local.js';
import * as government from '../../adapters/government/stub.js';
import {
  clearRules,
  createMemoryStore as createLearningStore,
  resetActiveStore,
} from '../learning/index.js';
import {
  clearMemory,
  createExecutionMemoryStore,
  resetActiveMemoryStore,
} from '../memory/index.js';

function reset() {
  resetActiveStore(createLearningStore());
  clearRules();
  resetActiveMemoryStore(createExecutionMemoryStore());
  clearMemory();
  clearEvidenceStore();
  globalThis.__executiaEvidenceStore = {};
}

function accountingAdapter(status, extras = {}) {
  return {
    synchronizeAccounting: async () => ({
      status,
      detail: extras.detail || `test:${status}`,
      metadata: extras.metadata || {},
      externalIds: extras.externalIds || (status === 'synchronized' ? { purchaseId: 'p1' } : null),
      at: new Date().toISOString(),
    }),
  };
}

async function businessInvoice(adapters) {
  const evidence = await storeEvidenceBytes({
    name: 'inv.pdf',
    mimeType: 'application/pdf',
    contentBase64: Buffer.from('%PDF-1.4 demo').toString('base64'),
  });
  let inv = createInvoice({
    supplier: 'Circle K',
    amount: 489,
    currency: 'NOK',
    vatRate: 25,
    dueDate: '2026-08-20',
    paymentSettled: true,
    document: evidence,
  });
  inv = await advanceInvoice(inv, adapters);
  if (inv.pendingDecision?.type === 'context') {
    inv = await decideAndAdvance(inv, 'context', 'business', adapters);
  }
  return inv;
}

async function main() {
  console.log('=== Execution Complete semantics ===\n');

  // A · truth + queued → Executing
  reset();
  console.log('A. Truth established + accounting queued → Executing');
  let inv = await businessInvoice({
    accountingAdapter: accountingAdapter('queued'),
    governmentAdapter: government,
    getEvidence,
  });
  console.log(`  state=${inv.state} truth=${inv.truthEstablished} sync=${inv.sync?.accounting?.status}`);
  if (!inv.truthEstablished) throw new Error('A: truth must be established');
  if (inv.state !== 'executing') throw new Error('A: must remain Executing');
  if (inv.state === 'complete') throw new Error('A: must not Complete');
  console.log('  PASS');

  // B · syncing → Executing
  reset();
  console.log('\nB. Accounting syncing → Executing');
  inv = await businessInvoice({
    accountingAdapter: accountingAdapter('syncing'),
    governmentAdapter: government,
    getEvidence,
  });
  if (inv.state !== 'executing' || !inv.truthEstablished) throw new Error('B: Executing + truth');
  console.log(`  state=${inv.state} sync=${inv.sync?.accounting?.status}`);
  console.log('  PASS');

  // C · temporary failure → Executing (retryable)
  reset();
  console.log('\nC. Temporary sync failure → Executing');
  inv = await businessInvoice({
    accountingAdapter: accountingAdapter('failed', {
      detail: 'provider unavailable',
      metadata: { reason: 'provider_error', httpStatus: 503 },
    }),
    governmentAdapter: government,
    getEvidence,
  });
  if (inv.state !== 'executing') throw new Error('C: temporary failure must stay Executing');
  if (inv.pendingDecision) throw new Error('C: no human interruption for temporary failure');
  // automatic retry
  inv = await advanceInvoice(inv, {
    accountingAdapter: accountingAdapter('synchronized'),
    governmentAdapter: government,
    getEvidence,
  });
  if (inv.state !== 'complete') throw new Error('C: retry success must Complete');
  console.log('  PASS');

  // D · human intervention → Needs Decision
  reset();
  console.log('\nD. Sync requires human intervention → Needs Decision');
  inv = await businessInvoice({
    accountingAdapter: accountingAdapter('failed', {
      metadata: { reason: 'credentials_missing' },
    }),
    governmentAdapter: government,
    getEvidence,
  });
  console.log(`  state=${inv.state} pending=${inv.pendingDecision?.type}`);
  if (inv.state !== 'needs_decision') throw new Error('D: Needs Decision required');
  if (inv.pendingDecision?.type !== 'accounting_sync') throw new Error('D: accounting_sync decision');
  if (String(inv.pendingDecision?.prompt || '').toLowerCase().includes('fiken')) {
    throw new Error('D: must not expose Fiken in normal UI prompt');
  }
  console.log('  PASS');

  // E · synchronized + all required → Complete
  reset();
  console.log('\nE. Synchronized + requirements satisfied → Execution Complete');
  inv = await businessInvoice({
    accountingAdapter: accountingAdapter('synchronized'),
    governmentAdapter: government,
    getEvidence,
  });
  const verdict = evaluateExecutionCompletion(inv);
  console.log(`  state=${inv.state} complete=${verdict.complete} unmet=${verdict.unmet}`);
  if (inv.state !== 'complete') throw new Error('E: must Execution Complete');
  if (!verdict.complete) throw new Error('E: policy must allow complete');
  console.log('  PASS');

  // F · accounting not required → Complete without sync
  reset();
  console.log('\nF. Accounting sync not required → may Complete without adapter success');
  const evidence = await storeEvidenceBytes({
    name: 'personal.pdf',
    mimeType: 'application/pdf',
    contentBase64: Buffer.from('%PDF-1.4 personal').toString('base64'),
  });
  inv = createInvoice({
    supplier: 'Cafe Sol',
    amount: 189,
    currency: 'NOK',
    context: 'personal',
    paymentSettled: true,
    document: evidence,
  });
  inv = await advanceInvoice(inv, {
    accountingAdapter: accountingAdapter('failed', { metadata: { reason: 'credentials_missing' } }),
    governmentAdapter: government,
    getEvidence,
  });
  console.log(`  state=${inv.state} sync=${inv.sync?.accounting?.status} context=${inv.context}`);
  if (inv.state !== 'complete') throw new Error('F: personal may Complete without accounting sync');
  if (inv.sync?.accounting?.status !== 'not_required') {
    throw new Error('F: accounting status should be not_required');
  }
  console.log('  PASS');

  console.log('\n=== Completion semantics acceptance passed ===');
}

main().catch((err) => {
  console.error('\nFAIL:', err.message || err);
  process.exit(1);
});
