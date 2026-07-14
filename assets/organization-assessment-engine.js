/**
 * EXECUTIA Organization Assessment — calculation engine (isolated from UI).
 * Consumes Execution Value Calculator results as required baseline input.
 * Merges governance-assessment concepts from executia-layer (qualification focus, gap themes).
 */

import { formatCurrency } from './execution-value-engine.js';

export const ASSESSMENT_STORAGE_KEY = 'executia.organizationAssessment.v1';

export const ASSESSMENT_DISCLOSURE = 'Combines Execution Value with self-assessment. Not verified outcomes.';

/** Merged from executia-layer GOVERNANCE_ASSESSMENT qualification focus */
export const QUALIFICATION_FOCUS = [
  'Authority validation',
  'Governance readiness',
  'Execution qualification',
  'Proof eligibility',
];

/** Merged from executia-layer governance assessment checklist themes */
export const GOVERNANCE_GAP_THEMES = [
  {
    id: 'authority',
    theme: 'Authority validation against accountable ownership',
    field: 'authorityValidation',
    threshold: 3,
  },
  {
    id: 'governance',
    theme: 'Execution process mapped to governance controls',
    field: 'governanceReadiness',
    threshold: 3,
  },
  {
    id: 'evidence',
    theme: 'Gap analysis across approval and audit surfaces',
    field: 'evidenceAudit',
    threshold: 3,
  },
  {
    id: 'visibility',
    theme: 'Bounded execution scope with visible decision-to-outcome chain',
    field: 'visibilityControl',
    threshold: 3,
  },
  {
    id: 'qualification',
    theme: 'Execution qualification and proof eligibility',
    field: 'executionQualification',
    threshold: 3,
  },
];

