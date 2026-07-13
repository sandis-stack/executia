/**
 * Hero — live funnel journey panel (canonical public funnel state).
 */

import { buildFunnelJourney } from './public-funnel.js';

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html != null) node.innerHTML = html;
  return node;
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderJourney(root, steps) {
  root.innerHTML = '';
  root.setAttribute('aria-label', 'Live execution journey');

  const glow = el('div', 'hp-monitor-glow');
  const panel = el('div', 'hp-monitor-panel');
  root.appendChild(glow);
  root.appendChild(panel);

  panel.appendChild(el('p', 'hp-monitor-label', 'Live execution journey'));

  const active = steps.find((step) => step.status === 'active');
  const meta = el('div', 'hp-monitor-meta');
  meta.innerHTML =
    '<div><p class="sub">Current step</p>' +
    `<p class="state">${escapeHtml(active?.label ?? 'Complete')}</p></div>` +
    `<span class="hp-phase-badge">${escapeHtml(active?.kind ?? 'Calculated')}</span>`;
  panel.appendChild(meta);

  const list = el('ul', 'hp-journey-list');
  steps.forEach((step, index) => {
    if (index > 0) {
      const arrow = el('li', 'hp-journey-arrow', '↓');
      arrow.setAttribute('aria-hidden', 'true');
      list.appendChild(arrow);
    }

    const item = el('li', `hp-journey-step hp-journey-step--${step.status}`);
    item.innerHTML =
      '<div class="hp-journey-main">' +
      `<a class="hp-journey-label" href="${step.href}">${escapeHtml(step.label)}</a>` +
      `<span class="hp-journey-kind">${escapeHtml(step.kind)}</span>` +
      '</div>' +
      `<p class="hp-journey-detail">${escapeHtml(step.detail)}</p>`;
    list.appendChild(item);
  });
  panel.appendChild(list);

  const completeCount = steps.filter((step) => step.status === 'complete').length;
  if (completeCount === steps.length) {
    const ready = el('div', 'hp-ready-banner');
    ready.style.display = 'block';
    ready.style.backgroundColor = 'var(--hp-on-track-bg)';
    ready.innerHTML = '<p style="color:var(--hp-on-track-text)">Funnel complete — Pilot and ONE ready</p>';
    panel.appendChild(ready);
  }
}

function mount(root) {
  function refresh() {
    renderJourney(root, buildFunnelJourney());
  }

  refresh();
  document.addEventListener('executia:funnel-update', refresh);
  return () => document.removeEventListener('executia:funnel-update', refresh);
}

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('hp-funnel-journey');
  if (root) mount(root);
});
