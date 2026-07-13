/**
 * Planning Engine — generates objectives, stakeholders, projects, tasks, timeline, budget.
 */

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function scaleFromCalculator(calc) {
  if (!calc?.connected) {
    return { employees: 500, revenue: 50_000_000, projects: 12, multiplier: 1 };
  }
  const emp = calc.inputs?.employees ?? 500;
  const rev = calc.inputs?.annualRevenue ?? 50_000_000;
  const proj = calc.inputs?.activeProjects ?? 12;
  return {
    employees: emp,
    revenue: rev,
    projects: proj,
    multiplier: clamp(emp / 800, 0.5, 2.5),
  };
}

/**
 * @param {{ mission: object }} parsed
 * @param {object} calc - calculator connector
 */
export function buildPlan(parsed, calc) {
  const { mission } = parsed;
  const scale = scaleFromCalculator(calc);
  const domain = mission.domain;

  const objectives = buildObjectives(mission, domain);
  const stakeholders = buildStakeholders(mission, scale);
  const projects = buildProjects(mission, domain, scale);
  const tasks = buildTasks(projects, mission);
  const risks = buildRisks(mission, calc);
  const timeline = buildTimeline(projects.length, scale.multiplier);
  const budget = buildBudget(scale, domain);
  const dependencies = buildDependencies(projects);
  const documents = buildDocuments(domain);

  return {
    objectives,
    stakeholders,
    projects,
    tasks,
    risks,
    timeline,
    budget,
    dependencies,
    requiredDocuments: documents,
    executionStandard: {
      flow: ['Request', 'Validation', 'Decision', 'Registry', 'Ledger', 'Audit'],
      kind: 'Calculated',
    },
    kind: 'Estimated',
  };
}

function buildObjectives(mission, domain) {
  const base = [
    { id: 'o1', text: `Deliver governed outcome: ${mission.headline}`, kind: 'Calculated' },
    { id: 'o2', text: 'Establish execution visibility before action becomes reality', kind: 'Calculated' },
  ];
  const domainObjectives = {
    manufacturing: { id: 'o3', text: 'Commission facility with validated authority and evidence chain', kind: 'Estimated' },
    expansion: { id: 'o3', text: 'Enter target market with governed cross-border execution', kind: 'Estimated' },
    healthcare: { id: 'o3', text: 'Complete renovation with compliance evidence at execution time', kind: 'Estimated' },
    certification: { id: 'o3', text: 'Achieve certification with auditable execution proof', kind: 'Estimated' },
    delivery: { id: 'o3', text: 'Reduce delivery slippage through visible decision-to-outcome chain', kind: 'Estimated' },
    general: { id: 'o3', text: 'Execute initiative under Execution Standard governance', kind: 'Estimated' },
  };
  base.push(domainObjectives[domain] ?? domainObjectives.general);
  return base;
}

function buildStakeholders(mission, scale) {
  const count = clamp(Math.round(scale.employees / 120), 3, 8);
  const roles = [
    'Executive Sponsor',
    'Mission Owner',
    'Program Director',
    'Finance Authority',
    'Compliance Lead',
    'Operations Lead',
    'Project Manager',
    'Evidence Custodian',
  ];
  return roles.slice(0, count).map((role, i) => ({
    id: `sh-${i + 1}`,
    role,
    accountability: i < 2 ? 'Accountable' : 'Responsible',
    kind: 'Estimated',
  }));
}

function buildProjects(mission, domain, scale) {
  const n = clamp(Math.round(scale.projects / 4) + 2, 3, 6);
  const names = {
    manufacturing: ['Site preparation', 'Authority & permits', 'Core construction', 'Commissioning', 'Operational handover'],
    expansion: ['Market assessment', 'Legal entity setup', 'Local operations', 'Integration', 'Performance review'],
    healthcare: ['Clinical continuity plan', 'Infrastructure works', 'Systems migration', 'Compliance validation', 'Go-live'],
    certification: ['Gap assessment', 'Control implementation', 'Evidence collection', 'Audit preparation', 'Certification'],
    delivery: ['Portfolio baseline', 'Visibility mapping', 'Governance rollout', 'Pilot execution', 'Scale'],
    general: ['Discovery', 'Planning', 'Execution', 'Validation', 'Outcome'],
  };
  const list = names[domain] ?? names.general;
  return list.slice(0, n).map((name, i) => ({
    id: `p-${i + 1}`,
    name,
    status: i === 0 ? 'Active' : 'Planned',
    kind: 'Estimated',
  }));
}

