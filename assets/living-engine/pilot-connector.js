/** Pilot connector — derives pilot actions from engine scenario + funnel. */

export function connectPilot(scenario, assessment, calculator) {
  const readiness = assessment?.connected
    ? assessment.pilotReadiness
    : 'Exploratory';
  const recommendation = assessment?.connected
    ? assessment.pilotRecommendation
    : 'Complete Organization Assessment before requesting a governed pilot.';

  const actions = [
    { step: 1, action: 'Review generated execution plan and evidence requirements', kind: 'Calculated' },
    { step: 2, action: 'Validate mission scope with executive sponsor', kind: 'Estimated' },
    { step: 3, action: 'Request governed pilot with funnel context attached', kind: 'Calculated' },
  ];

  if (calculator?.connected && calculator.recoverableValue > 0) {
    actions.unshift({
      step: 0,
      action: `Quantify recoverable value baseline (${calculator.formatCurrency(calculator.recoverableValue)})`,
      kind: 'Estimated',
    });
  }

  return {
    readiness,
    recommendation,
    actions,
    kind: assessment?.connected ? 'Calculated' : 'Demo',
  };
}
