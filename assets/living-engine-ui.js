/**
 * Living Execution Engine — UI controller (no business logic).
 */

import {
  generateExecutionScenario,
  phasePayload,
  INSUFFICIENT_BASIS,
} from './living-engine/orchestrator.js';
import { ENGINE_DISCLOSURE } from './living-engine/mission-parser.js';
import {
  persistEngineRun,
  applyEngineHandoff,
  applyPilotHandoff,
  applyOneHandoff,
  buildRequestUrl,
} from './public-funnel.js';

const PHASE_DELAY_MS = 480;

const DISPLAY_PHASES = [
  { id: 'mission', label: 'Mission' },
  { id: 'intent', label: 'Intent' },
  { id: 'context', label: 'Execution Context' },
  { id: 'reasoning', label: 'Reasoning' },
  { id: 'validation', label: 'Validation' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'outlook', label: 'Execution Outlook' },
  { id: 'decision', label: 'Decision' },
];

const DECISION_LABELS = {
  PROCEED: 'Proceed',
  HOLD: 'Hold',
  REJECT: 'Reject',
  ESCALATE: 'Escalate',
  [INSUFFICIENT_BASIS]: 'Insufficient basis',
};

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildMissionHtml(payload) {
  return `
    <p class="le-mission-headline">${escapeHtml(payload.mission.headline)}</p>
    <p class="le-step-output">${escapeHtml(payload.mission.statement)}</p>`;
}

function buildProgressHtml() {
  return `<p class="le-step-output le-progress">Review complete.</p>`;
}

function buildDecisionHtml(payload) {
  const summary = payload.decisionSummary ?? payload;
  const decisionKey = summary.decision ?? summary.outcome ?? INSUFFICIENT_BASIS;
  const label = DECISION_LABELS[decisionKey] ?? decisionKey;
  const reason =
    summary.reason ??
    'A governed decision could not be formed from the available inputs.';

  const actions = (summary.required_actions ?? [])
    .filter(Boolean)
    .map((text) => `<li>${escapeHtml(text)}</li>`)
    .join('');
  const conditions = (summary.re_evaluation_conditions ?? [])
    .filter(Boolean)
    .map((text) => `<li>${escapeHtml(text)}</li>`)
    .join('');

  return `
    <dl class="le-output-grid le-decision-summary">
      <dt>Decision</dt><dd>${escapeHtml(label)}</dd>
    </dl>
    <p class="le-subhead">Reason</p>
    <p class="le-step-output">${escapeHtml(reason)}</p>
    ${
      actions
        ? `<p class="le-subhead">Required actions</p><ul class="le-list">${actions}</ul>`
        : ''
    }
    ${
      conditions
        ? `<p class="le-subhead">Re-evaluation conditions</p><ul class="le-list">${conditions}</ul>`
        : ''
    }`;
}

function phaseBodyHtml(phaseId, result) {
  const payload = phasePayload(result, phaseId);
  if (!payload) return `<p class="le-step-output">Awaiting mission input</p>`;

  switch (phaseId) {
    case 'mission':
      return buildMissionHtml(payload);
    case 'decision':
      return buildDecisionHtml(payload);
    default:
      return buildProgressHtml();
  }
}

function renderLifecycleBar(root, activeIndex) {
  root.innerHTML = DISPLAY_PHASES.map((phase, i) => {
    let state = 'pending';
    if (i < activeIndex) state = 'done';
    else if (i === activeIndex) state = 'active';
    else if (activeIndex >= DISPLAY_PHASES.length) state = 'done';
    return `<div class="le-step le-step--${state}" data-phase="${phase.id}"><span class="le-step-label">${phase.label}</span></div>`;
  }).join('<span class="le-step-arrow" aria-hidden="true">↓</span>');
}

