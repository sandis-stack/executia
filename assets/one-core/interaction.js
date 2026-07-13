/**
 * One Core — interaction state (no DOM).
 */

export const DEFAULT_SELECTION = 'mission';

/**
 * @param {string} nodeId
 * @param {object[]} nodes
 */
export function resolveNode(nodeId, nodes) {
  return nodes.find((n) => n.id === nodeId) ?? nodes[0] ?? null;
}

/**
 * @param {string} nodeId
 * @param {string[]} flowIds
 */
export function nextNodeId(nodeId, flowIds) {
  if (nodeId === 'mission') return flowIds[0] ?? null;
  const index = flowIds.indexOf(nodeId);
  if (index < 0) return flowIds[0] ?? null;
  if (index >= flowIds.length - 1) return 'mission';
  return flowIds[index + 1];
}

/**
 * @param {string} nodeId
 * @param {string[]} flowIds
 */
export function prevNodeId(nodeId, flowIds) {
  if (nodeId === 'mission') return flowIds[flowIds.length - 1] ?? null;
  const index = flowIds.indexOf(nodeId);
  if (index <= 0) return 'mission';
  return flowIds[index - 1];
}

/**
 * @param {KeyboardEvent} event
 * @param {string} selectedId
 * @param {string[]} flowIds
 */
export function keyboardNavigate(event, selectedId, flowIds) {
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    return nextNodeId(selectedId, flowIds);
  }
  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    return prevNodeId(selectedId, flowIds);
  }
  return selectedId;
}
