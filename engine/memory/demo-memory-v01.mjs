/**
 * Execution Memory v0.1 — acceptance demonstration
 * Invoice 1 asks context → confirmed. Later invoices restore context.
 * Payment consent is never skipped (each payable is a new obligation).
 *
 * Run: node engine/memory/demo-memory-v01.mjs
 */

import {
  advanceInvoice,
  decideAndAdvance,
  startInvoiceFromUpload,
} from '../execution/invoice-flow.js';
import {
  clearRules,
  createMemoryStore as createLearningStore,
  resetActiveStore,
} from '../learning/index.js';
import {
  clearMemory,
  createExecutionMemoryStore,
  getMemoryRecord,
  memoryId,
  MEMORY_TYPES,
  resetActiveMemoryStore,
} from './index.js';
import * as fiken from '../../adapters/accounting/fiken/adapter.js';
import * as government from '../../adapters/government/stub.js';

const adapters = { accountingAdapter: fiken, governmentAdapter: government };

const CIRCLE_K_CONTEXT = {
  vehicle: 'Tesla Model Y',
  project: 'Site Operations',
  costCentre: 'OPS-12',
  paymentMethod: 'corporate_card',
  expenseCategory: 'fuel',
  recurring: false,
  vatTreatment: { rate: 25 },
};

function evidence(n) {
  return {
    id: `ev_mem_${n}`,
    name: `circle-k-${n}.pdf`,
    mimeType: 'application/pdf',
    size: 2048,
  };
}

async function processInvoice(n, { allowContext = false } = {}) {
  let inv = startInvoiceFromUpload(
    {
      supplier: 'Circle K',
      amount: 400 + n,
      currency: 'NOK',
      vatRate: 25,
      dueDate: `2026-09-${String((n % 28) + 1).padStart(2, '0')}`,
    },
    evidence(n),
  );
  inv = await advanceInvoice(inv, adapters);
  const decisions = [];

  while (inv.state === 'needs_decision') {
    const pending = inv.pendingDecision;
    if (pending.type === 'context') {
      if (!allowContext) throw new Error(`Invoice ${n}: unexpected context question`);
      decisions.push('context=business');
      inv = await decideAndAdvance(inv, 'context', 'business', adapters, CIRCLE_K_CONTEXT);
      continue;
    }
    if (pending.type === 'approve_payment') {
      decisions.push('approve_payment=approve');
      inv = await decideAndAdvance(inv, 'approve_payment', 'approve', adapters);
      continue;
    }
    break;
  }

  return { n, state: inv.state, decisions, inv };
}

function assertContextRestored(inv, label) {
  const ec = inv.executionContext || {};
  const checks = [
    ['context', inv.context, 'business'],
    ['vehicle', ec.vehicle, CIRCLE_K_CONTEXT.vehicle],
    ['project', ec.project, CIRCLE_K_CONTEXT.project],
    ['costCentre', ec.costCentre, CIRCLE_K_CONTEXT.costCentre],
    ['paymentMethod', ec.paymentMethod, CIRCLE_K_CONTEXT.paymentMethod],
    ['expenseCategory', inv.expenseCategory, CIRCLE_K_CONTEXT.expenseCategory],
    ['vat', inv.vat?.rate, 25],
  ];
  for (const [name, actual, expected] of checks) {
    if (actual !== expected) {
      throw new Error(`${label}: expected ${name}=${expected}, got ${actual}`);
    }
  }
}

async function main() {
  resetActiveStore(createLearningStore());
  clearRules();
  resetActiveMemoryStore(createExecutionMemoryStore());
  clearMemory();

  console.log('=== Execution Memory v0.1 demonstration ===\n');

  console.log('Invoice 1 · context asked → confirmed (payment also required)');
  const first = await processInvoice(1, { allowContext: true });
  console.log(`  → state=${first.state}`);
  console.log(`  → decisions=[${first.decisions.join(', ')}]`);
  if (first.state !== 'complete') throw new Error('Invoice 1 must complete');
  if (!first.decisions.includes('context=business')) {
    throw new Error('Invoice 1 must ask Business/Personal');
  }
  if (!first.decisions.includes('approve_payment=approve')) {
    throw new Error('Invoice 1 must ask payment consent');
  }
  assertContextRestored(first.inv, 'Invoice 1 after confirm');
  console.log('  → confirmed context: Business · Vehicle · Project · Cost centre · VAT · Payment method');

  const memAfter1 = getMemoryRecord(memoryId(MEMORY_TYPES.SUPPLIER, 'circle k'));
  console.log(
    `  → Supplier Memory: confidence=${memAfter1.confidence} executions=${memAfter1.executionCount}`,
  );
  console.log(`     vehicle=${getMemoryRecord(memAfter1.links.vehicleId)?.displayName}`);
  console.log(`     project=${getMemoryRecord(memAfter1.links.projectId)?.displayName}`);
  console.log(`     costCentre=${memAfter1.attributes.costCentre}`);

  console.log('\nInvoices 2–19 · context restored; payment consent still required');
  for (let n = 2; n <= 19; n += 1) {
    const run = await processInvoice(n);
    if (run.state !== 'complete') throw new Error(`Invoice ${n} must complete`);
    if (run.decisions.includes('context=business')) {
      throw new Error(`Invoice ${n} must not re-ask context`);
    }
    if (!run.decisions.includes('approve_payment=approve')) {
      throw new Error(`Invoice ${n} must still require payment consent`);
    }
  }
  console.log('  → 18 invoices: context quiet, payment consent each time');

  console.log('\nInvoice 20 · entire context restored; payment still asked');
  const last = await processInvoice(20);
  console.log(`  → state=${last.state}`);
  console.log(`  → decisions=[${last.decisions.join(', ')}]`);
  console.log(`  → memory restored fields: ${(last.inv.memory?.restored || []).map((r) => r.field).join(', ')}`);
  if (last.state !== 'complete') throw new Error('Invoice 20 must complete');
  if (last.decisions.includes('context=business')) throw new Error('Invoice 20 must not ask context');
  if (!last.decisions.includes('approve_payment=approve')) {
    throw new Error('Invoice 20 must still require payment consent');
  }
  assertContextRestored(last.inv, 'Invoice 20');

  const mem = getMemoryRecord(memoryId(MEMORY_TYPES.SUPPLIER, 'circle k'));
  console.log(`  → Supplier Memory executionCount=${mem.executionCount} confidence=${mem.confidence}`);
  if (mem.executionCount !== 20) {
    throw new Error(`Expected executionCount 20, got ${mem.executionCount}`);
  }

  const accounting = last.inv.consequences?.accounting;
  console.log(
    `  → accounting context: project=${accounting?.executionContext?.project} costCentre=${accounting?.executionContext?.costCentre} vehicle=${accounting?.executionContext?.vehicle}`,
  );

  console.log('\n=== Execution Memory acceptance passed ===');
  console.log('Context remembered. Consent never learned.');
}

main().catch((err) => {
  console.error('\nFAILED:', err.message);
  process.exit(1);
});
