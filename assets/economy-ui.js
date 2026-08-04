/**
 * Execution Economy — UI controller (no business logic).
 */

import {
  layoutStages,
  buildFlowEdges,
  ECONOMY_CYCLE_MESSAGE,
  resolveStage,
  keyboardNavigate,
  animationActiveIndex,
} from './execution-economy/economy-model.js';
import { buildEconomyFlow } from './execution-economy/economy-connector.js';

const DEFAULT_STAGE = 'execution';
const ANIMATION_MS = 2800;

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderIndicators(host, context) {
  const items = [];
  if (context.mission) {
    items.push(`<span class="ee-ind"><strong>Mission</strong> ${escapeHtml(context.mission.slice(0, 40))}…</span>`);
  }
  if (context.executionScore != null) {
    items.push(`<span class="ee-ind"><strong>Score</strong> ${context.executionScore}/100</span>`);
  }
  if (context.executionValue != null) {
    items.push(`<span class="ee-ind"><strong>Value</strong> bound</span>`);
  }
  if (context.assessmentStatus) {
    items.push(`<span class="ee-ind"><strong>Assessment</strong> ${escapeHtml(context.assessmentStatus)}</span>`);
  }
  if (context.priorityAreas?.length) {
    items.push(`<span class="ee-ind"><strong>Priority</strong> ${escapeHtml(context.priorityAreas[0])}</span>`);
  }
  if (!items.length) {
    items.push('<span class="ee-ind ee-ind--wait">Complete funnel stages to activate live indicators</span>');
  }
  host.innerHTML = items.join('');
}

function renderDetail(panel, stage) {
  if (!stage) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  panel.innerHTML =
    `<div class="ee-detail-head">` +
    `<h4>${escapeHtml(stage.label)}</h4>` +
    `<span class="ee-kind">${escapeHtml(stage.kind)}</span>` +
    `</div>` +
    `<p class="ee-live-ind ${stage.live ? '' : 'ee-live-ind--wait'}">${escapeHtml(stage.indicator)}</p>` +
    `<dl class="ee-detail-grid">` +
    `<dt>Purpose</dt><dd>${escapeHtml(stage.purpose)}</dd>` +
    `<dt>Inputs</dt><dd><ul>${stage.inputs.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul></dd>` +
    `<dt>Outputs</dt><dd><ul>${stage.outputs.map((o) => `<li>${escapeHtml(o)}</li>`).join('')}</ul></dd>` +
    `<dt>Business value</dt><dd>${escapeHtml(stage.businessValue)}</dd>` +
    `<dt>Enterprise impact</dt><dd>${escapeHtml(stage.enterpriseImpact)}</dd>` +
    `<dt>Dependencies</dt><dd>${stage.dependencies.length ? stage.dependencies.map(escapeHtml).join(', ') : 'Cycle start'}</dd>` +
    `</dl>`;
}

