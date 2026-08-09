/**
 * LIFE Bank Intake v0.1 — acceptance scenarios A–F
 * Run: node engine/payment/demo-bank-intake-v01.mjs
 */

import { FIXTURE_TRANSACTIONS } from '../../adapters/banking/local-bank/fixtures.js';
import {
  getBankAdapter,
  probeOpenBanking,
  resetLocalBank,
} from '../../adapters/banking/index.js';
import * as fiken from '../../adapters/accounting/fiken/adapter.js';
import * as government from '../../adapters/government/stub.js';
import {
  advanceInvoice,
  decideAndAdvance,
} from '../execution/invoice-flow.js';
import { createInvoice } from '../objects/invoice.js';
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
import {
  processBankTransaction,
  tryMatchInvoiceToBankAwaiting,
  clearBankIdempotency,
  resetBankMetrics,
  getBankMetrics,
  resolveAmbiguousPaymentMatch,
} from './index.js';

const runtime = { accountingAdapter: fiken, governmentAdapter: government };
const invoices = new Map();

function ports() {
  return {
    listInvoices: () => [...invoices.values()],
    getInvoiceById: (id) => invoices.get(id) || null,
    onInvoice: (inv) => invoices.set(inv.id, inv),
  };
}

function tx(id) {
  const item = FIXTURE_TRANSACTIONS.find((f) => f.id === id);
  if (!item) throw new Error(`missing fixture ${id}`);
  return { ...item.tx, metadata: { ...item.tx.metadata } };
}

function evidence(name) {
  return { id: `ev_${name}`, name: `${name}.pdf`, mimeType: 'application/pdf', size: 512 };
}

function resetAll() {
  resetActiveStore(createLearningStore());
  clearRules();
  resetActiveMemoryStore(createExecutionMemoryStore());
  clearMemory();
  clearBankIdempotency();
  resetBankMetrics();
  resetLocalBank();
  invoices.clear();
  globalThis.__executiaBankIdempotency = {};
  globalThis.__executiaLocalBankCursor = { delivered: [] };
}

async function decideUntil(invoice, types = ['context', 'approve_payment']) {
  let inv = invoice;
  const taken = [];
  while (inv.state === 'needs_decision') {
    const t = inv.pendingDecision?.type;
    if (t === 'context' && types.includes('context')) {
      taken.push('context');
      inv = await decideAndAdvance(inv, 'context', 'business', runtime, {
        vehicle: 'Tesla Model Y',
        costCentre: 'OPS-12',
        expenseCategory: 'fuel',
      });
      invoices.set(inv.id, inv);
      continue;
    }
    if (t === 'approve_payment' && types.includes('approve_payment')) {
      taken.push('approve_payment');
      inv = await decideAndAdvance(inv, 'approve_payment', 'approve', runtime);
      invoices.set(inv.id, inv);
      continue;
    }
    break;
  }
  return { inv, taken };
}

