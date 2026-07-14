/**
 * Living Execution Engine — UI controller (no business logic).
 */

import {
  generateExecutionScenario,
  phasePayload,
  formatBudget,
} from './living-engine/orchestrator.js';
import { ENGINE_DISCLOSURE } from './living-engine/mission-parser.js';
import { formatCurrency } from './execution-value-engine.js';
import {
  persistEngineRun,
  applyEngineHandoff,
  applyPilotHandoff,
  applyOneHandoff,
  buildRequestUrl,
  loadPublicFunnelContext,
  missionContext,
} from './public-funnel.js';

const PHASE_DELAY_MS = 480;

const DISPLAY_PHASES = [
  { id: 'mission', label: 'Mission' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'planning', label: 'Planning' },
  { id: 'validation', label: 'Validation' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'prediction', label: 'Prediction' },
  { id: 'execution-ready', label: 'Execution Ready' },
];

const DEFAULT_DEMO_MISSION =
  'Govern mission portfolio with visible execution checkpoints before action proceeds.';

function kindBadge(kind) {
  const normalized =
    kind === 'Demonstration' ? 'Demo' : kind ?? 'Demo';
  const cls =
    normalized === 'Estimated'
      ? 'le-kind--estimated'
      : normalized === 'Calculated'
        ? 'le-kind--calculated'
        : 'le-kind--demo';
  return `<span class="le-kind ${cls}">${normalized}</span>`;
}

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

function resolveMissionText(input) {
  const typed = (input?.value ?? '').trim();
  if (typed.length >= 8) return typed;
  const contextual = missionContext(loadPublicFunnelContext());
  if (contextual && contextual.length >= 8) return contextual;
  return DEFAULT_DEMO_MISSION;
}

function buildAnalysisHtml(payload) {
  const lines = [
    `<p class="le-step-output">${kindBadge('Calculated')} Domain: <strong>${escapeHtml(payload.domain)}</strong></p>`,
  ];
  if (payload.executionValue?.connected) {
    lines.push(
      `<p class="le-step-output">${kindBadge(payload.executionValue.kind)} Recoverable ${formatCurrency(payload.executionValue.recoverableValue)} from Execution Intelligence</p>`,
    );
  } else {
    lines.push(
      `<p class="le-step-output">${kindBadge('Demo')} Funnel baseline — complete Execution Intelligence for quantified analysis</p>`,
    );
  }
  if (payload.assessmentContext?.connected) {
    lines.push(
      `<p class="le-step-output">${kindBadge(payload.assessmentContext.kind)} ${escapeHtml(payload.assessmentContext.organization)} · Score ${payload.assessmentContext.executionScore}/100</p>`,
    );
  } else {
    lines.push(
      `<p class="le-step-output">${kindBadge('Demo')} Assessment context — complete Assessment for calibrated analysis</p>`,
    );
  }
  return lines.join('');
}

function buildPlanningHtml(payload) {
  const objList = payload.objectives
    .slice(0, 3)
    .map((o) => `<li>${escapeHtml(o.text.slice(0, 64))} ${kindBadge(o.kind)}</li>`)
    .join('');
  const projList = payload.projects
    .slice(0, 3)
    .map((p) => `<li>${escapeHtml(p.name)} ${kindBadge(p.kind)}</li>`)
    .join('');
  return `
    <ul class="le-list">${objList}</ul>
    <p class="le-step-output">${kindBadge(payload.timeline.kind)} ${payload.timeline.months} months · ${kindBadge(payload.budget.kind)} ${formatBudget(payload.budget)}</p>
    <p class="le-subhead">Projects</p>
    <ul class="le-list">${projList}</ul>`;
}

function buildValidationHtml(payload) {
  const checks = payload.validation.checks
    .slice(0, 4)
    .map(
      (c) =>
        `<li><span class="le-check le-check--${c.status.toLowerCase()}">${c.status}</span> ${escapeHtml(c.rule)} ${kindBadge(c.kind)}</li>`,
    )
    .join('');
  return `
    <p class="le-step-output">${kindBadge(payload.validation.kind)} ${escapeHtml(payload.validation.summary)} · ${payload.validation.passRate}% pass</p>
    <ul class="le-list">${checks}</ul>`;
}

function buildEvidenceHtml(evidence) {
  const items = (evidence.items ?? [])
    .slice(0, 4)
    .map((item) => `<li>${escapeHtml(item.name ?? item.label ?? 'Evidence requirement')} ${kindBadge(evidence.kind)}</li>`)
    .join('');
  return `
    <p class="le-step-output">${kindBadge(evidence.kind)} ${escapeHtml(evidence.summary)}</p>
    <ul class="le-list">${items || `<li>Governed proof requirements mapped ${kindBadge('Estimated')}</li>`}</ul>`;
}

function buildPredictionWhy(result) {
  const { scenario, calculator, assessment } = result;
  const highRisks = scenario.risks.filter(
    (r) => r.severity === 'High' || r.severity === 'Critical',
  ).length;
  const parts = [
    `${highRisks} high-risk item${highRisks === 1 ? '' : 's'} in plan`,
    `${scenario.validation.passRate}% validation pass rate`,
  ];
  if (assessment?.connected) {
    parts.push(`Assessment score ${assessment.executionScore}/100`);
  } else if (calculator?.connected) {
    parts.push(`Calculator score ${calculator.executionScore}/100`);
  } else {
    parts.push('Demonstration funnel baseline');
  }
  return `Why this prediction: ${parts.join(' · ')}.`;
}

