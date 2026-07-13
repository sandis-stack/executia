/**
 * EXECUTIA Execution Value Calculator — calculation engine (isolated from UI).
 * All monetary outputs use demonstration assumptions unless verified in Assessment.
 */

export const DEMO_DISCLOSURE =
  'Estimated demonstration values. Not verified outcomes. Assessment required for organization-specific baseline.';

export const STORAGE_KEY = 'executia.executionValue.v1';

export const INDUSTRIES = [
  { id: 'financial-services', label: 'Financial Services', lossRate: 0.048 },
  { id: 'technology', label: 'Technology', lossRate: 0.032 },
  { id: 'manufacturing', label: 'Manufacturing', lossRate: 0.042 },
  { id: 'healthcare', label: 'Healthcare', lossRate: 0.038 },
  { id: 'public-sector', label: 'Public Sector', lossRate: 0.055 },
  { id: 'professional-services', label: 'Professional Services', lossRate: 0.036 },
  { id: 'retail', label: 'Retail & Consumer', lossRate: 0.028 },
  { id: 'energy', label: 'Energy & Infrastructure', lossRate: 0.044 },
  { id: 'other', label: 'Other', lossRate: 0.035 },
];

export const MAJOR_RISK_OPTIONS = [
  { id: 'regulatory', label: 'Regulatory compliance exposure' },
  { id: 'multi-site', label: 'Multi-site coordination gaps' },
  { id: 'project-delivery', label: 'Project delivery slippage' },
  { id: 'supplier', label: 'Supplier / vendor dependency' },
  { id: 'transformation', label: 'Digital transformation in flight' },
  { id: 'mergers', label: 'M&A or restructuring' },
];

