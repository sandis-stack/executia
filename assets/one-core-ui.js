/**
 * One Core — UI controller (no business logic).
 */

import { buildOneCoreGraph } from './one-core/funnel-connector.js';
import {
  DEFAULT_SELECTION,
  resolveNode,
  keyboardNavigate,
} from './one-core/interaction.js';
import { buildOneUrl } from './public-funnel.js';

const DISPLAY_FLOW_IDS = [
  'objectives',
  'projects',
  'people',
  'ai',
  'finance',
  'execution',
  'validation',
  'evidence',
  'knowledge',
  'prediction',
  'continuous-improvement',
];

const FLOW_LABELS = {
  mission: 'Mission',
  objectives: 'Objectives',
  projects: 'Projects',
  people: 'People',
  ai: 'AI',
  finance: 'Finance',
  execution: 'Execution',
  validation: 'Validation',
  evidence: 'Evidence',
  knowledge: 'Knowledge',
  prediction: 'Prediction',
  'continuous-improvement': 'Continuous Improvement',
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

function kindBadge(kind) {
  const label = normalizeKind(kind);
  const cls =
    label === 'Estimated'
      ? 'oc-kind--estimated'
      : label === 'Calculated'
        ? 'oc-kind--calculated'
        : 'oc-kind--demo';
  return `<span class="oc-kind ${cls}">${label}</span>`;
}

function renderContextBar(host, context) {
  const parts = [];
  if (context.missionBound) {
    parts.push(
      `<span class="oc-ctx-item"><strong>Mission</strong> ${escapeHtml(context.mission.slice(0, 48))}${context.mission.length > 48 ? '…' : ''}</span>`,
    );
  } else {
    parts.push(
      '<span class="oc-ctx-item"><strong>Mission</strong> Governing objective slot — binds from Living Engine</span>',
    );
  }
  if (context.executionScore != null) {
    parts.push(`<span class="oc-ctx-item"><strong>Score</strong> ${context.executionScore}/100</span>`);
  }
  if (context.executionValue != null) {
    parts.push('<span class="oc-ctx-item"><strong>Value</strong> recoverable baseline bound</span>');
  }
  if (context.assessmentSummary) {
    parts.push(
      `<span class="oc-ctx-item"><strong>Assessment</strong> ${escapeHtml(context.assessmentSummary)}</span>`,
    );
  }
  if (context.priorityAreas?.length) {
    parts.push(
      `<span class="oc-ctx-item"><strong>Priority</strong> ${escapeHtml(context.priorityAreas[0])}</span>`,
    );
  }
  host.innerHTML = parts.join('');
  host.hidden = false;
}

function renderFlowRail(host, selectedId) {
  if (!host) return;
  const chain = ['mission', ...DISPLAY_FLOW_IDS];
  host.innerHTML = chain
    .map((id, index) => {
      const active = id === selectedId ? ' oc-flow-rail-step--active' : '';
      const step =
        `<span class="oc-flow-rail-step${active}" data-flow-id="${id}">${FLOW_LABELS[id] ?? id}</span>`;
      return index < chain.length - 1
        ? `${step}<span class="oc-flow-rail-arrow" aria-hidden="true">↓</span>`
        : step;
    })
    .join('');
}

function listOrPurpose(items, fallback) {
  if (items?.length) {
    return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
  }
  return `<p class="oc-detail-fallback">${escapeHtml(fallback)}</p>`;
}

function renderDetail(panel, node) {
  if (!node) return;
  panel.hidden = false;

  const whatIsIt =
    node.id === 'mission' && node.missionText
      ? `${node.label} — ${node.missionText}`
      : `${node.label} — ${node.purpose}`;

  panel.innerHTML =
    `<div class="oc-detail-head">` +
    `<h4>${escapeHtml(node.label)}</h4>` +
    `${kindBadge(node.kind)}` +
    `</div>` +
    `<dl class="oc-detail-grid">` +
    `<dt>What is it?</dt><dd>${escapeHtml(whatIsIt)}</dd>` +
    `<dt>Why does it exist?</dt><dd>${escapeHtml(node.purpose)}</dd>` +
    `<dt>What does it receive?</dt><dd>${listOrPurpose(node.inputs, 'Upstream context from Mission outward.')}</dd>` +
    `<dt>What does it produce?</dt><dd>${listOrPurpose(node.outputs, 'Outputs for the next object in the loop.')}</dd>` +
    `<dt>Why does it create value?</dt><dd>${escapeHtml(node.businessValue)}</dd>` +
    `</dl>`;
}

function layoutDisplayFlow(width, height) {
  const missionX = width * 0.34;
  const missionY = height * 0.5;
  const columnX = width * 0.72;
  const top = height * 0.07;
  const bottom = height * 0.93;
  const step = DISPLAY_FLOW_IDS.length > 1 ? (bottom - top) / (DISPLAY_FLOW_IDS.length - 1) : 0;

  return {
    mission: { id: 'mission', x: missionX, y: missionY },
    nodes: DISPLAY_FLOW_IDS.map((id, index) => ({
      id,
      x: columnX,
      y: top + step * index,
    })),
    size: { width, height },
  };
}

function buildDisplayEdges(layout) {
  const posById = Object.fromEntries(
    [layout.mission, ...layout.nodes].map((p) => [p.id, p]),
  );
  const chain = ['mission', ...DISPLAY_FLOW_IDS];
  const edges = [];

  for (let i = 0; i < chain.length - 1; i += 1) {
    const from = posById[chain[i]];
    const to = posById[chain[i + 1]];
    if (!from || !to) continue;
    edges.push({
      from: chain[i],
      to: chain[i + 1],
      type: i === 0 ? 'hub' : 'flow',
    });
  }

  const last = posById['continuous-improvement'];
  if (last && layout.mission) {
    edges.push({
      from: 'continuous-improvement',
      to: 'mission',
      type: 'loop',
    });
  }

  return edges;
}

function positionMap(layout, graph) {
  const byId = Object.fromEntries(
    [layout.mission, ...layout.nodes].map((p) => [p.id, p]),
  );
  const visibleIds = new Set(['mission', ...DISPLAY_FLOW_IDS]);

  return graph.nodes
    .filter((node) => visibleIds.has(node.id))
    .map((node) => ({
      node,
      pos: byId[node.id] ?? layout.mission,
      isMission: node.id === 'mission',
    }));
}

function renderMap(canvas, graph, selectedId, onSelect) {
  const width = canvas.clientWidth || 640;
  const height = Math.max(440, Math.min(560, width * 0.78));
  canvas.style.height = `${height}px`;

  const layout = layoutDisplayFlow(width, height);
  const edges = buildDisplayEdges(layout);
  const positioned = positionMap(layout, graph);

  canvas.innerHTML = '';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'oc-map-svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('aria-hidden', 'true');

  const posById = Object.fromEntries(
    [layout.mission, ...layout.nodes].map((p) => [p.id, p]),
  );

  edges.forEach((edge, i) => {
    const from = posById[edge.from];
    const to = posById[edge.to];
    if (!from || !to) return;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(from.x));
    line.setAttribute('y1', String(from.y));
    line.setAttribute('x2', String(to.x));
    line.setAttribute('y2', String(to.y));
    line.setAttribute('class', `oc-edge oc-edge--${edge.type}`);
    line.style.animationDelay = `${i * 0.12}s`;
    svg.appendChild(line);
  });

  canvas.appendChild(svg);

  const nodeLayer = document.createElement('div');
  nodeLayer.className = 'oc-node-layer';

  positioned.forEach(({ node, pos, isMission }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      `oc-node${isMission ? ' oc-node--mission oc-node--alive' : ''}` +
      `${selectedId === node.id ? ' oc-node--active' : ''}`;
    btn.style.left = `${(pos.x / width) * 100}%`;
    btn.style.top = `${(pos.y / height) * 100}%`;
    btn.dataset.nodeId = node.id;
    btn.setAttribute('aria-pressed', selectedId === node.id ? 'true' : 'false');
    btn.setAttribute('aria-label', `${node.label}. ${node.purpose}`);
    btn.innerHTML =
      `<span class="oc-node-label">${escapeHtml(isMission ? 'MISSION' : node.label)}</span>` +
      (isMission && node.missionText
        ? `<span class="oc-node-mission">${escapeHtml(node.missionText.slice(0, 42))}${node.missionText.length > 42 ? '…' : ''}</span>`
        : '');
    btn.addEventListener('click', () => onSelect(node.id, true));
    btn.addEventListener('mouseenter', () => onSelect(node.id, false));
    nodeLayer.appendChild(btn);
  });

  canvas.appendChild(nodeLayer);
}

