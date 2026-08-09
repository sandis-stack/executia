/**
 * Fiken Accounting Adapter v0.1 — acceptance
 *
 * 1) Contract + blocked-credentials safety (always)
 * 2) Mock HTTP: create + idempotent retry (always)
 * 3) Live Fiken: one real invoice when credentials exist
 *
 * Run: node adapters/accounting/fiken/demo-fiken-sync-v01.mjs
 */

import { storeEvidenceBytes, clearEvidenceStore, getEvidence } from '../../documents/local.js';
import * as fiken from './adapter.js';
import {
  clearFikenIdempotency,
  findFikenMapping,
  probeFikenAuth,
  credentialsPresent,
  loadFikenConfig,
} from './adapter.js';
import {
  createAccountingIntent,
  ACCOUNTING_SYNC_STATUS,
  normalizeAccountingSyncStatus,
} from '../../../engine/accounting/index.js';
import { createInvoice } from '../../../engine/objects/invoice.js';
import {
  advanceInvoice,
  decideAndAdvance,
} from '../../../engine/execution/invoice-flow.js';
import {
  clearRules,
  createMemoryStore as createLearningStore,
  resetActiveStore,
} from '../../../engine/learning/index.js';
import {
  clearMemory,
  createExecutionMemoryStore,
  resetActiveMemoryStore,
} from '../../../engine/memory/index.js';
import * as government from '../../government/stub.js';

function resetLocal() {
  resetActiveStore(createLearningStore());
  clearRules();
  resetActiveMemoryStore(createExecutionMemoryStore());
  clearMemory();
  clearEvidenceStore();
  clearFikenIdempotency();
  globalThis.__executiaEvidenceStore = {};
  globalThis.__executiaFikenIdempotency = {};
}

function mockFetchFactory() {
  const state = {
    contacts: [{ contactId: 77, name: 'Circle K', supplier: true }],
    purchases: new Map(),
    attachments: new Map(),
    nextPurchaseId: 9001,
    createCalls: 0,
    updateCalls: 0,
  };

  const fetchImpl = async (url, opts = {}) => {
    const method = (opts.method || 'GET').toUpperCase();
    const u = String(url);

    if (u.endsWith('/companies/demo-co') && method === 'GET') {
      return json(200, { name: 'Demo Co', organizationNumber: '123' });
    }
    if (u.includes('/contacts') && method === 'GET') {
      return json(200, state.contacts);
    }
    if (u.includes('/contacts') && method === 'POST') {
      const body = JSON.parse(opts.body);
      const contactId = 100 + state.contacts.length;
      state.contacts.push({ contactId, ...body });
      return {
        ok: true,
        status: 201,
        headers: headerMap({ Location: `https://api.fiken.no/api/v2/companies/demo-co/contacts/${contactId}` }),
        text: async () => '',
        json: async () => ({}),
      };
    }
    if (u.includes('/purchases/') && u.includes('/attachments') && method === 'POST') {
      const purchaseId = u.split('/purchases/')[1].split('/')[0];
      state.attachments.set(purchaseId, (state.attachments.get(purchaseId) || 0) + 1);
      return json(201, { ok: true });
    }
    if (u.includes('/purchases/') && method === 'GET') {
      const purchaseId = u.split('/purchases/')[1].split(/[/?]/)[0];
      const p = state.purchases.get(String(purchaseId));
      if (!p) return json(404, { error: 'not_found' });
      return json(200, p);
    }
    if (u.includes('/purchases/') && method === 'PUT') {
      state.updateCalls += 1;
      const purchaseId = u.split('/purchases/')[1].split(/[/?]/)[0];
      const body = JSON.parse(opts.body);
      state.purchases.set(String(purchaseId), { ...body, purchaseId: Number(purchaseId) });
      return json(200, state.purchases.get(String(purchaseId)));
    }
    if (u.endsWith('/purchases') && method === 'POST') {
      state.createCalls += 1;
      const body = JSON.parse(opts.body);
      const purchaseId = state.nextPurchaseId++;
      state.purchases.set(String(purchaseId), { ...body, purchaseId });
      return {
        ok: true,
        status: 201,
        headers: headerMap({
          Location: `https://api.fiken.no/api/v2/companies/demo-co/purchases/${purchaseId}`,
        }),
        text: async () => '',
        json: async () => ({ purchaseId }),
      };
    }
    return json(404, { error: 'unhandled', url: u, method });
  };

  return { fetchImpl, state };
}