const PRIORITY_AREAS = [
  { id: 'visibility', label: 'Execution visibility across projects' },
  { id: 'governance', label: 'Cross-border governance & authority' },
  { id: 'evidence', label: 'Evidence & audit at execution time' },
  { id: 'coordination', label: 'Decision-to-outcome coordination' },
  { id: 'portfolio', label: 'Active project portfolio control' },
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeInputs(raw = {}) {
  const industry =
    INDUSTRIES.find((item) => item.id === raw.industry)?.id ?? INDUSTRIES[0].id;
  const majorRisks = Array.isArray(raw.majorRisks)
    ? raw.majorRisks.filter((id) => MAJOR_RISK_OPTIONS.some((r) => r.id === id))
    : [];

  return {
    industry,
    annualRevenue: clamp(toNumber(raw.annualRevenue, 50_000_000), 1_000_000, 500_000_000_000),
    employees: clamp(toNumber(raw.employees, 500), 10, 500_000),
    countries: clamp(toNumber(raw.countries, 1), 1, 120),
    activeProjects: clamp(toNumber(raw.activeProjects, 12), 1, 5_000),
    averageProjectValue: clamp(toNumber(raw.averageProjectValue, 2_000_000), 10_000, 10_000_000_000),
    ebitMargin:
      raw.ebitMargin === '' || raw.ebitMargin == null
        ? null
        : clamp(toNumber(raw.ebitMargin, 0), -50, 80),
    majorRisks,
  };
}

function dimensionScores(inputs) {
  const portfolioExposure = clamp(
    (inputs.activeProjects * inputs.averageProjectValue) / inputs.annualRevenue,
    0,
    0.5,
  );
  const scalePressure = clamp(inputs.employees / 12_000, 0, 1);
  const geoPressure = clamp((inputs.countries - 1) / 12, 0, 1);
  const riskPressure = clamp(inputs.majorRisks.length / MAJOR_RISK_OPTIONS.length, 0, 1);

  return {
    visibility: clamp(100 - portfolioExposure * 120 - scalePressure * 18, 15, 95),
    governance: clamp(100 - geoPressure * 35 - riskPressure * 28, 15, 95),
    evidence: clamp(100 - portfolioExposure * 90 - riskPressure * 22, 15, 95),
    coordination: clamp(100 - geoPressure * 28 - scalePressure * 22, 15, 95),
    portfolio: clamp(100 - portfolioExposure * 140 - inputs.activeProjects / 80, 15, 95),
  };
}

function executionScoreFromDimensions(dimensions) {
  const values = Object.values(dimensions);
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.round(clamp(avg, 18, 92));
}

function riskBand(score) {
  if (score >= 70) return { level: 'Moderate', index: 35 };
  if (score >= 55) return { level: 'Elevated', index: 55 };
  if (score >= 40) return { level: 'High', index: 72 };
  return { level: 'Critical', index: 88 };
}

function qualityBand(score) {
  if (score >= 75) return 'Strong';
  if (score >= 60) return 'Moderate';
  if (score >= 45) return 'Developing';
  return 'Weak';
}

function confidenceLevel(inputs) {
  const hasEbit = inputs.ebitMargin != null;
  const hasRisks = inputs.majorRisks.length > 0;
  if (hasEbit && hasRisks) return 'High';
  if (hasEbit || hasRisks) return 'Medium';
  return 'Low';
}

function demoPlatformCost(inputs) {
  return 42_000 + inputs.employees * 88 + inputs.countries * 9_500;
}

/**
 * @param {object} rawInputs
 * @returns {object}
 */
export function calculateExecutionValue(rawInputs) {
  const inputs = normalizeInputs(rawInputs);
  const industry = INDUSTRIES.find((item) => item.id === inputs.industry) ?? INDUSTRIES[0];

  const employeeFactor = 1 + clamp(inputs.employees / 10_000, 0, 0.28);
  const countryFactor = 1 + (inputs.countries - 1) * 0.065;
  const portfolioRatio = clamp(
    (inputs.activeProjects * inputs.averageProjectValue) / inputs.annualRevenue,
    0,
    0.45,
  );
  const projectFactor = 1 + portfolioRatio * 0.55;
  const riskFactor = 1 + inputs.majorRisks.length * 0.045;
  const ebitFactor =
    inputs.ebitMargin == null
      ? 1
      : inputs.ebitMargin < 8
        ? 1.14
        : inputs.ebitMargin < 15
          ? 1.06
          : 0.97;

  const effectiveLossRate = clamp(
    industry.lossRate * employeeFactor * countryFactor * projectFactor * riskFactor * ebitFactor,
    0.014,
    0.115,
  );

  const dimensions = dimensionScores(inputs);
  const executionScore = executionScoreFromDimensions(dimensions);
  const risk = riskBand(executionScore);
  const executionQuality = qualityBand(executionScore);

  const estimatedExecutionLoss = Math.round(inputs.annualRevenue * effectiveLossRate);
  const recoverabilityRate = clamp(0.34 + (100 - executionScore) / 420, 0.28, 0.58);
  const recoverableValue = Math.round(estimatedExecutionLoss * recoverabilityRate);
  const enterpriseValueCreated = recoverableValue;

  const platformCost = demoPlatformCost(inputs);
  const estimatedRoi = Math.round(((recoverableValue - platformCost) / platformCost) * 100);
  const estimatedPaybackMonths = Math.round(
    clamp(platformCost / Math.max(recoverableValue / 12, 1), 6, 36),
  );

  const priorityImprovementAreas = Object.entries(dimensions)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([id]) => PRIORITY_AREAS.find((area) => area.id === id)?.label ?? id);

  return {
    inputs,
    estimatedExecutionLoss: {
      value: estimatedExecutionLoss,
      label: 'Estimated Execution Loss',
      kind: 'Estimated',
    },
    recoverableValue: {
      value: recoverableValue,
      label: 'Recoverable Value',
      kind: 'Estimated',
    },
    enterpriseValueCreated: {
      value: enterpriseValueCreated,
      label: 'Enterprise Value Created',
      kind: 'Estimated',
    },
    executionScore: {
      value: executionScore,
      label: 'Execution Score',
      kind: 'Calculated',
      unit: '/100',
    },
    executionRisk: {
      value: risk.level,
      index: risk.index,
      label: 'Execution Risk',
      kind: 'Calculated',
    },
    executionQuality: {
      value: executionQuality,
      label: 'Execution Quality',
      kind: 'Calculated',
    },
    estimatedRoi: {
      value: estimatedRoi,
      label: 'Estimated ROI',
      kind: 'Estimated',
      unit: '%',
    },
    estimatedPayback: {
      value: estimatedPaybackMonths,
      label: 'Estimated Payback',
      kind: 'Estimated',
      unit: 'months',
    },
    priorityImprovementAreas: {
      value: priorityImprovementAreas,
      label: 'Priority Improvement Areas',
      kind: 'Calculated',
    },
    confidenceLevel: {
      value: confidenceLevel(inputs),
      label: 'Confidence Level',
      kind: 'Calculated',
    },
    visualization: {
      executionLoss: estimatedExecutionLoss,
      recoverableValue: recoverableValue,
      enterpriseValueCreated: enterpriseValueCreated,
      revenue: inputs.annualRevenue,
    },
    assumptions: {
      industryLossRate: industry.lossRate,
      effectiveLossRate,
      recoverabilityRate,
      platformCostYear1: platformCost,
      dimensions,
      disclosure: DEMO_DISCLOSURE,
    },
    meta: {
      calculatedAt: new Date().toISOString(),
      engineVersion: '1.0.0',
      mode: 'demonstration',
    },
  };
}

export function persistExecutionValue(payload) {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function loadExecutionValue() {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function formatCurrency(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