async function main() {
  console.log('=== Bank Intake v0.1 acceptance ===\n');

  const open = await probeOpenBanking();
  console.log(`Open Banking probe: ${open.status} — ${open.detail}`);
  if (open.status !== 'blocked') throw new Error('Open Banking must report blocked without credentials');

  const local = getBankAdapter('local-bank');
  console.log(`Provider selected: ${local.adapterInfo.vendor} (${local.adapterInfo.mode})`);

  // ── A · Supplier invoice + matching booked payment ──
  resetAll();
  console.log('\nA. Supplier invoice + matching booked payment');
  let a = createInvoice({
    supplier: 'Circle K',
    amount: 489,
    currency: 'NOK',
    vatRate: 25,
    dueDate: '2026-08-15',
    paymentReference: 'INV-CK-440',
    document: evidence('circle-k-a'),
  });
  a = await advanceInvoice(a, runtime);
  invoices.set(a.id, a);
  ({ inv: a } = await decideUntil(a, ['context'])); // leave approve for bank
  const aResult = await processBankTransaction(tx('tx_circle_k_pay_001'), runtime, ports());
  a = aResult.invoice;
  console.log(`  status=${aResult.status} state=${a.state} payment=${a.paymentTruth?.status}`);
  if (aResult.status !== 'matched') throw new Error('A: expected automatic match');
  if (a.paymentTruth?.status !== 'booked') throw new Error('A: payment truth must be booked');
  if (a.state !== 'complete') throw new Error('A: must reach Execution Complete');
  if (!a.paymentConfirmed) throw new Error('A: paymentConfirmed expected');
  console.log('  PASS');

  // ── D · Same transaction twice (uses A state) ──
  console.log('\nD. Same transaction ingested twice');
  const dResult = await processBankTransaction(tx('tx_circle_k_pay_001_dup'), runtime, ports());
  console.log(`  status=${dResult.status}`);
  if (dResult.status !== 'duplicate') throw new Error('D: expected duplicate');
  if (getBankMetrics().duplicatesPrevented < 1) throw new Error('D: duplicatesPrevented metric');
  console.log('  PASS');

  // ── E · Payment reversed ──
  console.log('\nE. Payment reversed');
  const eResult = await processBankTransaction(tx('tx_circle_k_pay_001_rev'), runtime, ports());
  const e = eResult.invoice;
  console.log(`  status=${eResult.status} state=${e.state} payment=${e.paymentTruth?.status}`);
  if (eResult.status !== 'reversed') throw new Error('E: expected reversed');
  if (e.paymentTruth?.status !== 'reversed') throw new Error('E: payment truth reversed');
  if (e.state === 'complete') throw new Error('E: must not remain Complete');
  if (e.paymentSettled) throw new Error('E: paymentSettled must be false');
  if (!e.paymentTruth?.history?.length) throw new Error('E: history must be preserved');
  console.log('  PASS');

  // ── B · Ambiguous match ──
  resetAll();
  console.log('\nB. Same amount, two candidate invoices');
  let b1 = createInvoice({
    supplier: 'Alpha AS',
    amount: 500,
    currency: 'NOK',
    dueDate: '2026-08-20',
    context: 'business',
    document: evidence('alpha'),
  });
  let b2 = createInvoice({
    supplier: 'Beta AS',
    amount: 500,
    currency: 'NOK',
    dueDate: '2026-08-21',
    context: 'business',
    document: evidence('beta'),
  });
  b1 = await advanceInvoice(b1, runtime);
  b2 = await advanceInvoice(b2, runtime);
  invoices.set(b1.id, b1);
  invoices.set(b2.id, b2);
  const bResult = await processBankTransaction(tx('tx_ambiguous_500_002'), runtime, ports());
  console.log(`  status=${bResult.status} pending=${bResult.invoice?.pendingDecision?.type}`);
  if (bResult.status !== 'ambiguous') throw new Error('B: expected ambiguous');
  if (bResult.invoice?.pendingDecision?.type !== 'payment_match') {
    throw new Error('B: Needs Decision payment_match required');
  }
  // Resolve explicitly — no silent guess
  const resolved = await resolveAmbiguousPaymentMatch(bResult.invoice, b1.id, runtime, ports());
  console.log(`  resolved → ${resolved.supplier} state=${resolved.state}`);
  if (resolved.id !== b1.id) throw new Error('B: resolve must attach to chosen invoice');
  console.log('  PASS');

  // ── C · Card first, receipt later ──
  resetAll();
  console.log('\nC. Card purchase arrives first, receipt later');
  const cBank = await processBankTransaction(tx('tx_card_cafe_003'), runtime, ports());
  console.log(`  bank-first status=${cBank.status} awaiting=${cBank.invoice?.awaitingEvidence}`);
  if (cBank.status !== 'awaiting_evidence') throw new Error('C: expected awaiting_evidence');
  if (!cBank.invoice?.awaitingEvidence) throw new Error('C: awaitingEvidence flag');

  let receipt = createInvoice({
    supplier: 'Cafe Sol',
    amount: 189,
    currency: 'NOK',
    context: 'personal',
    document: evidence('cafe-sol'),
  });
  receipt = await advanceInvoice(receipt, runtime);
  invoices.set(receipt.id, receipt);
  const cMatch = await tryMatchInvoiceToBankAwaiting(receipt, runtime, ports());
  console.log(`  receipt match=${cMatch.status} state=${cMatch.invoice?.state}`);
  if (cMatch.status !== 'matched') throw new Error('C: expected receipt match');
  if (cMatch.invoice.state !== 'complete') throw new Error('C: must Complete after match');
  if (cMatch.invoice.paymentTruth?.status !== 'booked') throw new Error('C: bank still provides truth');
  console.log('  PASS');

  // ── F · Known supplier — Memory context, bank payment truth ──
  resetAll();
  console.log('\nF. Known supplier — Memory restores context; bank proves payment');
  let seed = createInvoice({
    supplier: 'Circle K',
    amount: 100,
    currency: 'NOK',
    vatRate: 25,
    dueDate: '2026-07-01',
    document: evidence('seed'),
  });
  seed = await advanceInvoice(seed, runtime);
  invoices.set(seed.id, seed);
  ({ inv: seed } = await decideUntil(seed, ['context', 'approve_payment']));
  if (seed.state !== 'complete') throw new Error('F: seed must complete');

  invoices.clear();
  clearBankIdempotency();
  resetBankMetrics();

  let f = createInvoice({
    supplier: 'Circle K',
    amount: 489,
    currency: 'NOK',
    vatRate: 25,
    dueDate: '2026-08-15',
    paymentReference: 'INV-CK-440',
    document: evidence('circle-k-f'),
  });
  f = await advanceInvoice(f, runtime);
  invoices.set(f.id, f);
  console.log(`  after advance: context=${f.context} pending=${f.pendingDecision?.type}`);
  if (f.context !== 'business') throw new Error('F: Memory must restore business context');
  if (f.pendingDecision?.type === 'context') throw new Error('F: must not re-ask context');

  const fResult = await processBankTransaction(tx('tx_circle_k_pay_001'), runtime, ports());
  f = fResult.invoice;
  console.log(`  bank match state=${f.state} payment=${f.paymentTruth?.status} memory=${(f.memory?.restored || []).map((r) => r.field).join(',')}`);
  if (fResult.status !== 'matched') throw new Error('F: bank match required');
  if (f.paymentTruth?.status !== 'booked') throw new Error('F: bank provides payment truth');
  if (f.state !== 'complete') throw new Error('F: must Complete from bank truth');
  // Memory must not have manufactured payment — bank event is the proof
  if (!f.paymentTruth?.transactionId) throw new Error('F: transactionId required from bank');
  console.log('  PASS');

  const metrics = getBankMetrics();
  console.log('\nDeveloper metrics (session totals vary by scenario resets):');
  console.log(JSON.stringify(metrics, null, 2));

  console.log('\n=== All Bank Intake acceptance scenarios passed ===');
}

main().catch((err) => {
  console.error('\nFAIL:', err.message || err);
  process.exit(1);
});
