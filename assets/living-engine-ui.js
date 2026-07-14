/**
 * Living Execution Engine — UI controller (no business logic).
 */

import {
  generateExecutionScenario,
  phasePayload,
  INSUFFICIENT_BASIS,
} from './living-engine/orchestrator.js';
import { ENGINE_DISCLOSURE } from './living-engine/mission-parser.js';
import { formatCurrency } from './execution-value-engine.js';
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
  { id: 'decision', label: 'Decision' },
];

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

function renderInsufficient(message) {
  return `<p class="le-step-output le-insufficient">${escapeHtml(message || INSUFFICIENT_BASIS)}</p>`;
}

function buildMissionHtml(payload) {
  return `
    <p class="le-mission-headline">${escapeHtml(payload.mission.headline)}</p>
    <p class="le-step-output">${escapeHtml(payload.mission.statement)}</p>`;
}

function buildIntentHtml(payload) {
  const objectives = (payload.objectives ?? [])
    .slice(0, 4)
    .map((objective) => `<li>${escapeHtml(objective.text)}</li>`)
    .join('');
  const constraints = (payload.constraints ?? [])
    .map((constraint) => `<li>${escapeHtml(constraint.marker)} — cited from mission</li>`)
    .join('');
  const geography = (payload.geography ?? [])
    .map((geo) => `<li>${escapeHtml(geo.place)}</li>`)
    .join('');

  const parts = [`<ul class="le-list">${objectives}</ul>`];
  if (constraints) {
    parts.push('<p class="le-subhead">Constraints detected</p>', `<ul class="le-list">${constraints}</ul>`);
  }
  if (geography.length) {
    parts.push('<p class="le-subhead">Geography mentioned</p>', `<ul class="le-list">${geography}</ul>`);
  }
  if (!constraints.length) {
    parts.push('<p class="le-step-output">No explicit constraints stated in mission.</p>');
  }
  return parts.join('');
}

function buildContextHtml(payload) {
  const lines = [];
  const context = payload.executionContext;
  if (context) {
    lines.push(
      `<p class="le-step-output">Context completeness: <strong>${escapeHtml(context.completeness)}</strong></p>`,
    );
    if (context.orgFactsPresent?.length) {
      lines.push(`<p class="le-step-output">Declared: ${escapeHtml(context.orgFactsPresent.join(', '))}</p>`);
    }
    if (context.orgFactsMissing?.length) {
      lines.push(`<p class="le-step-output">${escapeHtml(INSUFFICIENT_BASIS)} — missing: ${escapeHtml(context.orgFactsMissing.join(', '))}</p>`);
    }
  }
  if (payload.executionValue?.connected) {
    lines.push(
      `<p class="le-step-output">Recoverable value: ${formatCurrency(payload.executionValue.recoverableValue)}</p>`,
    );
  } else {
    lines.push(`<p class="le-step-output">${escapeHtml(INSUFFICIENT_BASIS)} — organization profile not bound.</p>`);
  }
  if (payload.assessmentContext?.connected) {
    lines.push(
      `<p class="le-step-output">${escapeHtml(payload.assessmentContext.organization)} · Execution domain bound</p>`,
    );
  }
  return lines.join('');
}

function buildReasoningHtml(payload) {
  const claims = (payload.claims ?? [])
    .slice(0, 6)
    .map(
      (claim) =>
        `<li><strong>${escapeHtml(claim.id)}</strong> — ${escapeHtml(claim.statement)} <span class="le-confidence">(${escapeHtml(claim.confidence)})</span></li>`,
    )
    .join('');
  const chain = (payload.chain ?? [])
    .slice(0, 4)
    .map(
      (step) =>
        `<li>${escapeHtml(step.step_id)}: ${escapeHtml(step.inference)} <span class="le-premises">[${escapeHtml(step.premises.join(', '))}]</span></li>`,
    )
    .join('');
  const stakeholders = (payload.stakeholders ?? [])
    .map((stakeholder) => `<li>${escapeHtml(stakeholder.role)}</li>`)
    .join('');
  const dependencies = (payload.dependencies ?? [])
    .map((dependency) => `<li>${escapeHtml(dependency.type)}: ${escapeHtml(dependency.target)}</li>`)
    .join('');
  const insufficient = (payload.insufficientAreas ?? [])
    .map((area) => `<li>${escapeHtml(area.area)} — ${escapeHtml(area.status)}</li>`)
    .join('');

  return `
    <p class="le-subhead">Claims</p>
    <ul class="le-list">${claims || `<li>${escapeHtml(INSUFFICIENT_BASIS)}</li>`}</ul>
    <p class="le-subhead">Reasoning chain</p>
    <ul class="le-list">${chain || `<li>${escapeHtml(INSUFFICIENT_BASIS)}</li>`}</ul>
    ${stakeholders ? `<p class="le-subhead">Stakeholders (from mission)</p><ul class="le-list">${stakeholders}</ul>` : `<p class="le-step-output">${escapeHtml(INSUFFICIENT_BASIS)} — stakeholders not named in mission.</p>`}
    ${dependencies ? `<p class="le-subhead">Dependencies (from mission)</p><ul class="le-list">${dependencies}</ul>` : `<p class="le-step-output">${escapeHtml(INSUFFICIENT_BASIS)} — dependencies not stated in mission.</p>`}
    ${insufficient ? `<p class="le-subhead">Insufficient basis</p><ul class="le-list">${insufficient}</ul>` : ''}`;
}

