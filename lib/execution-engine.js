// /lib/execution-engine.js
// EXECUTIA — Core Execution Validation Engine

export function evaluateExecution({ budget, timeline, complexity }) {
  const riskScore =
    (budget / 1000000) * 10 +
    (complexity * 15) +
    (timeline < 6 ? 20 : 5);

  const clamped = Math.min(Math.round(riskScore), 100);
  let status = 'APPROVED';
  if (clamped > 70) status = 'BLOCKED';
  else if (clamped > 50) status = 'REQUIRES_REVIEW';

  const lossExposure = Math.round(budget * (clamped / 100));

  return { riskScore: clamped, status, lossExposure };
}
