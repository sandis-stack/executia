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

  while (inv.state === 'needs_decision' && decide) {
    const pending = inv.pendingDecision;
    const choice = decide(pending, inv);
    if (!choice) break;
    day1Decisions.push(`${pending.type}=${choice.optionId}`);
    inv = await decideAndAdvance(inv, choice.type || pending.type, choice.optionId, adapters, choice.extras || {});
  }

  return { label, state: inv.state, decisions: day1Decisions, applied: inv.learning?.applied || [], inv };
}

async function main() {
  resetActiveStore(createMemoryStore());
  clearRules();

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

  // --- Day 10: Circle K ---
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
  if (d10.state !== 'complete' || d10.decisions.length) {
    throw new Error('Circle K Day 10 must complete with no decisions');
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

  line('Amazon AWS · Day 10 (quiet)');
  const aws10 = await runInvoice('AWS Day 10', {
    supplier: 'Amazon AWS',
    amount: 2400,
    currency: 'NOK',
    dueDate: '2026-09-15',
  });
  line(`  → ${aws10.state} decisions=[${aws10.decisions.join(', ') || 'none'}] applied=${aws10.applied.map((a) => a.kind).join(',')}`);
  if (aws10.state !== 'complete' || aws10.decisions.length) throw new Error('AWS Day 10 failed silence');

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

  line('Netflix · Day 10 (quiet)');
  const net10 = await runInvoice('Netflix Day 10', {
    supplier: 'Netflix',
    amount: 149,
    currency: 'NOK',
    dueDate: '2026-09-12',
  });
  line(`  → ${net10.state} decisions=[${net10.decisions.join(', ') || 'none'}] context=${net10.inv.context} recurring=${JSON.stringify(net10.inv.recurring)}`);
  if (net10.state !== 'complete' || net10.decisions.length) throw new Error('Netflix Day 10 failed silence');

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

  line('Rema 1000 · Day 10 (quiet)');
  const rema10 = await runInvoice('Rema Day 10', {
    supplier: 'Rema 1000',
    amount: 420,
    currency: 'NOK',
    dueDate: '2026-09-10',
  });
  line(`  → ${rema10.state} decisions=[${rema10.decisions.join(', ') || 'none'}]`);
  if (rema10.state !== 'complete' || rema10.decisions.length) throw new Error('Rema Day 10 failed silence');

  // --- Known supplier (already learned Circle K) ---
  line('\nKnown supplier invoice · Circle K (already learned)');
  const known = await runInvoice('Known', {
    supplier: 'Circle K',
    amount: 99,
    currency: 'NOK',
    dueDate: '2026-10-01',
  });
  line(`  → ${known.state} decisions=[${known.decisions.join(', ') || 'none'}]`);
  if (known.state !== 'complete') throw new Error('Known supplier should complete quietly');

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
