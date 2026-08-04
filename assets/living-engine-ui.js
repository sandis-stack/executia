/**
 * Living Execution Engine — UI controller (no business logic).
 */

import {
  generateExecutionScenario,
  LIFECYCLE_PHASES,
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
  buildOneUrl,
} from './public-funnel.js';

const PHASE_DELAY_MS = 520;

function kindBadge(kind) {
  return `<span class="le-kind">${kind}</span>`;
}

function renderLifecycle(root, activeIndex) {
  root.innerHTML = LIFECYCLE_PHASES.map((phase, i) => {
    let state = 'pending';
    if (i < activeIndex) state = 'done';
    else if (i === activeIndex) state = 'active';
    return `<div class="le-step le-step--${state}" data-phase="${phase.id}"><span class="le-step-label">${phase.label}</span></div>`;
  }).join('<span class="le-step-arrow" aria-hidden="true">↓</span>');
}

function renderPhasePanel(panel, phaseId, payload) {
  if (!payload) return;
  const block = document.createElement('div');
  block.className = 'le-phase-block';
  block.dataset.phase = phaseId;

  const title = LIFECYCLE_PHASES.find((p) => p.id === phaseId)?.label ?? phaseId;
  block.innerHTML = `<h4 class="le-phase-title">${title}</h4>`;

  const body = document.createElement('div');
  body.className = 'le-phase-body';

  switch (phaseId) {
    case 'mission':
      body.innerHTML = `
        <p class="le-mission-headline">${escapeHtml(payload.mission.headline)}</p>
        <p class="le-meta">${kindBadge('Calculated')} Domain: ${escapeHtml(payload.mission.domainLabel)}</p>`;
      break;
    case 'analysis':
      body.innerHTML = buildAnalysisHtml(payload);
      break;
    case 'planning':
      body.innerHTML = buildPlanningHtml(payload);
      break;
    case 'execution-graph':
      body.innerHTML = buildGraphHtml(payload.graph);
      break;
    case 'validation':
      body.innerHTML = buildValidationHtml(payload);
      break;
    case 'prediction':
      body.innerHTML = buildPredictionHtml(payload.prediction);
      break;
    case 'execution-ready':
      body.innerHTML = buildReadyHtml(payload);
      break;
    default:
      break;
  }

  block.appendChild(body);
  panel.appendChild(block);
  block.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function buildAnalysisHtml(payload) {
  const lines = [
    `<p>${kindBadge('Calculated')} Analyzing mission domain: <strong>${escapeHtml(payload.domain)}</strong></p>`,
  ];
  if (payload.executionValue?.connected) {
    lines.push(
      `<p>${kindBadge(payload.executionValue.kind)} Execution Value context: recoverable ${formatCurrency(payload.executionValue.recoverableValue)}</p>`,
    );
  } else {
    lines.push(`<p>${kindBadge('Demo')} Complete Execution Value Calculator for quantified context.</p>`);
  }
  if (payload.assessmentContext?.connected) {
    lines.push(
      `<p>${kindBadge(payload.assessmentContext.kind)} Assessment: ${escapeHtml(payload.assessmentContext.organization)} · Score ${payload.assessmentContext.executionScore}/100</p>`,
    );
  } else {
    lines.push(`<p>${kindBadge('Demo')} Organization Assessment not completed — using demonstration baseline.</p>`);
  }
  return lines.join('');
}

function buildPlanningHtml(payload) {
  const objList = payload.objectives.map((o) => `<li>${escapeHtml(o.text.slice(0, 72))} ${kindBadge(o.kind)}</li>`).join('');
  const projList = payload.projects.map((p) => `<li>${escapeHtml(p.name)} ${kindBadge(p.kind)}</li>`).join('');
  return `
    <ul class="le-list">${objList}</ul>
    <p class="le-meta">${kindBadge(payload.timeline.kind)} Timeline: ${payload.timeline.months} months (${payload.timeline.weeks} weeks)</p>
    <p class="le-meta">${kindBadge(payload.budget.kind)} Budget: ${formatBudget(payload.budget)}</p>
    <p class="le-subhead">Projects</p>
    <ul class="le-list">${projList}</ul>`;
}

function buildGraphHtml(graph) {
  const nodes = graph.nodes.slice(0, 10).map((n) =>
    `<span class="le-node le-node--${n.type.toLowerCase()}">${escapeHtml(n.label)} ${kindBadge(n.kind)}</span>`,
  ).join('');
  return `<div class="le-graph">${nodes}</div><p class="le-meta">${kindBadge(graph.kind)} ${graph.nodes.length} nodes · ${graph.edges.length} relationships</p>`;
}

function buildValidationHtml(payload) {
  const checks = payload.validation.checks.map((c) =>
    `<li><span class="le-check le-check--${c.status.toLowerCase()}">${c.status}</span> ${escapeHtml(c.rule)} ${kindBadge(c.kind)}</li>`,
  ).join('');
  return `
    <p>${kindBadge(payload.validation.kind)} ${escapeHtml(payload.validation.summary)} (${payload.validation.passRate}%)</p>
    <ul class="le-list">${checks}</ul>
    <p class="le-subhead">Evidence ${kindBadge(payload.evidence.kind)}</p>
    <p>${escapeHtml(payload.evidence.summary)}</p>`;
}

function buildPredictionHtml(prediction) {
  const items = prediction.predictions.map((p) =>
    `<li>${escapeHtml(p.text)} — ${p.likelihood} ${kindBadge(p.kind)}</li>`,
  ).join('');
  return `
    <p class="le-readiness">${kindBadge(prediction.kind)} Execution readiness: <strong>${prediction.executionReadiness}%</strong></p>
    <ul class="le-list">${items}</ul>`;
}

function buildReadyHtml(payload) {
  const o = payload.outputs;
  return `
    <dl class="le-output-grid">
      <dt>Mission</dt><dd>${escapeHtml(o.missionSummary.headline.slice(0, 60))} ${kindBadge(o.missionSummary.kind)}</dd>
      <dt>Execution Score</dt><dd>${o.executionScore.value}/100 ${kindBadge(o.executionScore.kind)}</dd>
      <dt>Quality</dt><dd>${escapeHtml(o.executionQuality.value)} ${kindBadge(o.executionQuality.kind)}</dd>
      <dt>Budget</dt><dd>${formatBudget(o.estimatedBudget)} ${kindBadge(o.estimatedBudget.kind)}</dd>
      <dt>Timeline</dt><dd>${o.estimatedTimeline.months} months ${kindBadge(o.estimatedTimeline.kind)}</dd>
      <dt>Risks</dt><dd>${o.executionRisks.count} identified ${kindBadge(o.executionRisks.kind)}</dd>
    </dl>
    <p class="le-subhead">Recommended next actions</p>
    <ol class="le-list le-list--ordered">${o.recommendedNextActions.items.map((a) => `<li>${escapeHtml(a.action)} ${kindBadge(a.kind)}</li>`).join('')}</ol>
    <p class="le-pilot-rec">${kindBadge(o.recommendedNextActions.kind)} Pilot: ${escapeHtml(o.recommendedNextActions.recommendation)}</p>`;
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

async function runProgressiveReveal(result, ui) {
  ui.workspace.hidden = false;
  ui.panels.innerHTML = '';
  ui.lifecycle.hidden = false;

  for (let i = 0; i < LIFECYCLE_PHASES.length; i += 1) {
    const phase = LIFECYCLE_PHASES[i];
    renderLifecycle(ui.lifecycle, i);
    renderPhasePanel(ui.panels, phase.id, phasePayload(result, phase.id));
    if (i < LIFECYCLE_PHASES.length - 1) {
      await sleep(PHASE_DELAY_MS);
    }
  }
  renderLifecycle(ui.lifecycle, LIFECYCLE_PHASES.length);
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

export function initLivingEngine() {
  const root = document.getElementById('living-engine-product');
  if (!root) return;

  const disclosure = root.querySelector('.le-disclosure');
  if (disclosure) disclosure.textContent = ENGINE_DISCLOSURE;

  const form = root.querySelector('#living-engine-form');
  const input = root.querySelector('#living-engine-input');
  const workspace = root.querySelector('#living-engine-workspace');
  const lifecycle = root.querySelector('#le-lifecycle');
  const panels = root.querySelector('#le-phase-panels');
  const message = root.querySelector('#le-message');
  const submitBtn = form?.querySelector('button[type="submit"]');

  const ui = { workspace, lifecycle, panels };

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = (input?.value ?? '').trim();
    if (message) {
      message.textContent = '';
      message.className = 'le-message';
    }

    const result = generateExecutionScenario(text);
    if (!result.ok) {
      if (message) {
        message.textContent = result.message;
        message.className = 'le-message le-message--error';
      }
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    persistResult(result);
    applyEngineHandoff();
    applyPilotHandoff();
    applyOneHandoff();

    const pilotCta = root.querySelector('#le-cta-pilot');
    const oneCta = root.querySelector('#le-cta-one');
    if (pilotCta) pilotCta.href = buildRequestUrl();
    if (oneCta) oneCta.href = buildOneUrl();

    await runProgressiveReveal(result, ui);

    if (message) {
      message.textContent = `${ENGINE_DISCLOSURE} Execution scenario ready.`;
      message.className = 'le-message le-message--success';
    }
    if (submitBtn) submitBtn.disabled = false;
  });
}

document.addEventListener('DOMContentLoaded', initLivingEngine);