function buildTasks(projects, mission) {
  const tasks = [];
  projects.forEach((project, pi) => {
    ['Define scope', 'Assign owner', 'Validate evidence'].forEach((label, ti) => {
      tasks.push({
        id: `t-${pi + 1}-${ti + 1}`,
        projectId: project.id,
        label: `${project.name}: ${label}`,
        kind: 'Estimated',
      });
    });
  });
  tasks.push({
    id: 't-mission',
    projectId: projects[0]?.id,
    label: `Mission charter: ${mission.headline.slice(0, 60)}`,
    kind: 'Calculated',
  });
  return tasks;
}

function buildRisks(mission, calc) {
  const risks = [
    { id: 'r1', label: 'Execution invisibility between decisions and outcomes', severity: 'High', kind: 'Calculated' },
    { id: 'r2', label: 'Missing evidence at execution time', severity: 'High', kind: 'Calculated' },
    { id: 'r3', label: 'Authority gaps across stakeholders', severity: 'Medium', kind: 'Estimated' },
  ];
  if (calc?.connected && calc.executionRisk) {
    risks.unshift({
      id: 'r0',
      label: `Organization execution risk: ${calc.executionRisk}`,
      severity: calc.executionRisk === 'Critical' ? 'Critical' : 'High',
      kind: 'Estimated',
    });
  }
  return risks;
}

function buildTimeline(projectCount, multiplier) {
  const weeks = Math.round((projectCount * 8 + 12) * multiplier);
  const months = Math.max(3, Math.round(weeks / 4));
  return {
    weeks,
    months,
    phases: [
      { name: 'Analysis', weeks: Math.round(weeks * 0.15), kind: 'Estimated' },
      { name: 'Planning', weeks: Math.round(weeks * 0.2), kind: 'Estimated' },
      { name: 'Execution', weeks: Math.round(weeks * 0.45), kind: 'Estimated' },
      { name: 'Validation & close', weeks: Math.round(weeks * 0.2), kind: 'Estimated' },
    ],
    kind: 'Estimated',
  };
}

function buildBudget(scale, domain) {
  const base = scale.revenue * 0.02 * scale.multiplier;
  const domainFactor = { manufacturing: 1.4, expansion: 1.2, healthcare: 1.3, certification: 0.8, delivery: 0.6, general: 1 }[domain] ?? 1;
  const total = Math.round(base * domainFactor);
  return {
    total,
    currency: 'USD',
    breakdown: [
      { label: 'Governed execution infrastructure', amount: Math.round(total * 0.25), kind: 'Estimated' },
      { label: 'Program delivery', amount: Math.round(total * 0.55), kind: 'Estimated' },
      { label: 'Evidence & compliance', amount: Math.round(total * 0.2), kind: 'Estimated' },
    ],
    kind: 'Estimated',
  };
}

function buildDependencies(projects) {
  const deps = [];
  for (let i = 1; i < projects.length; i += 1) {
    deps.push({
      from: projects[i - 1].id,
      to: projects[i].id,
      label: `${projects[i - 1].name} → ${projects[i].name}`,
      kind: 'Calculated',
    });
  }
  return deps;
}

function buildDocuments(domain) {
  const common = [
    { id: 'd1', name: 'Mission charter with authority mapping', kind: 'Calculated' },
    { id: 'd2', name: 'Evidence requirements register', kind: 'Calculated' },
    { id: 'd3', name: 'Risk and validation checklist', kind: 'Estimated' },
  ];
  const extra = {
    certification: [{ id: 'd4', name: 'Standard compliance matrix', kind: 'Estimated' }],
    healthcare: [{ id: 'd4', name: 'Clinical safety evidence pack', kind: 'Estimated' }],
    expansion: [{ id: 'd4', name: 'Cross-border governance agreement', kind: 'Estimated' }],
  };
  return [...common, ...(extra[domain] ?? [{ id: 'd4', name: 'Executive approval record', kind: 'Estimated' }])];
}
