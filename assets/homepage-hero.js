/**
 * Hero — live journey panel (user-facing homepage story).
 */

import { loadPublicFunnelContext } from './public-funnel.js';
import { formatCurrency } from './execution-value-engine.js';

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

/** User-facing steps aligned with homepage journey — no internal labels. */
function buildHeroJourney(ctx = loadPublicFunnelContext()) {
  const calc = ctx.calculator?.results;
  const engine = ctx.engine;
  const assessment = ctx.assessment?.results;

  const steps = [
    {
      id: 'execution-value',
      label: 'Execution Value',
      href: '#execution-value',
      complete: Boolean(calc),
      detail: calc
        ? `${formatCurrency(calc.estimatedExecutionLoss?.value ?? 0)} at risk`
        : 'Enter your organization profile',
      kind: calc ? 'Estimated' : 'Pending',
    },
    {
      id: 'living-engine',
      label: 'Living Engine',
      href: '#living-engine',
      complete: Boolean(engine?.completed),
      detail: engine?.completed
        ? 'Execution plan built'
        : engine?.missionText
          ? 'Building execution plan…'
          : 'Waiting for your first mission',
      kind: engine?.completed ? 'Demonstration' : 'Pending',
    },
    {
      id: 'one-core',
      label: 'One Core',
      href: '#one-core',
      complete: Boolean(engine?.completed),
      detail: engine?.completed ? 'Operating system mapped' : 'After Living Engine',
      kind: engine?.completed ? 'Calculated' : 'Pending',
    },
    {
      id: 'execution-economy',
      label: 'Execution Economy',
      href: '#execution-economy',
      complete: Boolean(engine?.completed && assessment?.ok),
      detail: assessment?.ok ? 'Value cycle explored' : 'See how value is created',
      kind: assessment?.ok ? 'Calculated' : 'Pending',
    },
    {
      id: 'pilot',
      label: 'Pilot',
      href: '#pilot',
      complete: Boolean(assessment?.ok),
      detail: assessment?.ok
        ? assessment.pilotRecommendation?.readiness ?? 'Ready'
        : 'Begin Executive Assessment',
      kind: assessment?.ok ? 'Calculated' : 'Pending',
    },
  ];

  const firstIncomplete = steps.findIndex((step) => !step.complete);
  return steps.map((step, index) => ({
    ...step,
    status: step.complete
      ? 'complete'
      : index === firstIncomplete
        ? 'active'
        : 'pending',
  }));
}

function currentStateText(steps) {
  const active = steps.find((step) => step.status === 'active');
  if (!active) {
    if (steps.length && steps.every((step) => step.complete)) {
      return 'Ready for Executive Assessment';
    }
    return 'Waiting for your first mission';
  }
  return active.detail?.trim() || active.label;
}

function renderJourney(root, steps) {
  root.innerHTML = '';
  root.setAttribute('aria-label', 'Live execution journey');

  const glow = el('div', 'hp-monitor-glow');
  const panel = el('div', 'hp-monitor-panel');
  root.appendChild(glow);
  root.appendChild(panel);

  panel.appendChild(el('p', 'hp-monitor-label', 'Your journey'));

  const meta = el('div', 'hp-monitor-meta');
  meta.innerHTML =
    '<div><p class="sub">Current step</p>' +
    `<p class="hp-monitor-state">${escapeHtml(stateText)}</p></div>`;
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
      '</div>' +
      `<p class="hp-journey-detail">${escapeHtml(step.detail)}</p>`;
    list.appendChild(item);
  });
  panel.appendChild(list);

  if (steps.every((step) => step.complete) && steps.length > 0) {
    const ready = el('div', 'hp-ready-banner');
    ready.style.display = 'block';
    ready.style.backgroundColor = 'var(--hp-on-track-bg)';
    ready.innerHTML = '<p style="color:var(--hp-on-track-text)">Ready for Executive Assessment</p>';
    panel.appendChild(ready);
  }
}

function mount(root) {
  function refresh() {
    renderJourney(root, buildHeroJourney());
  }

  refresh();
  document.addEventListener('executia:funnel-update', refresh);
  return () => document.removeEventListener('executia:funnel-update', refresh);
}

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('hp-funnel-journey');
  if (root) mount(root);
});