function buildPredictionHtml(prediction, result) {
  const items = prediction.predictions
    .map(
      (p) =>
        `<li>${escapeHtml(p.text)} — ${p.likelihood} ${kindBadge(p.kind)}</li>`,
    )
    .join('');
  return `
    <p class="le-step-output le-readiness">${kindBadge(prediction.kind)} Readiness <strong>${prediction.executionReadiness}%</strong></p>
    <p class="le-prediction-why">${escapeHtml(buildPredictionWhy(result))}</p>
    <ul class="le-list">${items}</ul>`;
}

function buildReadyHtml(payload) {
  const o = payload.outputs;
  return `
    <dl class="le-output-grid">
      <dt>Score</dt><dd>${o.executionScore.value}/100 ${kindBadge(o.executionScore.kind)}</dd>
      <dt>Quality</dt><dd>${escapeHtml(o.executionQuality.value)} ${kindBadge(o.executionQuality.kind)}</dd>
      <dt>Budget</dt><dd>${formatBudget(o.estimatedBudget)} ${kindBadge(o.estimatedBudget.kind)}</dd>
      <dt>Timeline</dt><dd>${o.estimatedTimeline.months} months ${kindBadge(o.estimatedTimeline.kind)}</dd>
    </dl>
    <p class="le-step-output">${kindBadge(o.recommendedNextActions.kind)} ${escapeHtml(o.recommendedNextActions.recommendation)}</p>`;
}

function phaseBodyHtml(phaseId, result) {
  const payload = phasePayload(result, phaseId === 'evidence' ? 'validation' : phaseId);
  if (!payload) return `<p class="le-step-output">${kindBadge('Demo')} Awaiting mission input</p>`;

  switch (phaseId) {
    case 'mission':
      return `
        <p class="le-mission-headline">${escapeHtml(payload.mission.headline)}</p>
        <p class="le-step-output">${kindBadge('Calculated')} ${escapeHtml(payload.mission.domainLabel ?? 'Governed execution initiative')}</p>`;
    case 'analysis':
      return buildAnalysisHtml(payload);
    case 'planning':
      return buildPlanningHtml(payload);
    case 'validation':
      return buildValidationHtml(payload);
    case 'evidence':
      return buildEvidenceHtml(payload.evidence);
    case 'prediction':
      return buildPredictionHtml(payload.prediction, result);
    case 'execution-ready':
      return buildReadyHtml(payload);
    default:
      return `<p class="le-step-output">${kindBadge('Demo')} Stage output ready</p>`;
  }
}

function phaseKind(phaseId, result) {
  const payload = phasePayload(result, phaseId === 'evidence' ? 'validation' : phaseId);
  if (!payload) return 'Demo';
  switch (phaseId) {
    case 'mission':
      return 'Calculated';
    case 'analysis':
      return payload.assessmentContext?.connected ? 'Calculated' : 'Estimated';
    case 'planning':
      return 'Estimated';
    case 'validation':
      return payload.validation?.kind ?? 'Calculated';
    case 'evidence':
      return payload.evidence?.kind ?? 'Estimated';
    case 'prediction':
      return payload.prediction?.kind ?? 'Estimated';
    case 'execution-ready':
      return result.outputs?.executionScore?.kind ?? 'Calculated';
    default:
      return 'Demo';
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
    const kind = phaseKind(phase.id, result);
    return `
      <div class="le-flow-step le-flow-step--${state}" data-le-phase="${phase.id}">
        <div class="le-flow-step-head">
          <span class="le-flow-step-label">${phase.label}</span>
          ${kindBadge(kind)}
        </div>
        <div class="le-flow-step-body">${phaseBodyHtml(phase.id, result)}</div>
      </div>
      ${i < DISPLAY_PHASES.length - 1 ? '<div class="le-flow-arrow" aria-hidden="true">↓</div>' : ''}`;
  }).join('');
}

function updateOneCoreCta(flowComplete, userRan, predictionReady) {
  const cta = document.getElementById('le-cta-one-core');
  const hint = document.getElementById('le-cta-one-hint');
  if (!cta || !hint) return;

  if (userRan && flowComplete) {
    cta.classList.remove('is-disabled');
    cta.setAttribute('aria-disabled', 'false');
    hint.textContent = predictionReady
      ? 'Continue to One Core.'
      : 'Review readiness, then continue.';
  } else {
    cta.classList.add('is-disabled');
    cta.setAttribute('aria-disabled', 'true');
    hint.textContent = 'Reach Execution Ready to continue.';
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
    executionScore: result.executionScore.value,
    executionReadiness: result.scenario.prediction.executionReadiness,
    scenario: result.scenario,
    outputs: result.outputs,
  });
}

function renderDemoState(ui, input) {
  const demo = generateExecutionScenario(resolveMissionText(input));
  if (!demo.ok) return null;
  renderLifecycleBar(ui.lifecycle, DISPLAY_PHASES.length);
  renderFlow(ui.flow, demo, DISPLAY_PHASES.length);
  updateOneCoreCta(false, false, false);
  return demo;
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
  renderDemoState(ui, input);

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

    const pilotCta = root.querySelector('#le-cta-pilot');
    if (pilotCta) pilotCta.href = buildRequestUrl();

    await runProgressiveReveal(result, ui);

    const predictionReady = Boolean(result.scenario.prediction.executionReady);
    updateOneCoreCta(true, true, predictionReady);

    if (message) {
      message.textContent = predictionReady
        ? 'Execution Ready — scenario complete.'
        : 'Execution Ready — scenario built.';
      message.className = 'le-message le-live le-message--success';
    }
    if (submitBtn) submitBtn.disabled = false;
  });
}

document.addEventListener('DOMContentLoaded', initLivingEngine);
