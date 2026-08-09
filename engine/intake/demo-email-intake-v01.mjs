/**
 * LIFE Email Intake v0.1 — acceptance scenarios
 * Run: node engine/intake/demo-email-intake-v01.mjs
 */

import { storeEvidenceBytes, clearEvidenceStore } from '../../adapters/documents/local.js';
import {
  getEmailAdapter,
  resetLocalMailbox,
  probeGmail,
} from '../../adapters/email/index.js';
import { FIXTURE_EVENTS } from '../../adapters/email/local-mailbox/fixtures.js';
import * as fiken from '../../adapters/accounting/fiken/adapter.js';
import * as government from '../../adapters/government/stub.js';
import {
  ingestFromEmailAdapter,
  processSourceEvent,
  clearIdempotency,
  resetIntakeMetrics,
  getIntakeMetrics,
} from './index.js';
import { clearRules, createMemoryStore, resetActiveStore } from '../learning/index.js';
import { confirmSupplierContext } from '../learning/supplier-learning.js';
import {
  clearMemory,
  createExecutionMemoryStore,
  resetActiveMemoryStore,
} from '../memory/index.js';
import { decideAndAdvance } from '../execution/invoice-flow.js';

const runtime = { accountingAdapter: fiken, governmentAdapter: government };
const invoices = new Map();

function ports() {
  return {
    storeEvidence: storeEvidenceBytes,
    getInvoiceById: (id) => invoices.get(id) || null,
    onInvoice: (inv) => invoices.set(inv.id, inv),
  };
}

function resetAll() {
  resetActiveStore(createMemoryStore());
  clearRules();
  resetActiveMemoryStore(createExecutionMemoryStore());
  clearMemory();
  clearIdempotency();
  clearEvidenceStore();
  resetIntakeMetrics();
  resetLocalMailbox();
  invoices.clear();
  globalThis.__executiaLocalMailboxCursor = { delivered: [] };
  globalThis.__executiaEvidenceStore = {};
  globalThis.__executiaIntakeIdempotency = {};
}

async function main() {
  console.log('=== Email Intake v0.1 acceptance ===\n');

  const gmail = await probeGmail();
  console.log(`Gmail probe: ${gmail.status} — ${gmail.detail}`);
  if (gmail.status !== 'blocked') throw new Error('Gmail must report blocked without credentials');

  resetAll();
  confirmSupplierContext('Circle K', 'business');
  confirmSupplierContext('Amazon AWS', 'business');

  console.log('\nA–E · Drain local mailbox fixtures');
  const emailAdapter = getEmailAdapter('local-mailbox');
  const batch1 = await ingestFromEmailAdapter(emailAdapter, runtime, ports());
  const created = batch1.results.filter((r) => r.status === 'created');
  const ignored = batch1.results.filter((r) => r.status === 'ignored');
  console.log(`  created=${created.length} ignored=${ignored.length}`);

  const bySupplier = Object.fromEntries(created.map((r) => [r.invoice.supplier, r.invoice]));

  const unk = bySupplier['Unknown Nordic AS'];
  console.log(`\nA. New supplier → state=${unk?.state} pending=${unk?.pendingDecision?.type}`);
  if (!unk || unk.state !== 'needs_decision') throw new Error('A: new supplier must Needs Decision');
  if (unk.pendingDecision?.type !== 'context') throw new Error('A: expect context decision');

  let unkDone = await decideAndAdvance(unk, 'context', 'business', runtime);
  invoices.set(unkDone.id, unkDone);
  if (unkDone.state === 'needs_decision' && unkDone.pendingDecision?.type === 'approve_payment') {
    unkDone = await decideAndAdvance(unkDone, 'approve_payment', 'approve', runtime);
    invoices.set(unkDone.id, unkDone);
  }
  console.log(`  after decisions → ${unkDone.state}`);
  if (unkDone.state !== 'complete') throw new Error('A: must complete after judgements');

  const ck = bySupplier['Circle K'];
  console.log(
    `\nB. Known supplier → state=${ck?.state} pending=${ck?.pendingDecision?.type} context=${ck?.context}`,
  );
  if (!ck) throw new Error('B: Circle K missing');
  if (ck.context !== 'business') throw new Error('B: context must be restored');
  if (ck.pendingDecision?.type === 'context') throw new Error('B: must not re-ask context');
  if (ck.pendingDecision?.type !== 'approve_payment') throw new Error('B: payment consent still required');
  const ckDone = await decideAndAdvance(ck, 'approve_payment', 'approve', runtime);
  invoices.set(ckDone.id, ckDone);
  console.log(`  after payment → ${ckDone.state}`);
  if (ckDone.state !== 'complete') throw new Error('B: must complete');

  const amz = bySupplier['Amazon AWS'];
  console.log(
    `\nC. Already-paid → state=${amz?.state} paymentSettled=${amz?.paymentSettled} pending=${amz?.pendingDecision?.type} payment=${amz?.consequences?.payment?.status}`,
  );
  if (!amz) throw new Error('C: Amazon receipt missing');
  if (!amz.paymentSettled) throw new Error('C: must be paymentSettled');
  if (amz.pendingDecision?.type === 'approve_payment') throw new Error('C: must not ask payment');
  if (amz.state !== 'complete') throw new Error('C: settled known receipt should complete');
  if (amz.consequences?.payment?.status !== 'settled') throw new Error('C: payment status settled');

  if (!ignored.some((r) => r.reason === 'no_candidate_documents')) {
    throw new Error('E: non-financial email must be ignored');
  }
  console.log('\nE. Non-financial email → ignored (no execution object)');

  console.log('\nD. Same email twice');
  const beforeCount = invoices.size;
  const ckEvent = FIXTURE_EVENTS.find((f) => f.id === 'msg_circle_k_002').event;
  const dup = await processSourceEvent(ckEvent, runtime, ports());
  console.log(`  duplicate status=${dup.results[0]?.status} invoiceId=${dup.results[0]?.invoiceId}`);
  if (dup.results[0]?.status !== 'duplicate') throw new Error('D: must be duplicate');
  if (invoices.size !== beforeCount) throw new Error('D: must not create new object');

  const metrics = getIntakeMetrics();
  console.log('\nMetrics:', metrics);
  if (metrics.duplicatesPrevented < 1) throw new Error('metrics: duplicatesPrevented');
  if (metrics.ignoredNonCandidates < 1) throw new Error('metrics: ignoredNonCandidates');

  console.log('\n=== Email Intake acceptance passed ===');
  console.log('Provider: local-mailbox (fixture). Gmail boundary blocked without credentials.');
}

main().catch((err) => {
  console.error('\nFAILED:', err.message);
  process.exit(1);
});