export const EXECUTION_DOMAINS = [
  'Public procurement',
  'Financial control',
  'Compliance execution',
  'Infrastructure operation',
  'AI agent governance',
  'Other controlled execution',
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSelfAssessment(raw = {}) {
  const fields = [
    'authorityValidation',
    'governanceReadiness',
    'executionQualification',
    'evidenceAudit',
    'visibilityControl',
  ];
  const normalized = {};
  fields.forEach((field) => {
    normalized[field] = clamp(toNumber(raw[field], 3), 1, 5);
  });
  return normalized;
}

function normalizeAssessmentInputs(raw = {}) {
  return {
    organization: String(raw.organization ?? '').trim(),
    contact: String(raw.contact ?? '').trim(),
    email: String(raw.email ?? '').trim(),
    executionDomain: EXECUTION_DOMAINS.includes(raw.executionDomain)
      ? raw.executionDomain
      : EXECUTION_DOMAINS[0],
    governanceOutcome: String(raw.governanceOutcome ?? '').trim(),
    selfAssessment: normalizeSelfAssessment(raw.selfAssessment ?? raw),
  };
}

function averageSelfAssessment(scores) {
  const values = Object.values(scores);
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function buildGapAnalysis(selfAssessment, calculatorResults) {
  const gaps = [];

  GOVERNANCE_GAP_THEMES.forEach((theme) => {
    const score = selfAssessment[theme.field];
    if (score < theme.threshold) {
      gaps.push({
        area: theme.theme,
        severity: score <= 2 ? 'High' : 'Medium',
        kind: 'Calculated',
      });
    }
  });

  const priorities = calculatorResults?.priorityImprovementAreas?.value ?? [];
  priorities.forEach((area) => {
    if (!gaps.some((gap) => gap.area === area)) {
      gaps.push({ area, severity: 'Medium', kind: 'Estimated' });
    }
  });

  return gaps.slice(0, 6);
}

function buildImprovementPlan(gapAnalysis, calculatorResults) {
  const plan = [];
  gapAnalysis.slice(0, 4).forEach((gap, index) => {
    plan.push({
      step: index + 1,
      action: `Address ${gap.area.toLowerCase()} — establish governed execution checkpoint before action proceeds.`,
      priority: gap.severity,
      kind: 'Calculated',
    });
  });

  if (plan.length === 0) {
    plan.push({
      step: 1,
      action: 'Maintain governed execution baseline — extend ENGINE proof to additional mission scope.',
      priority: 'Low',
      kind: 'Calculated',
    });
  }

  const recoverable = calculatorResults?.recoverableValue?.value ?? 0;
  if (recoverable > 0) {
    plan.push({
      step: plan.length + 1,
      action: `Target ${formatCurrency(recoverable)} recoverable value (Estimated) through visibility and validation at execution time.`,
      priority: 'High',
      kind: 'Estimated',
    });
  }

  return plan;
}

function pilotRecommendation(refinedScore, gapAnalysis) {
  const highGaps = gapAnalysis.filter((g) => g.severity === 'High').length;
  if (refinedScore >= 68 && highGaps === 0) {
    return {
      value: 'Proceed to governed pilot — execution maturity supports controlled validation.',
      readiness: 'Ready',
      kind: 'Calculated',
    };
  }
  if (refinedScore >= 45) {
    return {
      value: 'Pilot recommended with scoped mission — address identified gap areas during onboarding.',
      readiness: 'Qualified',
      kind: 'Calculated',
    };
  }
  return {
    value: 'High execution loss exposure — governed pilot strongly recommended with executive sponsorship.',
    readiness: 'Urgent',
    kind: 'Estimated',
  };
}

function assessmentConfidence(calculatorPayload, inputs) {
  const calcConfidence = calculatorPayload?.results?.confidenceLevel?.value ?? 'Low';
  const hasOrg = Boolean(inputs.organization && inputs.contact);
  const hasEmail = Boolean(inputs.email);
  const selfAvg = averageSelfAssessment(inputs.selfAssessment);

  if (calcConfidence === 'High' && hasOrg && hasEmail && selfAvg >= 3) return 'High';
  if ((calcConfidence === 'Medium' || calcConfidence === 'High') && hasOrg) return 'Medium';
  return 'Low';
}

/**
 * @param {object|null} calculatorPayload - from loadExecutionValue()
 * @param {object} rawAssessmentInputs
 */
export function calculateOrganizationAssessment(calculatorPayload, rawAssessmentInputs) {
  if (!calculatorPayload?.results) {
    return {
      ok: false,
      error: 'CALCULATOR_REQUIRED',
      message: 'Complete Execution Intelligence before running Assessment.',
    };
  }

  const calculatorResults = calculatorPayload.results;
  const calculatorInputs = calculatorPayload.inputs ?? {};
  const inputs = normalizeAssessmentInputs(rawAssessmentInputs);
  const selfAvg = averageSelfAssessment(inputs.selfAssessment);
  const selfScore = Math.round((selfAvg / 5) * 100);

  const calculatorScore = calculatorResults.executionScore?.value ?? 50;
  const refinedScore = Math.round(clamp(calculatorScore * 0.42 + selfScore * 0.58, 18, 95));

  const gapAnalysis = buildGapAnalysis(inputs.selfAssessment, calculatorResults);
  const improvementPlan = buildImprovementPlan(gapAnalysis, calculatorResults);
  const pilot = pilotRecommendation(refinedScore, gapAnalysis);

  const executionRiskIndex = clamp(100 - refinedScore + gapAnalysis.length * 4, 15, 95);
  let executionRiskLevel = 'Moderate';
  if (executionRiskIndex >= 72) executionRiskLevel = 'Critical';
  else if (executionRiskIndex >= 55) executionRiskLevel = 'High';
  else if (executionRiskIndex >= 38) executionRiskLevel = 'Elevated';

  const valueReport = {
    organization: inputs.organization || 'Organization (not named)',
    executionDomain: inputs.executionDomain,
    calculatorBaseline: {
      estimatedExecutionLoss: calculatorResults.estimatedExecutionLoss,
      recoverableValue: calculatorResults.recoverableValue,
      enterpriseValueCreated: calculatorResults.enterpriseValueCreated,
      executionScore: calculatorResults.executionScore,
      executionRisk: calculatorResults.executionRisk,
      confidenceLevel: calculatorResults.confidenceLevel,
      industry: calculatorInputs.industry,
    },
    assessmentSummary: {
      refinedExecutionScore: refinedScore,
      selfAssessmentAverage: Number(selfAvg.toFixed(2)),
      gapCount: gapAnalysis.length,
    },
    kind: 'Estimated',
  };

  return {
    ok: true,
    inputs,
    executionScore: {
      value: refinedScore,
      label: 'Execution Score',
      kind: 'Calculated',
      unit: '/100',
      note: 'Blends calculator baseline with self-assessment responses.',
    },
    gapAnalysis: {
      value: gapAnalysis,
      label: 'Gap Analysis',
      kind: 'Calculated',
    },
    valueReport: {
      value: valueReport,
      label: 'Value Report',
      kind: 'Estimated',
    },
    improvementPlan: {
      value: improvementPlan,
      label: 'Improvement Plan',
      kind: 'Calculated',
    },
    pilotRecommendation: {
      value: pilot.value,
      readiness: pilot.readiness,
      label: 'Pilot Recommendation',
      kind: pilot.kind,
    },
    executionRisk: {
      value: executionRiskLevel,
      index: executionRiskIndex,
      label: 'Execution Risk',
      kind: 'Calculated',
    },
    executionQuality: {
      value: refinedScore >= 75 ? 'Strong' : refinedScore >= 58 ? 'Moderate' : refinedScore >= 42 ? 'Developing' : 'Weak',
      label: 'Execution Quality',
      kind: 'Calculated',
    },
    confidenceLevel: {
      value: assessmentConfidence(calculatorPayload, inputs),
      label: 'Confidence Level',
      kind: 'Calculated',
    },
    qualificationFocus: {
      value: QUALIFICATION_FOCUS,
      label: 'Qualification Focus',
      kind: 'Demo',
    },
    meta: {
      calculatedAt: new Date().toISOString(),
      engineVersion: '1.0.0',
      calculatorConsumed: true,
      disclosure: ASSESSMENT_DISCLOSURE,
    },
  };
}

export function persistOrganizationAssessment(payload) {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(ASSESSMENT_STORAGE_KEY, JSON.stringify(payload));
}

export function loadOrganizationAssessment() {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(ASSESSMENT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
