/**
 * One Core — execution graph model (no UI, no funnel I/O).
 */

export const FLOW_NODE_IDS = [
  'objectives',
  'projects',
  'people',
  'ai',
  'documents',
  'finance',
  'execution',
  'validation',
  'evidence',
  'knowledge',
  'prediction',
  'learning',
  'continuous-improvement',
];

/** @type {Record<string, object>} */
export const BASE_NODE_DEFINITIONS = {
  mission: {
    id: 'mission',
    label: 'Mission',
    purpose: 'Single governing objective — every execution object derives from one mission.',
    inputs: ['Executive intent', 'Organizational context'],
    outputs: ['Mission charter', 'Authority scope'],
    businessValue: 'One source of truth — no disconnected initiatives.',
    dependencies: [],
    kind: 'Calculated',
  },
  objectives: {
    id: 'objectives',
    label: 'Objectives',
    purpose: 'Translate mission into measurable governed outcomes.',
    inputs: ['Mission charter', 'Execution Score baseline'],
    outputs: ['Objective register', 'Success criteria'],
    businessValue: 'Aligns every action to mission — not departmental silos.',
    dependencies: ['mission'],
    kind: 'Estimated',
  },
  projects: {
    id: 'projects',
    label: 'Projects',
    purpose: 'Structured delivery paths under mission authority.',
    inputs: ['Objectives', 'Portfolio constraints'],
    outputs: ['Project registry', 'Delivery milestones'],
    businessValue: 'Projects participate in execution — not standalone PM tools.',
    dependencies: ['objectives'],
    kind: 'Estimated',
  },
  people: {
    id: 'people',
    label: 'People',
    purpose: 'Stakeholders, owners, and accountable roles mapped to execution.',
    inputs: ['Mission authority', 'Project scope'],
    outputs: ['Accountability map', 'Role assignments'],
    businessValue: 'People systems become execution participants — not HR silos.',
    dependencies: ['projects'],
    kind: 'Estimated',
  },
  ai: {
    id: 'ai',
    label: 'AI',
    purpose: 'Governed intelligence observing and assisting execution — not a chatbot.',
    inputs: ['Execution graph', 'Evidence history'],
    outputs: ['Recommendations', 'Risk signals'],
    businessValue: 'Continuous observation — not reactive Q&A.',
    dependencies: ['people'],
    kind: 'Demonstration',
  },
  documents: {
    id: 'documents',
    label: 'Documents',
    purpose: 'Required evidence and authority documents at execution time.',
    inputs: ['Mission requirements', 'Compliance scope'],
    outputs: ['Document register', 'Proof requirements'],
    businessValue: 'Documents prove execution — not passive file storage.',
    dependencies: ['ai'],
    kind: 'Calculated',
  },
  finance: {
    id: 'finance',
    label: 'Finance',
    purpose: 'Budget, value, and economic constraints on execution decisions.',
    inputs: ['Execution Intelligence', 'Project portfolio'],
    outputs: ['Budget envelope', 'Value baseline'],
    businessValue: 'Finance participates — not a separate accounting ledger.',
    dependencies: ['documents'],
    kind: 'Estimated',
  },
  execution: {
    id: 'execution',
    label: 'Execution',
    purpose: 'Governed action before intended outcomes become reality.',
    inputs: ['Authority', 'Validated plan'],
    outputs: ['Execution states', 'Decision record'],
    businessValue: 'Execution Standard enforced — not workflow routing alone.',
    dependencies: ['finance'],
    kind: 'Calculated',
  },
  validation: {
    id: 'validation',
    label: 'Validation',
    purpose: 'Verify authority, evidence, and readiness before proceeding.',
    inputs: ['Execution request', 'Control checklist'],
    outputs: ['Validation result', 'Gap flags'],
    businessValue: 'Prevent failures before they occur.',
    dependencies: ['execution'],
    kind: 'Calculated',
  },
  evidence: {
    id: 'evidence',
    label: 'Evidence',
    purpose: 'Proof captured at execution time — auditable and traceable.',
    inputs: ['Validation requirements', 'Document register'],
    outputs: ['Evidence chain', 'Audit trail'],
    businessValue: 'Trust through proof — not post-hoc reporting.',
    dependencies: ['validation'],
    kind: 'Calculated',
  },
  knowledge: {
    id: 'knowledge',
    label: 'Knowledge',
    purpose: 'Organizational execution memory compounding over time.',
    inputs: ['Evidence history', 'Outcome records'],
    outputs: ['Knowledge graph', 'Execution patterns'],
    businessValue: 'Learning accumulates — not lost in project close-out.',
    dependencies: ['evidence'],
    kind: 'Demonstration',
  },
  prediction: {
    id: 'prediction',
    label: 'Prediction',
    purpose: 'Forecast risks and readiness from execution intelligence.',
    inputs: ['Knowledge graph', 'Execution Score'],
    outputs: ['Risk forecast', 'Readiness index'],
    businessValue: 'See problems before dashboards turn red.',
    dependencies: ['knowledge'],
    kind: 'Estimated',
  },
  learning: {
    id: 'learning',
    label: 'Learning',
    purpose: 'Capture outcomes and improve execution models.',
    inputs: ['Prediction feedback', 'Evidence outcomes'],
    outputs: ['Improvement insights', 'Updated models'],
    businessValue: 'Organization gets smarter with every execution cycle.',
    dependencies: ['prediction'],
    kind: 'Demonstration',
  },
  'continuous-improvement': {
    id: 'continuous-improvement',
    label: 'Continuous Improvement',
    purpose: 'Close the loop — refine mission, objectives, and execution standard.',
    inputs: ['Learning insights', 'Priority areas'],
    outputs: ['Improvement plan', 'Updated mission context'],
    businessValue: 'Compounding execution quality — one living system.',
    dependencies: ['learning', 'mission'],
    kind: 'Calculated',
  },
};

/**
 * @param {number} count
 * @param {number} width
 * @param {number} height
 */
export function layoutPositions(count, width, height) {
  const cx = width / 2;
  const cy = height / 2;
  const radiusX = Math.max(120, width * 0.36);
  const radiusY = Math.max(100, height * 0.38);

  const nodes = FLOW_NODE_IDS.slice(0, count).map((id, index) => {
    const angle = (index / count) * 2 * Math.PI - Math.PI / 2;
    return {
      id,
      x: cx + radiusX * Math.cos(angle),
      y: cy + radiusY * Math.sin(angle),
    };
  });

  return {
    mission: { id: 'mission', x: cx, y: cy },
    nodes,
    size: { width, height },
  };
}

/**
 * @param {ReturnType<typeof layoutPositions>} layout
 */
export function buildEdges(layout) {
  const edges = [];
  const mission = layout.mission;

  if (layout.nodes.length > 0) {
    edges.push({ from: mission.id, to: layout.nodes[0].id, type: 'hub' });
  }

  for (let i = 0; i < layout.nodes.length - 1; i += 1) {
    edges.push({
      from: layout.nodes[i].id,
      to: layout.nodes[i + 1].id,
      type: 'flow',
    });
  }

  const last = layout.nodes[layout.nodes.length - 1];
  if (last) {
    edges.push({ from: last.id, to: mission.id, type: 'loop' });
  }

  return edges;
}

/**
 * @param {object} definitions
 */
export function buildGraphNodes(definitions = BASE_NODE_DEFINITIONS) {
  return [
    definitions.mission,
    ...FLOW_NODE_IDS.map((id) => definitions[id]),
  ];
}