function updateEconomyCta(hasInteracted) {
  const cta = document.getElementById('oc-cta-economy');
  const hint = document.getElementById('oc-cta-economy-hint');
  if (!cta || !hint) return;

  if (hasInteracted) {
    cta.classList.remove('is-disabled');
    cta.setAttribute('aria-disabled', 'false');
    hint.textContent = 'Continue to Execution Economy.';
  } else {
    cta.classList.add('is-disabled');
    cta.setAttribute('aria-disabled', 'true');
    hint.textContent = 'Select a node.';
  }
}

export function initOneCore() {
  const root = document.getElementById('one-core-product');
  if (!root) return;

  const ctxBar = root.querySelector('.oc-context-bar');
  const flowRail = root.querySelector('#oc-flow-rail');
  const canvas = root.querySelector('.oc-map-canvas');
  const detail = root.querySelector('.oc-detail-panel');
  const oneCta = root.querySelector('#oc-cta-one');
  const economyCta = root.querySelector('#oc-cta-economy');
  if (!canvas || !detail) return;

  let selectedId = DEFAULT_SELECTION;
  let hasInteracted = false;
  let graph = buildOneCoreGraph();

  function selectNode(id, fromUser) {
    selectedId = id;
    if (fromUser) hasInteracted = true;
    renderMap(canvas, graph, selectedId, selectNode);
    renderFlowRail(flowRail, selectedId);
    renderDetail(detail, resolveNode(selectedId, graph.nodes));
    updateEconomyCta(hasInteracted);
  }

  function refresh() {
    graph = buildOneCoreGraph();
    if (ctxBar) renderContextBar(ctxBar, graph.context);
    renderMap(canvas, graph, selectedId, selectNode);
    renderFlowRail(flowRail, selectedId);
    renderDetail(detail, resolveNode(selectedId, graph.nodes));
    if (oneCta) oneCta.href = buildOneUrl();
    updateEconomyCta(hasInteracted);
  }

  if (economyCta) {
    economyCta.addEventListener('click', (event) => {
      if (economyCta.classList.contains('is-disabled')) {
        event.preventDefault();
      }
    });
  }

  canvas.setAttribute('tabindex', '0');
  canvas.setAttribute('role', 'application');
  canvas.setAttribute('aria-label', 'One Core execution map. Use arrow keys to navigate nodes.');

  canvas.addEventListener('keydown', (e) => {
    const next = keyboardNavigate(e, selectedId, DISPLAY_FLOW_IDS);
    if (next !== selectedId) {
      e.preventDefault();
      selectNode(next || 'mission', true);
    }
  });

  const resizeObserver = new ResizeObserver(() => {
    renderMap(canvas, graph, selectedId, selectNode);
  });
  resizeObserver.observe(canvas);

  document.addEventListener('executia:funnel-update', refresh);
  refresh();

  return () => {
    resizeObserver.disconnect();
    document.removeEventListener('executia:funnel-update', refresh);
  };
}

document.addEventListener('DOMContentLoaded', initOneCore);
