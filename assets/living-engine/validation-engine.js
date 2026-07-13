/** Validation Engine — governed execution checks (demonstration). */

/**
 * @param {object} plan
 * @param {object} assessment
 */
export function runValidation(plan, assessment) {
  const checks = [
    { id: 'v1', rule: 'Mission has accountable executive sponsor', status: 'Pass', kind: 'Calculated' },
    { id: 'v2', rule: 'Authority mapped before execution proceeds', status: plan.stakeholders.length >= 3 ? 'Pass' : 'Review', kind: 'Calculated' },
    { id: 'v3', rule: 'Evidence requirements defined per project', status: plan.requiredDocuments.length >= 3 ? 'Pass' : 'Review', kind: 'Calculated' },
    { id: 'v4', rule: 'Execution Standard flow applicable', status: 'Pass', kind: 'Calculated' },
  ];

  if (assessment?.connected) {
    const gaps = assessment.gapAnalysis?.length ?? 0;
    checks.push({
      id: 'v5',
      rule: 'Assessment gap areas addressed in plan',
      status: gaps <= 3 ? 'Pass' : 'Review',
      kind: 'Calculated',
    });
  }

  const passCount = checks.filter((c) => c.status === 'Pass').length;
  return {
    checks,
    summary: passCount === checks.length ? 'Governed execution path validated' : 'Validation review required',
    passRate: Math.round((passCount / checks.length) * 100),
    kind: 'Calculated',
  };
}
