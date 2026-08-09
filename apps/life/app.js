/**
 * EXECUTIA LIFE — Execution Inbox shell
 * Default answer: What needs my attention?
 */

import { storeEvidenceFile, getEvidence } from '/adapters/documents/local.js';
import {
  advanceInvoice,
  decideAndAdvance,
  startInvoiceFromUpload,
} from '/engine/execution/invoice-flow.js';
import { getRuntimeAdapters } from './lib/adapters.js';
import { listInvoices, saveInvoice, getInvoice, inboxBuckets } from './lib/store.js';

const adapters = getRuntimeAdapters();
const root = document.getElementById('app');

const state = {
  view: 'today', // today | needs | executing | complete | upload | camera | detail
  selectedId: null,
};

function money(amount, currency) {
  if (amount == null) return '—';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(amount);
  } catch {
    return `${amount} ${currency || ''}`.trim();
  }
}

function labelForState(s) {
  const map = {
    received: 'Received',
    evidence_captured: 'Evidence captured',
    classifying: 'Classifying',
    needs_decision: 'Needs decision',
    executing: 'Executing',
    complete: 'Execution Complete',
  };
  return map[s] || s;
}

function navigate(view, selectedId = null) {
  state.view = view;
  state.selectedId = selectedId;
  render();
}

async function persistAndAdvance(invoice) {
  const next = await advanceInvoice(invoice, adapters);
  saveInvoice(next);
  return next;
}

async function onUploadSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const file = form.querySelector('[name="file"]')?.files?.[0];
  if (!file) return;

  const evidenceRef = await storeEvidenceFile(file);
  const meta = {
    source: form.source.value || 'upload',
    supplier: form.supplier.value.trim(),
    amount: form.amount.value ? Number(form.amount.value) : null,
    currency: form.currency.value || 'EUR',
    vatRate: form.vatRate.value ? Number(form.vatRate.value) : null,
    dueDate: form.dueDate.value || null,
    context: form.context.value || null,
  };

  let invoice = startInvoiceFromUpload(meta, evidenceRef);
  invoice = await persistAndAdvance(invoice);
  navigate('detail', invoice.id);
}

async function onDecide(type, optionId) {
  const invoice = getInvoice(state.selectedId);
  if (!invoice) return;
  const next = await decideAndAdvance(invoice, type, optionId, adapters);
  saveInvoice(next);
  navigate('detail', next.id);
}

function activeNavId() {
  if (['today', 'needs', 'executing', 'complete'].includes(state.view)) return state.view;
  if (state.view === 'upload' || state.view === 'camera') return 'today';
  const inv = getInvoice(state.selectedId);
  if (!inv) return 'today';
  if (inv.state === 'needs_decision') return 'needs';
  if (inv.state === 'complete') return 'complete';
  return 'executing';
}

