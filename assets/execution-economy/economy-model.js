/**
 * Execution Economy — flow model (no UI, no funnel I/O).
 */

export const ECONOMY_STAGE_IDS = [
  'execution',
  'evidence',
  'knowledge',
  'trust',
  'execution-score',
  'execution-value',
  'capital',
  'growth',
  'new-opportunities',
  'continuous-learning',
  'better-execution',
];

export const ECONOMY_CYCLE_MESSAGE =
  'Execution creates Value. Value creates Knowledge. Knowledge creates Trust. ' +
  'Trust creates Capital. Capital creates Growth. Growth creates New Execution. ' +
  'The cycle never stops.';

/** @type {Record<string, object>} */
export const BASE_STAGE_DEFINITIONS = {
  execution: {
    id: 'execution',
    label: 'Execution',
    purpose: 'Governed action produces outcomes that can be verified and valued.',
    inputs: ['Mission authority', 'Validated plan'],
    outputs: ['Execution record', 'Outcome intent'],
    businessValue: 'Execution is the source — not the side effect of other systems.',
    enterpriseImpact: 'Prevents invisible failure before it becomes organizational loss.',
    dependencies: [],
    kind: 'Calculated',
  },
  evidence: {
    id: 'evidence',
    label: 'Evidence',
    purpose: 'Proof captured at execution time — auditable and traceable.',
    inputs: ['Execution record', 'Document requirements'],
    outputs: ['Evidence chain', 'Audit trail'],
    businessValue: 'Trustworthy proof replaces post-hoc reporting.',
    enterpriseImpact: 'Board and regulator confidence through verifiable execution.',
    dependencies: ['execution'],
    kind: 'Calculated',
  },
  knowledge: {
    id: 'knowledge',
    label: 'Knowledge',
    purpose: 'Execution history becomes organizational memory.',
    inputs: ['Evidence chain', 'Outcome records'],
    outputs: ['Knowledge graph', 'Execution patterns'],
    businessValue: 'Learning compounds — not lost when projects close.',
    enterpriseImpact: 'Institutional memory reduces repeated failure.',
    dependencies: ['evidence'],
    kind: 'Demonstration',
  },
  trust: {
    id: 'trust',
    label: 'Trust',
    purpose: 'Verified execution builds confidence across stakeholders.',
    inputs: ['Knowledge graph', 'Assessment baseline'],
    outputs: ['Trust index', 'Stakeholder confidence'],
    businessValue: 'Trust accelerates decisions — fewer approval cycles.',
    enterpriseImpact: 'Partners and boards rely on demonstrated execution proof.',
    dependencies: ['knowledge'],
    kind: 'Calculated',
  },
  'execution-score': {
    id: 'execution-score',
    label: 'Execution Score',
    purpose: 'Quantified execution maturity and risk exposure.',
    inputs: ['Trust index', 'Assessment responses'],
    outputs: ['Score /100', 'Risk profile'],
    businessValue: 'Single metric for executive and board dialogue.',
    enterpriseImpact: 'Benchmark execution quality across the organization.',
    dependencies: ['trust'],
    kind: 'Calculated',
  },
  'execution-value': {
    id: 'execution-value',
    label: 'Execution Intelligence',
    purpose: 'Measurable loss, recoverable value, and ROI potential.',
    inputs: ['Execution Score', 'Organization scale'],
    outputs: ['Execution loss estimate', 'Recoverable value'],
    businessValue: 'Executives see execution as a balance-sheet conversation.',
    enterpriseImpact: 'Links governance investment to quantified return.',
    dependencies: ['execution-score'],
    kind: 'Estimated',
  },
  capital: {
    id: 'capital',
    label: 'Capital',
    purpose: 'Accumulated execution credibility becomes organizational capital.',
    inputs: ['Execution Intelligence', 'Verified outcomes'],
    outputs: ['Execution Capital', 'Investment capacity'],
    businessValue: 'Capital constrains and enables future decisions.',
    enterpriseImpact: 'Stronger negotiating position for growth initiatives.',
    dependencies: ['execution-value'],
    kind: 'Estimated',
  },
  growth: {
    id: 'growth',
    label: 'Growth',
    purpose: 'Execution capital funds expansion and new missions.',
    inputs: ['Execution Capital', 'Priority areas'],
    outputs: ['Growth envelope', 'Expansion capacity'],
    businessValue: 'Growth follows proven execution — not optimism alone.',
    enterpriseImpact: 'Board-approved scaling with evidence-backed confidence.',
    dependencies: ['capital'],
    kind: 'Estimated',
  },
  'new-opportunities': {
    id: 'new-opportunities',
    label: 'New Opportunities',
    purpose: 'Emerging missions and pilots from improved execution position.',
    inputs: ['Growth envelope', 'Pilot readiness'],
    outputs: ['Opportunity register', 'Mission candidates'],
    businessValue: 'Organization sees what becomes possible next.',
    enterpriseImpact: 'Portfolio of governed initiatives — not ad-hoc projects.',
    dependencies: ['growth'],
    kind: 'Calculated',
  },
  'continuous-learning': {
    id: 'continuous-learning',
    label: 'Continuous Learning',
    purpose: 'Every cycle improves models, controls, and prediction.',
    inputs: ['Opportunity outcomes', 'Prediction feedback'],
    outputs: ['Updated models', 'Improvement insights'],
    businessValue: 'Execution quality compounds over time.',
    enterpriseImpact: 'Organization learns faster than competitors.',
    dependencies: ['new-opportunities'],
    kind: 'Demonstration',
  },
  'better-execution': {
    id: 'better-execution',
    label: 'Better Execution',
    purpose: 'Improved execution feeds the next cycle — the loop never stops.',
    inputs: ['Continuous learning', 'Mission context'],
    outputs: ['Refined execution standard', 'Next-cycle readiness'],
    businessValue: 'The Execution Economy is self-reinforcing.',
    enterpriseImpact: 'Sustainable competitive advantage through governed execution.',
    dependencies: ['continuous-learning', 'execution'],
    kind: 'Calculated',
  },
};

