/**
 * Engine Learning v0.1 — acceptance demonstration
 * Run: node engine/learning/demo-learning-v01.mjs
 */

import {
  advanceInvoice,
  decideAndAdvance,
  startInvoiceFromUpload,
} from '../execution/invoice-flow.js';
import {
  clearRules,
  createMemoryStore,
  getRule,
  listRules,
  resetActiveStore,
  bandForConfidence,
} from './index.js';
import {
  clearMemory,
  createExecutionMemoryStore,
  resetActiveMemoryStore,
} from '../memory/index.js';
import * as fiken from '../../adapters/accounting/fiken/adapter.js';
import * as government from '../../adapters/government/stub.js';

const adapters = { accountingAdapter: fiken, governmentAdapter: government };
const evidence = (name) => ({
  id: `ev_${name.replace(/\W+/g, '_').toLowerCase()}`,
  name: `${name}.pdf`,
  mimeType: 'application/pdf',
  size: 1024,
});

function line(msg) {
  console.log(msg);
}

async function runInvoice(label, meta, { decide } = {}) {
  let inv = startInvoiceFromUpload(meta, evidence(meta.supplier || 'unknown'));
  inv = await advanceInvoice(inv, adapters);
  const day1Decisions = [];

  // Default: answer payment consent when present; context only via decide()
  const resolver =
    decide ||
    ((pending) => (pending.type === 'approve_payment' ? { optionId: 'approve' } : null));

  while (inv.state === 'needs_decision') {
    const pending = inv.pendingDecision;
    const choice = resolver(pending, inv);
    if (!choice) break;
    day1Decisions.push(`${pending.type}=${choice.optionId}`);
    inv = await decideAndAdvance(inv, choice.type || pending.type, choice.optionId, adapters, choice.extras || {});
  }

  return { label, state: inv.state, decisions: day1Decisions, applied: inv.learning?.applied || [], inv };
}

