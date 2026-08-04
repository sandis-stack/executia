/**
 * One Core — UI controller (no business logic).
 */

import { layoutPositions, buildEdges } from './one-core/graph-model.js';
import { buildOneCoreGraph } from './one-core/funnel-connector.js';
import {
  DEFAULT_SELECTION,
  resolveNode,
  keyboardNavigate,
} from './one-core/interaction.js';
import { buildOneUrl } from './public-funnel.js';

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderContextBar(host, context) {
  const parts = [];
  if (context.missionBound) {
    parts.push(`<span class="oc-ctx-item"><strong>Mission</strong> ${escapeHtml(context.mission.slice(0, 48))}${context.mission.length > 48 ? '…' : ''}</span>`);
  } else {
    parts.push('<span class="oc-ctx-item oc-ctx-item--demo"><strong>Mission</strong> Bind via Living Engine</span>');
  }
  if (context.executionScore != null) {
    parts.push(`<span class="oc-ctx-item"><strong>Score</strong> ${context.executionScore}/100</span>`);
  }
  if (context.executionValue != null) {
    parts.push('<span class="oc-ctx-item"><strong>Value</strong> recoverable baseline bound</span>');
  }
  if (context.assessmentSummary) {
    parts.push(`<span class="oc-ctx-item"><strong>Assessment</strong> ${escapeHtml(context.assessmentSummary)}</span>`);
  }
  if (context.priorityAreas?.length) {
    parts.push(`<span class="oc-ctx-item"><strong>Priority</strong> ${escapeHtml(context.priorityAreas[0])}</span>`);
  }
  host.innerHTML = parts.join('');
  host.hidden = parts.length === 0;
}

function renderDetail(panel, node) {
  if (!node) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  panel.innerHTML =
    `<div class="oc-detail-head">` +
    `<h4>${escapeHtml(node.label)}</h4>` +
    `<span class="oc-kind">${escapeHtml(node.kind)}</span>` +
    `</div>` +
    `<dl class="oc-detail-grid">` +
    `<dt>Purpose</dt><dd>${escapeHtml(node.purpose)}</dd>` +
    `<dt>Inputs</dt><dd><ul>${node.inputs.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul></dd>` +
    `<dt>Outputs</dt><dd><ul>${node.outputs.map((o) => `<li>${escapeHtml(o)}</li>`).join('')}</ul></dd>` +
    `<dt>Business value</dt><dd>${escapeHtml(node.businessValue)}</dd>` +
    `<dt>Dependencies</dt><dd>${node.dependencies.length ? node.dependencies.map(escapeHtml).join(', ') : 'Mission hub'}</dd>` +
    `</dl>`;
}

function positionMap(layout, graph) {
  const byId = Object.fromEntries(
    [layout.mission, ...layout.nodes].map((p) => [p.id, p]),
  );

  return graph.nodes.map((node) => ({
    node,
    pos: byId[node.id] ?? layout.mission,
    isMission: node.id === 'mission',
  }));
}

function renderMap(canvas, graph, selectedId, onSelect) {
  const width = canvas.clientWidth || 640;
  const height = Math.max(420, Math.min(520, width * 0.72));
  canvas.style.height = `${height}px`;

  const layout = layoutPositions(graph.flowIds.length, width, height);
  const edges = buildEdges(layout);
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
    line.style.animationDelay = `${i * 0.15}s`;
    svg.appendChild(line);
  });

  canvas.appendChild(svg);

  const nodeLayer = document.createElement('div');
  nodeLayer.className = 'oc-node-layer';

  positioned.forEach(({ node, pos, isMission }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `oc-node${isMission ? ' oc-node--mission' : ''}${selectedId === node.id ? ' oc-node--active' : ''}`;
    btn.style.left = `${(pos.x / width) * 100}%`;
    btn.style.top = `${(pos.y / height) * 100}%`;
    btn.dataset.nodeId = node.id;
    btn.setAttribute('aria-pressed', selectedId === node.id ? 'true' : 'false');
    btn.setAttribute('aria-label', `${node.label}. ${node.purpose}`);
    btn.innerHTML =
      `<span class="oc-node-label">${escapeHtml(isMission ? 'MISSION' : node.label)}</span>` +
      (isMission && node.missionText
        ? `<span class="oc-node-mission">${escapeHtml(node.missionText.slice(0, 36))}${node.missionText.length > 36 ? '…' : ''}</span>`
        : '');
    btn.addEventListener('click', () => onSelect(node.id));
    btn.addEventListener('mouseenter', () => onSelect(node.id));
    nodeLayer.appendChild(btn);
  });

  canvas.appendChild(nodeLayer);
}

export function initOneCore() {
  const root = document.getElementById('one-core-product');
  if (!root) return;

  const ctxBar = root.querySelector('.oc-context-bar');
  const canvas = root.querySelector('.oc-map-canvas');
  const detail = root.querySelector('.oc-detail-panel');
  const oneCta = root.querySelector('#oc-cta-one');
  if (!canvas || !detail) return;

  let selectedId = DEFAULT_SELECTION;
  let graph = buildOneCoreGraph();

  function selectNode(id) {
    selectedId = id;
    renderMap(canvas, graph, selectedId, selectNode);
    renderDetail(detail, resolveNode(selectedId, graph.nodes));
  }

  function refresh() {
    graph = buildOneCoreGraph();
    if (ctxBar) renderContextBar(ctxBar, graph.context);
    renderMap(canvas, graph, selectedId, selectNode);
    renderDetail(detail, resolveNode(selectedId, graph.nodes));
    if (oneCta) oneCta.href = buildOneUrl();
  }

  canvas.setAttribute('tabindex', '0');
  canvas.setAttribute('role', 'application');
  canvas.setAttribute('aria-label', 'One Core execution map. Use arrow keys to navigate nodes.');

  canvas.addEventListener('keydown', (e) => {
    const next = keyboardNavigate(e, selectedId, graph.flowIds);
    if (next !== selectedId) {
      e.preventDefault();
      selectedId = next;
      refresh();
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
