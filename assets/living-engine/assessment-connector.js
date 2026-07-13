/** Assessment connector — reads Organization Assessment session. */

import { loadOrganizationAssessment } from '../organization-assessment-engine.js';

export function connectAssessment() {
  const payload = loadOrganizationAssessment();
  if (!payload?.results?.ok) {
    return { connected: false, kind: 'Demo' };
  }
  const r = payload.results;
  return {
    connected: true,
    kind: 'Calculated',
    organization: payload.inputs?.organization ?? '',
    executionDomain: payload.inputs?.executionDomain ?? '',
    executionScore: r.executionScore?.value ?? 50,
    executionRisk: r.executionRisk?.value ?? 'Elevated',
    executionQuality: r.executionQuality?.value ?? 'Developing',
    gapAnalysis: r.gapAnalysis?.value ?? [],
    improvementPlan: r.improvementPlan?.value ?? [],
    pilotRecommendation: r.pilotRecommendation?.value ?? '',
    pilotReadiness: r.pilotRecommendation?.readiness ?? 'Qualified',
    valueReport: r.valueReport?.value ?? null,
    confidence: r.confidenceLevel?.value ?? 'Low',
  };
}