function headerMap(obj) {
  return {
    get(name) {
      const key = Object.keys(obj).find((k) => k.toLowerCase() === String(name).toLowerCase());
      return key ? obj[key] : null;
    },
  };
}

function json(status, data) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: headerMap({}),
    text: async () => JSON.stringify(data),
    json: async () => data,
  };
}

async function buildBusinessInvoice() {
  const evidence = await storeEvidenceBytes({
    name: 'circle-k-invoice.pdf',
    mimeType: 'application/pdf',
    contentBase64: Buffer.from('%PDF-1.4 executia-fiken-v01').toString('base64'),
  });

  let inv = createInvoice({
    supplier: 'Circle K',
    amount: 489,
    currency: 'NOK',
    vatRate: 25,
    dueDate: '2026-08-20',
    paymentReference: 'INV-CK-440',
    paymentSettled: true,
    paymentConfirmed: true,
    document: evidence,
  });
  return inv;
}

async function main() {
  console.log('=== Fiken Accounting Adapter v0.1 ===\n');

  // ── Auth probe (real env) ──
  const config = loadFikenConfig();
  const probe = await probeFikenAuth(config);
  console.log(`Auth probe: ${probe.status} — ${probe.detail}`);
  console.log(
    `Credentials present: ${credentialsPresent(config)} (token=${Boolean(config.token)} slug=${Boolean(config.companySlug)})`,
  );

  // ── A · Missing credentials must not fake success ──
  resetLocal();
  console.log('\nA. Missing credentials → truth established, not Complete (Needs Decision)');
  const prevConfig = globalThis.__FIKEN_CONFIG__;
  const savedToken = process.env.FIKEN_API_TOKEN;
  const savedAccess = process.env.FIKEN_ACCESS_TOKEN;
  const savedSlug = process.env.FIKEN_COMPANY_SLUG;
  globalThis.__FIKEN_CONFIG__ = {};
  delete process.env.FIKEN_API_TOKEN;
  delete process.env.FIKEN_ACCESS_TOKEN;
  delete process.env.FIKEN_COMPANY_SLUG;

  let inv = await buildBusinessInvoice();
  inv = await advanceInvoice(inv, {
    accountingAdapter: fiken,
    governmentAdapter: government,
    getEvidence,
  });
  // context required
  inv = await decideAndAdvance(inv, 'context', 'business', {
    accountingAdapter: fiken,
    governmentAdapter: government,
    getEvidence,
  });
  console.log(`  state=${inv.state} truth=${inv.truthEstablished} sync=${inv.sync?.accounting?.status}`);
  if (!inv.truthEstablished) throw new Error('A: Engine truth must be established');
  if (inv.state === 'complete') throw new Error('A: must not Execution Complete while sync unresolved');
  if (inv.state !== 'needs_decision') {
    throw new Error('A: credentials missing requires Needs Decision (human configuration)');
  }
  if (normalizeAccountingSyncStatus(inv.sync?.accounting?.status) === ACCOUNTING_SYNC_STATUS.SYNCHRONIZED) {
    throw new Error('A: must not claim synchronized without credentials');
  }
  if (inv.sync?.accounting?.metadata?.reason !== 'credentials_missing') {
    throw new Error('A: expected credentials_missing metadata');
  }
  if (!inv.accountingIntent?.executionObjectId) throw new Error('A: AccountingIntent required');
  console.log('  PASS');

  if (savedToken != null) process.env.FIKEN_API_TOKEN = savedToken;
  if (savedAccess != null) process.env.FIKEN_ACCESS_TOKEN = savedAccess;
  if (savedSlug != null) process.env.FIKEN_COMPANY_SLUG = savedSlug;
  globalThis.__FIKEN_CONFIG__ = prevConfig;

  // ── B · Mock live create + idempotent retry ──
  resetLocal();
  console.log('\nB. Mock Fiken create + idempotent retry (no duplicate)');
  const { fetchImpl, state } = mockFetchFactory();
  globalThis.__FIKEN_CONFIG__ = {
    token: 'test-token',
    companySlug: 'demo-co',
    expenseAccount: '6800',
    baseUrl: 'https://api.fiken.no/api/v2',
  };

  inv = await buildBusinessInvoice();
  const intent = createAccountingIntent(
    { ...inv, context: 'business' },
    {
      intent: 'record_supplier_invoice',
      supplier: inv.supplier,
      currency: inv.currency,
      gross: 489,
      net: 391.2,
      vatAmount: 97.8,
      vatRate: 25,
      dueDate: inv.dueDate,
      context: 'business',
      evidenceId: inv.document.id,
      lines: [
        {
          kind: 'expense',
          amount: 391.2,
          vatAmount: 97.8,
          description: 'Invoice Circle K',
        },
      ],
    },
    { status: 'settled', bankConfirmed: true, transactionId: 'tx_demo', amount: 489, currency: 'NOK' },
  );

  const first = await fiken.synchronizeAccounting(intent, { getEvidence, fetchImpl });
  console.log(`  first → ${first.status} purchaseId=${first.externalIds?.purchaseId}`);
  if (first.status !== 'synchronized') throw new Error(`B: first sync failed: ${first.detail}`);
  if (state.createCalls !== 1) throw new Error('B: expected one create');

  const second = await fiken.synchronizeAccounting(intent, { getEvidence, fetchImpl });
  console.log(`  retry → ${second.status} idempotent=${second.metadata?.idempotent} creates=${state.createCalls}`);
  if (second.status !== 'synchronized') throw new Error('B: retry must synchronize');
  if (!second.metadata?.idempotent) throw new Error('B: retry must be idempotent');
  if (state.createCalls !== 1) throw new Error('B: retry must not create duplicate purchase');
  if (findFikenMapping(intent.executionObjectId)?.purchaseId !== first.externalIds.purchaseId) {
    throw new Error('B: mapping must stable');
  }
  // Evidence attached on create
  if (!first.evidence?.attached) throw new Error('B: evidence should attach when available');
  console.log('  PASS');

  // ── C · Update path when truth changes before final sync claimed differently ──
  console.log('\nC. Intent change updates existing purchase (no new create)');
  const changed = {
    ...intent,
    netAmount: 400,
    vatAmount: 100,
    grossAmount: 500,
    vatTreatment: { ...intent.vatTreatment, amount: 100 },
    classification: {
      ...intent.classification,
      lines: [{ description: 'Invoice Circle K', amount: 400, vatAmount: 100 }],
    },
  };
  const updated = await fiken.synchronizeAccounting(changed, { getEvidence, fetchImpl });
  console.log(`  update → ${updated.status} updateCalls=${state.updateCalls} creates=${state.createCalls}`);
  if (updated.status !== 'synchronized') throw new Error(`C: update failed: ${updated.detail}`);
  if (state.createCalls !== 1) throw new Error('C: must not create duplicate on update');
  if (state.updateCalls < 1) throw new Error('C: expected updatePurchase');
  console.log('  PASS');

  globalThis.__FIKEN_CONFIG__ = prevConfig || {};

  // ── D · Live real invoice (only with credentials) ──
  console.log('\nD. Live Fiken real invoice');
  if (!credentialsPresent(loadFikenConfig()) || probe.status !== 'ok') {
    console.log('  BLOCKED — no live Fiken credentials/API access in this environment');
    console.log('  Configure FIKEN_API_TOKEN + FIKEN_COMPANY_SLUG, then re-run to verify in Fiken UI.');
    console.log('\n=== Contract + mock acceptance passed; live sync blocked ===');
    process.exitCode = 0;
    return;
  }

  resetLocal();
  inv = await buildBusinessInvoice();
  const runtime = {
    accountingAdapter: fiken,
    governmentAdapter: government,
    getEvidence,
  };
  inv = await advanceInvoice(inv, runtime);
  inv = await decideAndAdvance(inv, 'context', 'business', runtime);
  console.log(`  live state=${inv.state} sync=${inv.sync?.accounting?.status} purchase=${inv.sync?.accounting?.externalIds?.purchaseId}`);
  if (inv.sync?.accounting?.status !== 'synchronized') {
    throw new Error(`D: live sync failed: ${inv.sync?.accounting?.detail}`);
  }
  const purchaseId = inv.sync.accounting.externalIds.purchaseId;

  // Retry must not duplicate
  const liveIntent = inv.accountingIntent;
  const liveRetry = await fiken.synchronizeAccounting(liveIntent, { getEvidence });
  if (liveRetry.status !== 'synchronized') throw new Error('D: live retry failed');
  if (liveRetry.externalIds.purchaseId !== purchaseId) throw new Error('D: retry changed purchase id');
  console.log(`  live retry idempotent purchaseId=${purchaseId}`);
  console.log('  PASS — verify this purchase in Fiken UI (one record, VAT, evidence)');
  console.log('\n=== All Fiken acceptance scenarios passed (including live) ===');
}

main().catch((err) => {
  console.error('\nFAIL:', err.message || err);
  process.exit(1);
});
