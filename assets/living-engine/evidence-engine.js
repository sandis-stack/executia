/** Evidence Engine — evidence requirements for mission. */

/**
 * @param {object} plan
 * @param {object} validation
 */
export function buildEvidence(plan, validation) {
  const items = plan.requiredDocuments.map((doc) => ({
    ...doc,
    required: true,
    status: 'Pending',
  }));

  validation.checks.forEach((check, i) => {
    items.push({
      id: `ev-${i}`,
      name: `Proof: ${check.rule}`,
      kind: 'Calculated',
      required: check.status !== 'Pass',
      status: check.status === 'Pass' ? 'Ready' : 'Required',
    });
  });

  return {
    items,
    summary: `${items.filter((e) => e.status === 'Ready').length}/${items.length} evidence paths ready`,
    kind: 'Calculated',
  };
}
