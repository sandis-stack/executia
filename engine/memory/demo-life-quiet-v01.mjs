/**
 * LIFE quiet path — Memory restores context; payment consent never learned.
 *
 * Invoice 1: Business? + Approve payment?
 * Invoice 2: context restored · Approve payment only
 * Invoice 10: no context questions · Approve payment still required
 *
 * Run: node engine/memory/demo-life-quiet-v01.mjs
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
  resetActiveMemoryStore,
} from './index.js';
import * as government from '../../adapters/government/stub.js';

const accountingOk = {
  synchronizeAccounting: async () => ({
    status: 'synchronized',
    detail: 'test accounting sync',
    externalIds: { purchaseId: 'test_purchase' },
  }),
};
const adapters = { accountingAdapter: accountingOk, governmentAdapter: government };

function evidence(n) {
  return {
    id: `ev_quiet_${n}`,
    name: `supplier-${n}.pdf`,
    mimeType: 'application/pdf',
    size: 1024,
  };
}

async function runInvoice(n, { confirmContext = false } = {}) {
  let inv = startInvoiceFromUpload(
    {
      supplier: 'Circle K',
      amount: 300 + n,
      currency: 'NOK',
      vatRate: 25,
      dueDate: `2026-10-${String((n % 27) + 1).padStart(2, '0')}`,
    },
    evidence(n),
  );
  inv = await advanceInvoice(inv, adapters);
  const decisions = [];

  while (inv.state === 'needs_decision') {
    const pending = inv.pendingDecision;
    if (pending.type === 'context') {
      if (!confirmContext && n > 1) {
        throw new Error(`Invoice ${n}: unexpected context question`);
      }
      decisions.push('context');
      inv = await decideAndAdvance(inv, 'context', 'business', adapters, {
        vehicle: 'Tesla Model Y',
        project: 'Site Operations',
        costCentre: 'OPS-12',
        paymentMethod: 'corporate_card',
        expenseCategory: 'fuel',
      });
      continue;
    }
    if (pending.type === 'approve_payment') {
      decisions.push('approve_payment');
      inv = await decideAndAdvance(inv, 'approve_payment', 'approve', adapters);
      continue;
    }
    throw new Error(`Invoice ${n}: unexpected decision ${pending.type}`);
  }

  return { n, state: inv.state, decisions, metrics: inv.metrics, inv };
}

async function main() {
  resetActiveStore(createLearningStore());
  clearRules();
  resetActiveMemoryStore(createExecutionMemoryStore());
  clearMemory();

  console.log('=== LIFE quiet path (learn context, never consent) ===\n');

  const inv1 = await runInvoice(1, { confirmContext: true });
  console.log(`Invoice 1 → ${inv1.state} decisions=[${inv1.decisions.join(', ')}]`);
  console.log(
    `  metrics: asked=${inv1.metrics.questionsAsked} avoidedMem=${inv1.metrics.questionsAvoidedByMemory}`,
  );
  if (inv1.state !== 'complete') throw new Error('Invoice 1 must complete');
  if (inv1.decisions.join(',') !== 'context,approve_payment') {
    throw new Error(`Invoice 1 expected context+approve_payment, got ${inv1.decisions}`);
  }

  const inv2 = await runInvoice(2);
  console.log(`Invoice 2 → ${inv2.state} decisions=[${inv2.decisions.join(', ')}]`);
  console.log(
    `  metrics: asked=${inv2.metrics.questionsAsked} avoidedMem=${inv2.metrics.questionsAvoidedByMemory} memoryHits=${inv2.metrics.memoryHits}`,
  );
  if (inv2.decisions.join(',') !== 'approve_payment') {
    throw new Error(`Invoice 2 expected approve_payment only, got ${inv2.decisions}`);
  }
  if (!(inv2.metrics.questionsAvoidedByMemory >= 1 || inv2.inv.memory?.restored?.some((r) => r.field === 'context'))) {
    throw new Error('Invoice 2 must restore context from Memory');
  }

  for (let n = 3; n <= 9; n += 1) {
    const run = await runInvoice(n);
    if (run.decisions.join(',') !== 'approve_payment') {
      throw new Error(`Invoice ${n}: expected payment only, got ${run.decisions}`);
    }
  }
  console.log('Invoices 3–9 → approve_payment only (context quiet)');

  const inv10 = await runInvoice(10);
  console.log(`Invoice 10 → ${inv10.state} decisions=[${inv10.decisions.join(', ')}]`);
  console.log(
    `  metrics: asked=${inv10.metrics.questionsAsked} avoidedMem=${inv10.metrics.questionsAvoidedByMemory} complete=${inv10.metrics.executionComplete}`,
  );
  if (inv10.decisions.includes('context')) {
    throw new Error('Invoice 10 must not ask Business/Personal');
  }
  if (!inv10.decisions.includes('approve_payment')) {
    throw new Error('Invoice 10 must still require payment consent');
  }
  if (inv10.state !== 'complete') throw new Error('Invoice 10 must complete');

  console.log('\n=== Acceptance passed ===');
  console.log('Context remembered. Consent never learned. Engine quieter on administration.');
}

main().catch((err) => {
  console.error('\nFAILED:', err.message);
  process.exit(1);
});