function navHtml(buckets) {
  const active = activeNavId();
  const items = [
    { id: 'today', label: 'Today' },
    { id: 'needs', label: 'Needs Decision', count: buckets.needsDecision.length },
    { id: 'executing', label: 'Executing', count: buckets.executing.length },
    { id: 'complete', label: 'Complete', count: buckets.complete.length },
  ];

  return `
    <header class="life-top">
      <div class="life-top-inner">
        <p class="life-mark">LIFE</p>
        <nav class="life-nav" aria-label="Primary">
          ${items
            .map(
              (item) => `
            <button type="button" data-nav="${item.id}" class="${item.id === active ? 'is-active' : ''}">
              ${item.label}${item.count != null ? `<span class="count">${item.count}</span>` : ''}
            </button>`,
            )
            .join('')}
        </nav>
      </div>
    </header>
  `;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function card(invoice) {
  return `
    <button type="button" class="life-card" data-open="${invoice.id}">
      <p class="life-card-title">${escapeHtml(invoice.supplier || 'Invoice')}</p>
      <p class="life-card-meta">${money(invoice.amount, invoice.currency)}${invoice.dueDate ? ` · due ${invoice.dueDate}` : ''}</p>
      <span class="life-badge">${labelForState(invoice.state)}</span>
    </button>
  `;
}

function todayView(buckets) {
  const attention = [...buckets.needsDecision, ...buckets.executing];
  if (!attention.length) {
    return `
      <p class="life-kicker">Today</p>
      <h1 class="life-title">Nothing needs your attention</h1>
      <p class="life-lead">Execution is quiet. Capture an invoice when something arrives.</p>
      <div class="life-actions">
        <button type="button" class="life-btn" data-action="upload">Upload invoice</button>
        <button type="button" class="life-btn secondary" data-action="camera">Capture image</button>
      </div>
      <p class="life-silence">Silence is the product working.</p>
    `;
  }

  return `
    <p class="life-kicker">Today</p>
    <h1 class="life-title">What needs my attention?</h1>
    <p class="life-lead">${buckets.needsDecision.length} decision${buckets.needsDecision.length === 1 ? '' : 's'} · ${buckets.executing.length} executing</p>
    <div class="life-actions">
      <button type="button" class="life-btn" data-action="upload">Upload invoice</button>
      <button type="button" class="life-btn secondary" data-action="camera">Capture image</button>
    </div>
    <div style="margin-top:1.5rem">
      ${attention.map(card).join('')}
    </div>
  `;
}

function listView(title, lead, items) {
  return `
    <p class="life-kicker">${escapeHtml(title)}</p>
    <h1 class="life-title">${items.length ? escapeHtml(title) : 'Nothing here'}</h1>
    <p class="life-lead">${escapeHtml(lead)}</p>
    <div style="margin-top:1.25rem">
      ${items.length ? items.map(card).join('') : '<p class="life-silence">No items.</p>'}
    </div>
  `;
}

function uploadView(cameraPreferred) {
  return `
    <p class="life-kicker">Input</p>
    <h1 class="life-title">${cameraPreferred ? 'Capture image' : 'Upload invoice'}</h1>
    <p class="life-lead">One administrative object. The Engine executes from here.</p>
    <form class="life-form" id="upload-form">
      <div class="life-field">
        <label for="file">Document / evidence</label>
        <input id="file" name="file" type="file" accept="application/pdf,image/*" ${cameraPreferred ? 'capture="environment"' : ''} required />
      </div>
      <div class="life-field">
        <label for="supplier">Supplier</label>
        <input id="supplier" name="supplier" type="text" placeholder="Leave blank if unknown" />
      </div>
      <div class="life-grid-2">
        <div class="life-field">
          <label for="amount">Amount</label>
          <input id="amount" name="amount" type="number" step="0.01" min="0" placeholder="0.00" />
        </div>
        <div class="life-field">
          <label for="currency">Currency</label>
          <input id="currency" name="currency" type="text" value="EUR" />
        </div>
      </div>
      <div class="life-grid-2">
        <div class="life-field">
          <label for="vatRate">VAT rate %</label>
          <input id="vatRate" name="vatRate" type="number" step="0.01" min="0" placeholder="optional" />
        </div>
        <div class="life-field">
          <label for="dueDate">Due date</label>
          <input id="dueDate" name="dueDate" type="date" />
        </div>
      </div>
      <div class="life-grid-2">
        <div class="life-field">
          <label for="context">Context</label>
          <select id="context" name="context">
            <option value="">Decide later if needed</option>
            <option value="business">Business</option>
            <option value="personal">Personal</option>
          </select>
        </div>
        <div class="life-field">
          <label for="source">Source</label>
          <select id="source" name="source">
            <option value="${cameraPreferred ? 'camera' : 'upload'}">${cameraPreferred ? 'Camera' : 'Upload'}</option>
            <option value="email" disabled>Email (adapter stub)</option>
          </select>
        </div>
      </div>
      <div class="life-actions">
        <button type="submit" class="life-btn">Start execution</button>
        <button type="button" class="life-btn secondary" data-action="today">Cancel</button>
      </div>
      <p class="life-stub">Email ingestion is behind an adapter boundary (stub). LIFE is not coupled to Gmail. Accounting sync uses the Fiken stub adapter.</p>
    </form>
  `;
}

function detailView(invoice) {
  if (!invoice) {
    return `<p class="life-lead">Object not found.</p>`;
  }

  const evidence = invoice.document?.id ? getEvidence(invoice.document.id) : null;
  const decision = invoice.pendingDecision;
  const c = invoice.consequences || {};

  let decisionHtml = '';
  if (decision && invoice.state === 'needs_decision') {
    decisionHtml = `
      <div class="life-decision">
        <h2>${escapeHtml(decision.prompt)}</h2>
        <div class="life-actions">
          ${(decision.options || [])
            .map(
              (opt) =>
                `<button type="button" class="life-btn" data-decide-type="${escapeHtml(decision.type)}" data-decide-option="${escapeHtml(opt.id)}">${escapeHtml(opt.label)}</button>`,
            )
            .join('')}
        </div>
      </div>
    `;
  }

  let completeHtml = '';
  if (invoice.state === 'complete') {
    completeHtml = `
      <p class="life-complete-line">Execution Complete</p>
      <p class="life-lead">Evidence preserved · VAT known · Accounting prepared · Deadline under control · Nothing left to do.</p>
    `;
  }

  return `
    <p class="life-kicker">Execution object</p>
    <h1 class="life-title">${escapeHtml(invoice.supplier || 'Invoice')}</h1>
    <p class="life-lead">${labelForState(invoice.state)} · ${escapeHtml(invoice.id)}</p>
    ${decisionHtml}
    ${completeHtml}
    <div class="life-detail">
      <div class="life-row"><span>Amount</span><span>${money(invoice.amount, invoice.currency)}</span></div>
      <div class="life-row"><span>VAT</span><span>${c.vat ? `${money(c.vat.vatAmount, c.vat.currency)} (${c.vat.vatRate ?? '—'}%)` : '—'}</span></div>
      <div class="life-row"><span>Context</span><span>${escapeHtml(invoice.context || '—')}</span></div>
      <div class="life-row"><span>Due</span><span>${escapeHtml(invoice.dueDate || '—')}</span></div>
      <div class="life-row"><span>Evidence</span><span>${escapeHtml(invoice.evidenceStatus)}${evidence ? ` · ${escapeHtml(evidence.name)}` : ''}</span></div>
      <div class="life-row"><span>Accounting sync</span><span>${escapeHtml(invoice.sync?.accounting?.status || invoice.synchronizationStatus || '—')}${invoice.sync?.accounting?.vendor ? ` · ${escapeHtml(invoice.sync.accounting.vendor)}` : ''}</span></div>
      <div class="life-row"><span>Payment</span><span>${escapeHtml(c.payment?.status || '—')}</span></div>
      <div class="life-row"><span>Forecast</span><span>${c.forecast?.updated ? money(c.forecast.outflow, c.forecast.currency) : '—'}</span></div>
    </div>
    ${
      c.accounting
        ? `<p class="life-stub">Accounting-ready intent: ${escapeHtml(c.accounting.intent)}. Vendor translation happens only in the Fiken adapter (${escapeHtml(invoice.sync?.accounting?.mode || 'n/a')}).</p>`
        : ''
    }
    <div class="life-actions">
      <button type="button" class="life-btn secondary" data-action="today">Back</button>
    </div>
  `;
}

function render() {
  const invoices = listInvoices();
  const buckets = inboxBuckets(invoices);

  let body = '';
  if (state.view === 'today') body = todayView(buckets);
  else if (state.view === 'needs')
    body = listView('Needs Decision', 'Only judgement that cannot wait.', buckets.needsDecision);
  else if (state.view === 'executing')
    body = listView('Executing', 'In motion. No tasks for you to manage.', buckets.executing);
  else if (state.view === 'complete')
    body = listView('Complete', 'Execution Complete. Nothing left to do.', buckets.complete);
  else if (state.view === 'upload') body = uploadView(false);
  else if (state.view === 'camera') body = uploadView(true);
  else if (state.view === 'detail') body = detailView(getInvoice(state.selectedId));

  root.innerHTML = `
    <div class="life-shell">
      ${navHtml(buckets)}
      <main class="life-main">${body}</main>
    </div>
  `;

  root.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => navigate(btn.getAttribute('data-nav')));
  });
  root.querySelectorAll('[data-action="upload"]').forEach((btn) => {
    btn.addEventListener('click', () => navigate('upload'));
  });
  root.querySelectorAll('[data-action="camera"]').forEach((btn) => {
    btn.addEventListener('click', () => navigate('camera'));
  });
  root.querySelectorAll('[data-action="today"]').forEach((btn) => {
    btn.addEventListener('click', () => navigate('today'));
  });
  root.querySelectorAll('[data-open]').forEach((btn) => {
    btn.addEventListener('click', () => navigate('detail', btn.getAttribute('data-open')));
  });
  root.querySelectorAll('[data-decide-type]').forEach((btn) => {
    btn.addEventListener('click', () => {
      onDecide(btn.getAttribute('data-decide-type'), btn.getAttribute('data-decide-option'));
    });
  });
  const form = root.querySelector('#upload-form');
  if (form) form.addEventListener('submit', onUploadSubmit);
}

render();
