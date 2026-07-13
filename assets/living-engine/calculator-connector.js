/** Calculator connector — reads Execution Value Calculator session. */

import { loadExecutionValue, formatCurrency } from '../execution-value-engine.js';

export function connectCalculator() {
  const payload = loadExecutionValue();
  if (!payload?.results) {
    return { connected: false, kind: 'Demo' };
  }
  const r = payload.results;
  const inputs = payload.inputs ?? {};
  return {
    connected: true,
    kind: 'Estimated',
    inputs,
    estimatedExecutionLoss: r.estimatedExecutionLoss?.value ?? 0,
    recoverableValue: r.recoverableValue?.value ?? 0,
    executionScore: r.executionScore?.value ?? 50,
    executionRisk: r.executionRisk?.value ?? 'Elevated',
    executionQuality: r.executionQuality?.value ?? 'Developing',
    estimatedRoi: r.estimatedRoi?.value ?? 0,
    priorityAreas: r.priorityImprovementAreas?.value ?? [],
    confidence: r.confidenceLevel?.value ?? 'Low',
    formatCurrency,
  };
}