function buildValidationHtml(payload) {
  const validation = payload.validation;
  if (!validation?.summary) {
    return renderInsufficient('Validation output unavailable.');
  }

  const summary = validation.summary;
  const findings = (payload.findings ?? validation.findings ?? []).slice(0, 8);

  const severityLines = Object.entries(summary.severityDistribution ?? {})
    .map(([key, count]) => `<li>${escapeHtml(key)}: ${count}</li>`)
    .join('');
  const statusLines = Object.entries(summary.statusDistribution ?? {})
    .map(([key, count]) => `<li>${escapeHtml(key)}: ${count}</li>`)
    .join('');
  const findingsHtml = findings
    .map(
      (finding) =>
        `<li><strong>${escapeHtml(finding.rule_id)}</strong> → ${escapeHtml(finding.claim_id)} · ${escapeHtml(finding.execution_status)} · ${escapeHtml(finding.severity)} — ${escapeHtml(finding.explanation)}</li>`,
    )
    .join('');
  const blockedHtml = summary.blockedClaims?.length
    ? `<p class="le-subhead">Blocked claims</p><ul class="le-list">${summary.blockedClaims.map((claimId) => `<li>${escapeHtml(claimId)}</li>`).join('')}</ul>`
    : '';

  return `
    <dl class="le-output-grid">
      <dt>Claims validated</dt><dd>${summary.claimsValidated}</dd>
      <dt>Rules applied</dt><dd>${summary.rulesApplied}</dd>
      <dt>Findings</dt><dd>${summary.findingsCount}</dd>
    </dl>
    <p class="le-subhead">Severity distribution</p>
    <ul class="le-list">${severityLines || `<li>${escapeHtml(INSUFFICIENT_BASIS)}</li>`}</ul>
    <p class="le-subhead">Execution status</p>
    <ul class="le-list">${statusLines || `<li>${escapeHtml(INSUFFICIENT_BASIS)}</li>`}</ul>
    ${blockedHtml}
    <p class="le-subhead">Findings</p>
    <ul class="le-list">${findingsHtml || `<li>${escapeHtml(INSUFFICIENT_BASIS)}</li>`}</ul>`;
}

function buildDecisionHtml(payload) {
  const o = payload.outputs;
  return `
    <dl class="le-output-grid">
      <dt>Reasoning status</dt><dd>${escapeHtml(o.reasoning?.status ?? INSUFFICIENT_BASIS)}</dd>
      <dt>Claims</dt><dd>${o.reasoning?.claimCount ?? 0}</dd>
      <dt>Chain steps</dt><dd>${o.reasoning?.chainLength ?? 0}</dd>
      <dt>Decision</dt><dd>${escapeHtml(o.decision?.outcome ?? INSUFFICIENT_BASIS)}</dd>
    </dl>
    <p class="le-step-output">${escapeHtml(o.decision?.reason ?? 'Decision chain not yet available.')}</p>`;
}

function phaseBodyHtml(phaseId, result) {
  const payload = phasePayload(result, phaseId);
  if (!payload) return `<p class="le-step-output">Awaiting mission input</p>`;

  switch (phaseId) {
    case 'mission':
      return buildMissionHtml(payload);
    case 'intent':
      return buildIntentHtml(payload);
    case 'context':
      return buildContextHtml(payload);
    case 'reasoning':
      return buildReasoningHtml(payload);
    case 'validation':
      return buildValidationHtml(payload);
    case 'evidence':
      return renderInsufficient(payload.evidence?.message);
    case 'decision':
      return buildDecisionHtml(payload);
    default:
      return `<p class="le-step-output">Stage output ready</p>`;
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
    hint.textContent = 'Reasoning complete — continue when ready.';
  } else {
    cta.classList.add('is-disabled');
    cta.setAttribute('aria-disabled', 'true');
    hint.textContent = 'Complete the reasoning chain to continue.';
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

    if (message) {
      message.textContent = `Reasoning complete — ${result.reasoning.claims.length} claims, ${result.reasoning.chain.length} chain steps.`;
      message.className = 'le-message le-live le-message--success';
    }
    if (submitBtn) submitBtn.disabled = false;
  });
}

document.addEventListener('DOMContentLoaded', initLivingEngine);
