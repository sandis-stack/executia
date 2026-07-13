/** Execution Graph — nodes and relationships from plan. */

/**
 * @param {object} plan
 * @param {{ mission: object }} parsed
 */
export function buildExecutionGraph(plan, parsed) {
  const nodes = [];
  const edges = [];

  nodes.push({
    id: 'mission',
    type: 'Mission',
    label: parsed.mission.headline,
    kind: 'Calculated',
  });

  plan.objectives.forEach((obj) => {
    nodes.push({ id: obj.id, type: 'Objective', label: obj.text.slice(0, 48), kind: obj.kind });
    edges.push({ from: 'mission', to: obj.id, kind: 'Calculated' });
  });

  plan.projects.forEach((project) => {
    nodes.push({ id: project.id, type: 'Project', label: project.name, kind: project.kind });
    edges.push({ from: plan.objectives[0]?.id ?? 'mission', to: project.id, kind: 'Estimated' });
  });

  plan.tasks.slice(0, 8).forEach((task) => {
    nodes.push({ id: task.id, type: 'Task', label: task.label.slice(0, 40), kind: task.kind });
    edges.push({ from: task.projectId, to: task.id, kind: 'Estimated' });
  });

  plan.dependencies.forEach((dep, i) => {
    edges.push({ id: `dep-${i}`, from: dep.from, to: dep.to, label: dep.label, kind: dep.kind });
  });

  return { nodes, edges, kind: 'Calculated' };
}