function renderFlow(flowRoot, result, activeIndex) {
  if (!flowRoot || !result?.ok) return;

  flowRoot.innerHTML = DISPLAY_PHASES.map((phase, i) => {
    const state =
      activeIndex >= DISPLAY_PHASES.length || i < activeIndex
        ? 'done'
        : i === activeIndex
          ? 'active'
          : 'ready';
    return `
      <div class="le-flow-step le-flow-step--${state}" data-le-phase="${phase.id}">
        <div class="le-flow-step-head">
          <span class="le-flow-step-label">${phase.label}</span>
        </div>
        <div class="le-flow-step-body">${phaseBodyHtml(phase.id, result)}</div>
      </div>
      ${i < DISPLAY_PHASES.length - 1 ? '<div class="le-flow-arrow" aria-hidden="true">↓</div>' : ''}`;
  }).join('');
}

function updateOneCoreCta(flowComplete, userRan) {
  const cta = document.getElementById('le-cta-one-core');
  const hint = document.getElementById('le-cta-one-hint');
  if (!cta || !hint) return;

  if (userRan && flowComplete) {
    cta.classList.remove('is-disabled');
    cta.setAttribute('aria-disabled', 'false');
    hint.textContent = 'Decision complete — continue when ready.';
  } else {
    cta.classList.add('is-disabled');
    cta.setAttribute('aria-disabled', 'true');
    hint.textContent = 'Complete the execution review to continue.';
  }
}

async function runProgressiveReveal(result, ui) {
  for (let i = 0; i < DISPLAY_PHASES.length; i += 1) {
    renderLifecycleBar(ui.lifecycle, i);
    renderFlow(ui.flow, result, i);
    if (i < DISPLAY_PHASES.length - 1) {
      await sleep(PHASE_DELAY_MS);
    }
  }
  renderLifecycleBar(ui.lifecycle, DISPLAY_PHASES.length);
  renderFlow(ui.flow, result, DISPLAY_PHASES.length);
}

function persistResult(result) {
  persistEngineRun({
    completed: true,
    missionText: result.missionText,
    decision: result.decision,
    executionScore: result.executionScore?.value,
    executionReadiness: INSUFFICIENT_BASIS,
    scenario: result.scenario,
    outputs: result.outputs,
    reasoning: result.reasoning,
  });
}

export function initLivingEngine() {
  const root = document.getElementById('living-engine-product');
  if (!root) return;

  const disclosure = root.querySelector('.le-disclosure');
  if (disclosure) disclosure.textContent = ENGINE_DISCLOSURE;

  const form = root.querySelector('#living-engine-form');
  const input = root.querySelector('#living-engine-input');
  const lifecycle = root.querySelector('#le-lifecycle');
  const flow = root.querySelector('#le-phase-flow');
  const message = root.querySelector('#le-message');
  const submitBtn = form?.querySelector('button[type="submit"]');
  const oneCoreCta = root.querySelector('#le-cta-one-core');

  const ui = { lifecycle, flow };

  if (oneCoreCta) {
    oneCoreCta.addEventListener('click', (event) => {
      if (oneCoreCta.classList.contains('is-disabled')) {
        event.preventDefault();
      }
    });
  }

  applyEngineHandoff();

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = (input?.value ?? '').trim();
    if (message) {
      message.textContent = '';
      message.className = 'le-message le-live';
    }

    const result = generateExecutionScenario(text);
    if (!result.ok) {
      if (message) {
        message.textContent = result.message;
        message.className = 'le-message le-live le-message--error';
      }
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    persistResult(result);
    applyEngineHandoff();
    applyPilotHandoff();
    applyOneHandoff();

    const pilotCta = root.querySelector('#le-cta-pilot-request');
    if (pilotCta) pilotCta.href = buildRequestUrl();

    await runProgressiveReveal(result, ui);
    updateOneCoreCta(true, true);

    const decisionLabel = DECISION_LABELS[result.decision] ?? result.decision;
    if (message) {
      message.textContent = `Decision ready — ${decisionLabel}.`;
      message.className = 'le-message le-live le-message--success';
    }
    if (submitBtn) submitBtn.disabled = false;
  });
}

document.addEventListener('DOMContentLoaded', initLivingEngine);
