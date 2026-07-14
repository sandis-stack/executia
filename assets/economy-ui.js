/**
 * Execution Economy — UI controller (no business logic).
 */

import { resolveStage, WAITING_INDICATOR } from './execution-economy/economy-model.js';
import { buildEconomyFlow } from './execution-economy/economy-connector.js';
import { formatCurrency } from './execution-value-engine.js';

const DEFAULT_STAGE = 'execution';

const DISPLAY_STAGE_IDS = [
  'execution',
  'evidence',
  'knowledge',
  'trust',
  'capital',
  'growth',
  'better-execution',
];

const STAGE_LABELS = {
  execution: 'Execution',
  evidence: 'Evidence',
  knowledge: 'Knowledge',
  trust: 'Trust',
  capital: 'Capital',
  growth: 'Growth',
  'better-execution': 'Better Execution',
};

const DEMO_VALUE = {
  execution: 'Governed execution record — outcomes ready for verification and valuation',
  evidence: 'Verifiable evidence chain — proof captured at execution time',
  knowledge: 'Execution knowledge graph — organizational memory from verified outcomes',
  trust: 'Stakeholder trust index — confidence built from verified execution proof',
  capital: 'Execution capital — accumulated credibility that funds decisions',
  growth: 'Growth envelope — expansion capacity unlocked by execution capital',
  'better-execution': 'Next-cycle execution readiness — improved standard feeds the loop',
};

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeKind(kind) {
  if (kind === 'Demonstration') return 'Demo';
  return kind ?? 'Demo';
}

function kindBadge(_kind) {
  return '';
}

function valueCreated(stage, context) {
  const id = stage.id;

  if (stage.live && stage.indicator && stage.indicator !== WAITING_INDICATOR) {
    return { text: stage.indicator, kind: normalizeKind(stage.kind) };
  }

  if (id === 'trust' && context.executionScore != null) {
    return {
      text: `Trust index supported by Execution Score ${context.executionScore}/100`,
      kind: 'Calculated',
    };
  }
  if (id === 'capital' && context.executionValue != null) {
    return {
      text: `Execution capital from ${formatCurrency(context.executionValue)} recoverable baseline`,
      kind: 'Estimated',
    };
  }
  if (id === 'growth' && context.priorityAreas?.length) {
    return {
      text: `Growth priority: ${context.priorityAreas[0]}`,
      kind: context.calculatorReady ? 'Estimated' : 'Demo',
    };
  }
  if (id === 'knowledge' && context.scenario?.graph) {
    return {
      text: `${context.scenario.graph.nodes.length} knowledge nodes · ${context.scenario.graph.edges.length} relationships`,
      kind: 'Calculated',
    };
  }

  return { text: DEMO_VALUE[id] ?? DEMO_VALUE.execution, kind: 'Demo' };
}

function renderFlowRail(host, selectedId) {
  if (!host) return;
  host.innerHTML = DISPLAY_STAGE_IDS.map((id, index) => {
    const active = id === selectedId ? ' ee-flow-rail-step--active' : '';
    const step = `<span class="ee-flow-rail-step${active}" data-stage-id="${id}">${STAGE_LABELS[id]}</span>`;
    return index < DISPLAY_STAGE_IDS.length - 1
      ? `${step}<span class="ee-flow-rail-arrow" aria-hidden="true">↓</span>`
      : step;
  }).join('');
}

function renderDetail(panel, stage, context) {
  if (!stage) return;
  const value = valueCreated(stage, context);
  panel.hidden = false;
  panel.innerHTML =
    `<div class="ee-detail-head">` +
    `<h4>${escapeHtml(stage.label)}</h4>` +
    `${kindBadge(value.kind)}` +
    `</div>` +
    `<dl class="ee-detail-grid">` +
    `<dt>What value was created?</dt>` +
    `<dd class="ee-value-answer">${escapeHtml(value.text)}</dd>` +
    `</dl>`;
}

function displayStages(flow) {
  return DISPLAY_STAGE_IDS.map((id) => flow.stages.find((s) => s.id === id)).filter(Boolean);
}

function layoutDisplayStages(width) {
  const count = DISPLAY_STAGE_IDS.length;
  const step = Math.min(52, Math.max(38, (520 - 80) / Math.max(count - 1, 1)));
  const startY = 36;
  const x = width * 0.22;

  return {
    stages: DISPLAY_STAGE_IDS.map((id, index) => ({
      id,
      x,
      y: startY + index * step,
    })),
    width,
    height: startY + count * step + 40,
  };
}

function buildDisplayEdges(layout) {
  const edges = [];
  for (let i = 0; i < layout.stages.length - 1; i += 1) {
    edges.push({
      from: layout.stages[i].id,
      to: layout.stages[i + 1].id,
      type: 'flow',
    });
  }
  const first = layout.stages[0];
  const last = layout.stages[layout.stages.length - 1];
  if (first && last) {
    edges.push({ from: last.id, to: first.id, type: 'loop' });
  }
  return edges;
}