function renderFlow(canvas, flow, selectedId, pulseIndex, onSelect) {
  const width = canvas.clientWidth || 640;
  const layout = layoutStages(flow.stageIds.length, width);
  const edges = buildFlowEdges(layout);
  const height = layout.height;
  canvas.style.height = `${height}px`;

  canvas.innerHTML = '';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'ee-flow-svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('aria-hidden', 'true');

  const posById = Object.fromEntries(layout.stages.map((p) => [p.id, p]));

  edges.forEach((edge, i) => {
    const from = posById[edge.from];
    const to = posById[edge.to];
    if (!from || !to) return;
    if (edge.type === 'loop') {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const loopX = width * 0.72;
      path.setAttribute(
        'd',
        `M ${from.x + 40} ${from.y} C ${loopX} ${from.y} ${loopX} ${to.y} ${to.x + 40} ${to.y}`,
      );
      path.setAttribute('class', 'ee-edge ee-edge--loop');
      path.style.animationDelay = `${i * 0.12}s`;
      svg.appendChild(path);
      return;
    }
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(from.x + 40));
    line.setAttribute('y1', String(from.y));
    line.setAttribute('x2', String(to.x + 40));
    line.setAttribute('y2', String(to.y));
    line.setAttribute('class', 'ee-edge ee-edge--flow');
    line.style.animationDelay = `${i * 0.1}s`;
    svg.appendChild(line);
  });

  canvas.appendChild(svg);

  const layer = document.createElement('div');
  layer.className = 'ee-stage-layer';

  flow.stages.forEach((stage, index) => {
    const pos = posById[stage.id];
    if (!pos) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    const isActive = selectedId === stage.id;
    const isPulse = pulseIndex === index;
    btn.className = `ee-stage${isActive ? ' ee-stage--active' : ''}${isPulse ? ' ee-stage--pulse' : ''}${stage.live ? ' ee-stage--live' : ''}`;
    btn.style.left = `${(pos.x / width) * 100}%`;
    btn.style.top = `${pos.y}px`;
    btn.dataset.stageId = stage.id;
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    btn.setAttribute('aria-label', `${stage.label}. ${stage.indicator}`);
    btn.innerHTML =
      `<span class="ee-stage-label">${escapeHtml(stage.label)}</span>` +
      `<span class="ee-stage-ind">${escapeHtml(stage.indicator.slice(0, 42))}${stage.indicator.length > 42 ? '…' : ''}</span>`;
    btn.addEventListener('click', () => onSelect(stage.id));
    btn.addEventListener('mouseenter', () => onSelect(stage.id));
    layer.appendChild(btn);
  });

  canvas.appendChild(layer);
}

export function initExecutionEconomy() {
  const root = document.getElementById('execution-economy-product');
  if (!root) return;

  const indicators = root.querySelector('.ee-indicators');
  const canvas = root.querySelector('.ee-flow-canvas');
  const detail = root.querySelector('.ee-detail-panel');
  if (!canvas || !detail) return;

  let selectedId = DEFAULT_STAGE;
  let pulseIndex = 0;
  let flow = buildEconomyFlow();
  let animTimer = null;

  function selectStage(id) {
    selectedId = id;
    pulseIndex = flow.stageIds.indexOf(id);
    renderFlow(canvas, flow, selectedId, pulseIndex, selectStage);
    renderDetail(detail, resolveStage(selectedId, flow.stages));
  }

  function refresh() {
    flow = buildEconomyFlow();
    if (indicators) renderIndicators(indicators, flow.context);
    renderFlow(canvas, flow, selectedId, pulseIndex, selectStage);
    renderDetail(detail, resolveStage(selectedId, flow.stages));
  }

  function startAnimation() {
    if (animTimer) clearInterval(animTimer);
    animTimer = setInterval(() => {
      pulseIndex = animationActiveIndex(pulseIndex + 1, flow.stages.length);
      renderFlow(canvas, flow, selectedId, pulseIndex, selectStage);
    }, ANIMATION_MS);
  }

  canvas.setAttribute('tabindex', '0');
  canvas.setAttribute('role', 'application');
  canvas.setAttribute('aria-label', 'Execution Economy flow. Use arrow keys to navigate stages.');

  canvas.addEventListener('keydown', (e) => {
    const next = keyboardNavigate(e, selectedId);
    if (next !== selectedId) {
      e.preventDefault();
      selectStage(next);
    }
  });

  const cycleEl = root.querySelector('.ee-cycle-message');
  if (cycleEl) cycleEl.textContent = ECONOMY_CYCLE_MESSAGE;

  document.addEventListener('executia:funnel-update', refresh);
  refresh();
  startAnimation();

  return () => {
    if (animTimer) clearInterval(animTimer);
    document.removeEventListener('executia:funnel-update', refresh);
  };
}

document.addEventListener('DOMContentLoaded', initExecutionEconomy);
