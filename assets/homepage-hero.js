/**
 * Hero — Execution Sequence Protocol (live, psychologically active flow).
 */

import { loadPublicFunnelContext } from './public-funnel.js';
import { formatCurrency } from './execution-value-engine.js';

const TOTAL_STEPS = 5;

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

function preferReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Five-step execution sequence aligned to ENTRY path. */
function buildHeroJourney(ctx = loadPublicFunnelContext()) {
  const calc = ctx.calculator?.results;
  const assessment = ctx.assessment?.results;
  const hasProfile = Boolean(calc);
  const hasAssessment = Boolean(assessment?.ok);

  const steps = [
    {
      id: 'profile',
      label: 'Execution Profile',
      href: '#execution-value',
      complete: hasProfile,
      detail: hasProfile
        ? `${formatCurrency(calc.estimatedExecutionLoss?.value ?? 0)} at risk`
        : 'Build your execution profile',
    },
    {
      id: 'understand',
      label: 'Understand',
      href: '#architecture',
      complete: hasProfile,
      detail: hasProfile
        ? 'Architecture path reviewed'
        : 'See how EXECUTIA governs execution',
    },
    {
      id: 'validate',
      label: 'Validate',
      href: '#execution-value',
      complete: hasProfile,
      detail: hasProfile
        ? 'Loss estimate captured'
        : 'Quantify invisible execution loss',
    },
    {
      id: 'proof',
      label: 'Review Proof',
      href: '/engine',
      complete: hasAssessment,
      detail: hasAssessment
        ? 'Engine evidence reviewed'
        : 'Inspect governed execution evidence',
    },
    {
      id: 'pilot',
      label: 'Request Pilot',
      href: '#pilot',
      complete: hasAssessment,
      detail: hasAssessment
        ? assessment.pilotRecommendation?.readiness ?? 'Ready for pilot'
        : 'Begin Executive Assessment',
    },
  ];

  const firstIncomplete = steps.findIndex((step) => !step.complete);
  return steps.map((step, index) => ({
    ...step,
    stepNumber: index + 1,
    status: step.complete
      ? 'complete'
      : index === firstIncomplete
        ? 'active'
        : firstIncomplete === -1
          ? 'complete'
          : 'pending',
  }));
}

function stepMetaLabel(steps) {
  if (steps.length && steps.every((step) => step.complete)) {
    return `STEP ${TOTAL_STEPS} OF ${TOTAL_STEPS} // COMPLETE`;
  }
  const active = steps.find((step) => step.status === 'active');
  const n = active ? active.stepNumber : 1;
  return `STEP ${n} OF ${TOTAL_STEPS} // ACTIVE`;
}

function currentStateText(steps) {
  const active = steps.find((step) => step.status === 'active');
  if (!active) {
    if (steps.length && steps.every((step) => step.complete)) {
      return 'Ready for Executive Assessment';
    }
    return 'Build your execution profile';
  }
  return active.detail?.trim() || active.label;
}

function badgeForStatus(status) {
  if (status === 'active') return 'WAITING FOR INPUT';
  if (status === 'pending') return 'NEXT IN SEQUENCE';
  return 'COMPLETE';
}

/** Active step shows progress through the 5-step sequence (step 1 = 20%). */
function activeProgressPercent(stepNumber) {
  return Math.max(20, Math.min(100, stepNumber * 20));
}

function progressBarHtml(percent) {
  return (
    `<div class="hp-flow-progress" aria-hidden="true">` +
    `<div class="hp-flow-progress-bar" style="--pct:${percent}%">` +
    `<span class="hp-flow-progress-fill"></span>` +
    `</div>` +
    `<span class="hp-flow-progress-pct">${percent}% COMPLETE</span>` +
    `</div>`
  );
}

function badgeHtml(status) {
  return (
    `<span class="sys-state hp-flow-badge hp-flow-badge--${status}">` +
    `${escapeHtml(badgeForStatus(status))}` +
    `</span>`
  );
}

function renderJourney(root, steps) {
  root.innerHTML = '';
  root.setAttribute('aria-label', 'Execution Sequence Protocol');
  root.classList.add('hp-execution-flow', 'is-live');

  const glow = el('div', 'hp-monitor-glow');
  const panel = el('div', 'hp-monitor-panel');
  root.appendChild(glow);
  root.appendChild(panel);

  const label = el(
    'p',
    'hp-monitor-label',
    '<span class="hp-flow-live" aria-hidden="true"></span>Execution Flow'
  );
  panel.appendChild(label);

  const meta = el('div', 'hp-monitor-meta');
  meta.innerHTML =
    `<div><p class="sub">${escapeHtml(stepMetaLabel(steps))}</p>` +
    `<p class="hp-monitor-state">${escapeHtml(currentStateText(steps))}</p></div>`;
  panel.appendChild(meta);

  const list = el('ul', 'hp-journey-list');
  steps.forEach((step, index) => {
    if (index > 0) {
      const arrow = el('li', 'hp-journey-arrow', '↓');
      arrow.setAttribute('aria-hidden', 'true');
      list.appendChild(arrow);
    }

    const item = el('li', `hp-journey-step hp-journey-step--${step.status}`);
    item.setAttribute('data-flow-step', String(step.stepNumber));
    item.setAttribute('data-flow-status', step.status);

    let html =
      '<div class="hp-journey-main">' +
      `<a class="hp-journey-label" href="${step.href}">${escapeHtml(step.label)}</a>` +
      badgeHtml(step.status) +
      '</div>' +
      `<p class="hp-journey-detail">${escapeHtml(step.detail)}</p>`;

    if (step.status === 'active') {
      html += progressBarHtml(activeProgressPercent(step.stepNumber));
    }

    item.innerHTML = html;
    list.appendChild(item);
  });
  panel.appendChild(list);

  if (steps.every((step) => step.complete) && steps.length > 0) {
    const ready = el('div', 'hp-ready-banner');
    ready.style.display = 'block';
    ready.style.backgroundColor = 'var(--hp-on-track-bg)';
    ready.innerHTML =
      '<p style="color:var(--hp-on-track-text)"><span class="sys-state">APPROVED</span> Ready for Executive Assessment</p>';
    panel.appendChild(ready);
  }
}

/**
 * Soft live status: deterministic micro-tick on the active step
 * without changing step state or narrative copy.
 */
function startIdlePresence(root) {
  if (preferReducedMotion()) return () => {};

  let tick = 0;
  const timer = window.setInterval(() => {
    tick += 1;
    const active = root.querySelector('.hp-journey-step--active');
    if (!active) return;
    active.setAttribute('data-flow-tick', String(tick % 4));
    const fill = active.querySelector('.hp-flow-progress-fill');
    if (fill) {
      // Sub-percent breathing around the declared progress — calm, not noisy.
      const base = Number.parseFloat(getComputedStyle(active.querySelector('.hp-flow-progress-bar')).getPropertyValue('--pct')) || 20;
      const delta = tick % 2 === 0 ? 0.6 : -0.4;
      fill.style.width = `${Math.max(16, Math.min(100, base + delta))}%`;
    }
  }, 3200);

  return () => window.clearInterval(timer);
}

function mount(root) {
  let stopIdle = () => {};

  function refresh() {
    stopIdle();
    renderJourney(root, buildHeroJourney());
    stopIdle = startIdlePresence(root);
  }

  refresh();
  document.addEventListener('executia:funnel-update', refresh);
  return () => {
    stopIdle();
    document.removeEventListener('executia:funnel-update', refresh);
  };
}

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('hp-funnel-journey');
  if (root) mount(root);
});