function navigateDisplayStage(event, selectedId) {
  const index = DISPLAY_STAGE_IDS.indexOf(selectedId);
  if (index < 0) return DISPLAY_STAGE_IDS[0];
  if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
    return DISPLAY_STAGE_IDS[(index + 1) % DISPLAY_STAGE_IDS.length];
  }
  if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
    return DISPLAY_STAGE_IDS[(index - 1 + DISPLAY_STAGE_IDS.length) % DISPLAY_STAGE_IDS.length];
  }
  return selectedId;
}

function renderFlow(canvas, flow, selectedId, onSelect) {
  const width = canvas.clientWidth || 640;
  const layout = layoutDisplayStages(width);
  const edges = buildDisplayEdges(layout);
  const height = layout.height;
  canvas.style.height = `${height}px`;

  const stages = displayStages(flow);
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

  stages.forEach((stage) => {
    const pos = posById[stage.id];
    if (!pos) return;
    const value = valueCreated(stage, flow.context);
    const btn = document.createElement('button');
    btn.type = 'button';
    const isActive = selectedId === stage.id;
    btn.className = `ee-stage${isActive ? ' ee-stage--active' : ''}${value.kind !== 'Demo' ? ' ee-stage--live' : ''}`;
    btn.style.left = `${(pos.x / width) * 100}%`;
    btn.style.top = `${pos.y}px`;
    btn.dataset.stageId = stage.id;
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    btn.setAttribute('aria-label', `${stage.label}. ${value.text}`);
    btn.innerHTML =
      `<span class="ee-stage-label">${escapeHtml(stage.label)}</span>` +
      `<span class="ee-stage-value">${kindBadge(value.kind)}</span>` +
      `<span class="ee-stage-ind">${escapeHtml(value.text.slice(0, 48))}${value.text.length > 48 ? '…' : ''}</span>`;
    btn.addEventListener('click', () => onSelect(stage.id, true));
    btn.addEventListener('mouseenter', () => onSelect(stage.id, false));
    layer.appendChild(btn);
  });

  canvas.appendChild(layer);
}

function updatePilotCta(hasInteracted) {
  const cta = document.getElementById('ee-cta-pilot');
  const hint = document.getElementById('ee-cta-pilot-hint');
  if (!cta || !hint) return;

  if (hasInteracted) {
    cta.classList.remove('is-disabled');
    cta.setAttribute('aria-disabled', 'false');
    hint.textContent = 'Begin Executive Assessment.';
  } else {
    cta.classList.add('is-disabled');
    cta.setAttribute('aria-disabled', 'true');
    hint.textContent = 'Select a stage.';
  }
}

export function initExecutionEconomy() {
  const root = document.getElementById('execution-economy-product');
  if (!root) return;

  const flowRail = root.querySelector('#ee-flow-rail');
  const canvas = root.querySelector('.ee-flow-canvas');
  const detail = root.querySelector('.ee-detail-panel');
  const pilotCta = root.querySelector('#ee-cta-pilot');
  if (!canvas || !detail) return;

  let selectedId = DEFAULT_STAGE;
  let hasInteracted = false;
  let flow = buildEconomyFlow();

  function selectStage(id, fromUser) {
    selectedId = id;
    if (fromUser) hasInteracted = true;
    const stage = resolveStage(selectedId, flow.stages);
    renderFlow(canvas, flow, selectedId, selectStage);
    renderFlowRail(flowRail, selectedId);
    renderDetail(detail, stage, flow.context);
    updatePilotCta(hasInteracted);
  }

  function refresh() {
    flow = buildEconomyFlow();
    const stage = resolveStage(selectedId, flow.stages);
    renderFlow(canvas, flow, selectedId, selectStage);
    renderFlowRail(flowRail, selectedId);
    renderDetail(detail, stage, flow.context);
    updatePilotCta(hasInteracted);
  }

  if (pilotCta) {
    pilotCta.addEventListener('click', (event) => {
      if (pilotCta.classList.contains('is-disabled')) {
        event.preventDefault();
      }
    });
  }

  canvas.setAttribute('tabindex', '0');
  canvas.setAttribute('role', 'application');
  canvas.setAttribute('aria-label', 'Execution Economy value cycle. Use arrow keys to navigate stages.');

  canvas.addEventListener('keydown', (e) => {
    const next = navigateDisplayStage(e, selectedId);
    if (next !== selectedId) {
      e.preventDefault();
      selectStage(next, true);
    }
  });

  document.addEventListener('executia:funnel-update', refresh);
  refresh();

  return () => {
    document.removeEventListener('executia:funnel-update', refresh);
  };
}

document.addEventListener('DOMContentLoaded', initExecutionEconomy);