export const WAITING_INDICATOR = 'Waiting for previous stage...';

/**
 * @param {number} count
 * @param {number} width
 */
export function layoutStages(count, width) {
  const step = Math.min(52, Math.max(38, (520 - 80) / Math.max(count - 1, 1)));
  const startY = 36;
  const x = width * 0.22;

  const stages = ECONOMY_STAGE_IDS.slice(0, count).map((id, index) => ({
    id,
    x,
    y: startY + index * step,
  }));

  return { stages, step, width, height: startY + count * step + 40 };
}

/**
 * @param {ReturnType<typeof layoutStages>} layout
 */
export function buildFlowEdges(layout) {
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

export function buildStages(definitions = BASE_STAGE_DEFINITIONS) {
  return ECONOMY_STAGE_IDS.map((id) => ({ ...definitions[id] }));
}

/**
 * @param {string} stageId
 * @param {string[]} stageIds
 */
export function nextStageId(stageId, stageIds = ECONOMY_STAGE_IDS) {
  const index = stageIds.indexOf(stageId);
  if (index < 0) return stageIds[0];
  if (index >= stageIds.length - 1) return stageIds[0];
  return stageIds[index + 1];
}

/**
 * @param {string} stageId
 * @param {string[]} stageIds
 */
export function prevStageId(stageId, stageIds = ECONOMY_STAGE_IDS) {
  const index = stageIds.indexOf(stageId);
  if (index <= 0) return stageIds[stageIds.length - 1];
  return stageIds[index - 1];
}

/**
 * @param {KeyboardEvent} event
 * @param {string} selectedId
 */
export function keyboardNavigate(event, selectedId) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
    return nextStageId(selectedId);
  }
  if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
    return prevStageId(selectedId);
  }
  return selectedId;
}

/**
 * Animation tick — cycles highlight through stages (0..n-1).
 * @param {number} tick
 * @param {number} stageCount
 */
export function animationActiveIndex(tick, stageCount) {
  if (stageCount <= 0) return 0;
  return tick % stageCount;
}

export function resolveStage(stageId, stages) {
  return stages.find((s) => s.id === stageId) ?? stages[0] ?? null;
}
