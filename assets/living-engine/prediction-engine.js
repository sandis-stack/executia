/** Prediction Engine — forecasts risks and execution readiness (demonstration). */

/**
 * @param {object} plan
 * @param {object} calc
 * @param {object} assessment
 */
export function runPrediction(plan, calc, assessment) {
  const riskScore = plan.risks.filter((r) => r.severity === 'Critical' || r.severity === 'High').length;
  const readinessBase = 72 - riskScore * 8;
  const scoreBoost = assessment?.connected ? (assessment.executionScore - 50) * 0.15 : 0;
  const readiness = Math.round(Math.min(95, Math.max(35, readinessBase + scoreBoost)));

  const predictions = [
    {
      id: 'pr1',
      text: 'Execution visibility gaps will recur without governed checkpoints',
      likelihood: riskScore >= 2 ? 'High' : 'Medium',
      kind: 'Estimated',
    },
    {
      id: 'pr2',
      text: `Timeline ${plan.timeline.months} months achievable with validation at each phase`,
      likelihood: readiness >= 60 ? 'Medium' : 'Low',
      kind: 'Estimated',
    },
  ];

  if (calc?.connected) {
    predictions.push({
      id: 'pr3',
      text: `Recoverable value opportunity: ${calc.formatCurrency(calc.recoverableValue)} if governance applied`,
      likelihood: 'Medium',
      kind: 'Estimated',
    });
  }

  return {
    predictions,
    executionReadiness: readiness,
    executionReady: readiness >= 58,
    kind: 'Estimated',
  };
}
