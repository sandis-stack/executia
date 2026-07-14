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

const REVIEW_DELAY_MS = 1920;

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

function renderLifecycleBar(root, complete) {
  if (!root) return;
  root.innerHTML = complete
    ? `<div class="le-step le-step--done"><span class="le-step-label">Decision ready</span></div>`
    : `<div class="le-step le-step--active"><span class="le-step-label">Reviewing execution…</span></div>`;
}

function renderExecutiveFlow(flowRoot, result, reviewing) {
  if (!flowRoot || !result?.ok) return;

  const missionPayload = phasePayload(result, 'mission');
  const missionHtml = buildMissionHtml(missionPayload);

  if (reviewing) {
    flowRoot.innerHTML = `
      <div class="le-flow-step le-flow-step--active" data-le-phase="review">
        <div class="le-flow-step-body">
          ${missionHtml}
          <p class="le-step-output le-progress">Reviewing execution…</p>
        </div>
      </div>`;
    return;
  }

  const decisionHtml = buildDecisionHtml(phasePayload(result, 'decision'));
  flowRoot.innerHTML = `
    <div class="le-flow-step le-flow-step--done" data-le-phase="decision">
      <div class="le-flow-step-body">
        ${missionHtml}
        ${decisionHtml}
      </div>
    </div>`;
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
  renderLifecycleBar(ui.lifecycle, false);
  renderExecutiveFlow(ui.flow, result, true);
  await sleep(REVIEW_DELAY_MS);
  renderLifecycleBar(ui.lifecycle, true);
  renderExecutiveFlow(ui.flow, result, false);
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