async function main() {
  resetActiveStore(createMemoryStore());
  clearRules();
  resetActiveMemoryStore(createExecutionMemoryStore());
  clearMemory();

  line('=== Engine Learning v0.1 demonstration ===\n');

  // --- Day 1: Circle K ---
  line('Day 1 · Circle K');
  const d1 = await runInvoice('Circle K Day 1', {
    supplier: 'Circle K',
    amount: 489,
    currency: 'NOK',
    vatRate: 25,
    dueDate: '2026-08-20',
  }, {
    decide: (pending) => {
      if (pending.type === 'context') return { optionId: 'business' };
      if (pending.type === 'approve_payment') return { optionId: 'approve' };
      return null;
    },
  });
  line(`  → ${d1.state} after decisions: [${d1.decisions.join(', ')}]`);
  const ctxRule = getRule('context', 'circle k');
  line(`  → Learned context: ${ctxRule.value} confidence=${ctxRule.confidence} count=${ctxRule.confirmationCount} band=${bandForConfidence(ctxRule.confidence)}`);

  // --- Day 10: Circle K (context quiet; payment consent still required) ---
  line('\nDay 10 · Circle K');
  const d10 = await runInvoice('Circle K Day 10', {
    supplier: 'Circle K',
    amount: 312,
    currency: 'NOK',
    vatRate: 25,
    dueDate: '2026-09-01',
  });
  line(`  → decisions asked: [${d10.decisions.join(', ') || 'none'}]`);
  line(`  → state: ${d10.state}`);
  line(`  → learning applied: ${d10.applied.map((a) => a.kind).join(', ') || 'none'}`);
  if (d10.state !== 'complete') throw new Error('Circle K Day 10 must complete');
  if (d10.decisions.some((d) => d.startsWith('context='))) {
    throw new Error('Circle K Day 10 must not re-ask context');
  }
  if (!d10.decisions.includes('approve_payment=approve')) {
    throw new Error('Circle K Day 10 must still require payment consent');
  }

  // --- Amazon AWS ---
  line('\nAmazon AWS · Day 1 (business)');
  const aws1 = await runInvoice('AWS Day 1', {
    supplier: 'Amazon AWS',
    amount: 2400,
    currency: 'NOK',
    dueDate: '2026-08-15',
  }, {
    decide: (p) => (p.type === 'context' ? { optionId: 'business' } : p.type === 'approve_payment' ? { optionId: 'approve' } : null),
  });
  line(`  → ${aws1.state} decisions=[${aws1.decisions.join(', ')}]`);

  line('Amazon AWS · Day 10 (context quiet)');
  const aws10 = await runInvoice('AWS Day 10', {
    supplier: 'Amazon AWS',
    amount: 2400,
    currency: 'NOK',
    dueDate: '2026-09-15',
  });
  line(`  → ${aws10.state} decisions=[${aws10.decisions.join(', ') || 'none'}] applied=${aws10.applied.map((a) => a.kind).join(',')}`);
  if (aws10.state !== 'complete') throw new Error('AWS Day 10 must complete');
  if (aws10.decisions.some((d) => d.startsWith('context='))) throw new Error('AWS Day 10 context not quiet');
  if (!aws10.decisions.includes('approve_payment=approve')) throw new Error('AWS Day 10 must ask payment');

  // --- Netflix ---
  line('\nNetflix · Day 1 (personal + recurring)');
  const net1 = await runInvoice('Netflix Day 1', {
    supplier: 'Netflix',
    amount: 149,
    currency: 'NOK',
    dueDate: '2026-08-12',
    recurring: true,
  }, {
    decide: (p) =>
      p.type === 'context'
        ? { optionId: 'personal', extras: { recurring: true, expenseCategory: 'subscriptions' } }
        : p.type === 'approve_payment'
          ? { optionId: 'approve' }
          : null,
  });
  line(`  → ${net1.state} decisions=[${net1.decisions.join(', ')}]`);

  line('Netflix · Day 10 (context quiet)');
  const net10 = await runInvoice('Netflix Day 10', {
    supplier: 'Netflix',
    amount: 149,
    currency: 'NOK',
    dueDate: '2026-09-12',
  });
  line(`  → ${net10.state} decisions=[${net10.decisions.join(', ') || 'none'}] context=${net10.inv.context} recurring=${JSON.stringify(net10.inv.recurring)}`);
  if (net10.state !== 'complete') throw new Error('Netflix Day 10 must complete');
  if (net10.decisions.some((d) => d.startsWith('context='))) throw new Error('Netflix Day 10 context not quiet');
  if (!net10.decisions.includes('approve_payment=approve')) throw new Error('Netflix Day 10 must ask payment');

  // --- Rema 1000 ---
  line('\nRema 1000 · Day 1 (personal)');
  const rema1 = await runInvoice('Rema Day 1', {
    supplier: 'Rema 1000',
    amount: 867,
    currency: 'NOK',
    dueDate: '2026-08-10',
  }, {
    decide: (p) => (p.type === 'context' ? { optionId: 'personal' } : p.type === 'approve_payment' ? { optionId: 'approve' } : null),
  });
  line(`  → ${rema1.state}`);

  line('Rema 1000 · Day 10 (context quiet)');
  const rema10 = await runInvoice('Rema Day 10', {
    supplier: 'Rema 1000',
    amount: 420,
    currency: 'NOK',
    dueDate: '2026-09-10',
  });
  line(`  → ${rema10.state} decisions=[${rema10.decisions.join(', ') || 'none'}]`);
  if (rema10.state !== 'complete') throw new Error('Rema Day 10 must complete');
  if (rema10.decisions.some((d) => d.startsWith('context='))) throw new Error('Rema Day 10 context not quiet');
  if (!rema10.decisions.includes('approve_payment=approve')) throw new Error('Rema Day 10 must ask payment');

  // --- Known supplier (already learned Circle K) ---
  line('\nKnown supplier invoice · Circle K (context learned; payment still required)');
  const known = await runInvoice('Known', {
    supplier: 'Circle K',
    amount: 99,
    currency: 'NOK',
    dueDate: '2026-10-01',
  });
  line(`  → ${known.state} decisions=[${known.decisions.join(', ') || 'none'}]`);
  if (known.state !== 'complete') throw new Error('Known supplier should complete');
  if (known.decisions.some((d) => d.startsWith('context='))) throw new Error('Known supplier must not re-ask context');
  if (!known.decisions.includes('approve_payment=approve')) throw new Error('Known supplier must ask payment');

  // --- Unknown supplier — must still ask; must not store context against blank ---
  line('\nUnknown supplier invoice');
  const rulesBefore = listRules().length;
  const unk = await runInvoice('Unknown', {
    supplier: '',
    amount: 200,
    currency: 'NOK',
    dueDate: '2026-08-30',
  }, {
    decide: (p) => {
      if (p.type === 'context') return { optionId: 'business' };
      if (p.type === 'supplier') return { optionId: 'accept_unknown' };
      if (p.type === 'approve_payment') return { optionId: 'approve' };
      return null;
    },
  });
  line(`  → ${unk.state} decisions=[${unk.decisions.join(', ')}]`);
  line(`  → rules stored after unknown path: ${listRules().length - rulesBefore} (expect 0 learnable context)`);
  if (!unk.decisions.includes('context=business')) throw new Error('Unknown must ask context');
  if (!unk.decisions.includes('supplier=accept_unknown')) throw new Error('Unknown must ask supplier');
  if (getRule('context', '')) throw new Error('Must not learn empty supplier context');

  // --- Contradiction: Circle K business → personal reduces confidence ---
  line('\nRule evolution · Circle K Business → Personal');
  let flip = startInvoiceFromUpload({
    supplier: 'Circle K',
    amount: 50,
    currency: 'NOK',
    dueDate: '2026-11-01',
    // Force decision by clearing applied path: temporarily contradict via decide on a fresh invoice
    // First advance will apply business silently — so we need to decideAndAdvance a change.
    // Simulate person correcting on an invoice that asked (low confidence after we force replace).
  }, evidence('Circle K flip'));

  // Direct confirmation change through learning API path via decide when interrupted.
  // After contradiction confidence is low, next invoice should ask.
  const { confirmSupplierContext } = await import('./supplier-learning.js');
  const replaced = confirmSupplierContext('Circle K', 'personal');
  line(`  → after change: value=${replaced.value} confidence=${replaced.confidence} band=${bandForConfidence(replaced.confidence)}`);
  if (bandForConfidence(replaced.confidence) !== 'low') throw new Error('Contradiction must reduce to low');

  flip = await advanceInvoice(flip, adapters);
  line(`  → next Circle K asks again: state=${flip.state} pending=${flip.pendingDecision?.type || 'none'}`);
  if (flip.state !== 'needs_decision' || flip.pendingDecision?.type !== 'context') {
    throw new Error('Low confidence must surface Needs Decision');
  }

  line('\n=== All learning scenarios passed ===');
  line(`Rules in store: ${listRules().length}`);
  for (const r of listRules().filter((x) => x.kind === 'context')) {
    line(`  context · ${r.key} → ${r.value} (${r.confidence}, n=${r.confirmationCount})`);
  }
}

main().catch((err) => {
  console.error('\nFAILED:', err.message);
  process.exit(1);
});
