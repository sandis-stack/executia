// /lib/riskEngine.js
// EXECUTIA Risk Engine — server-side authority
// All validation logic runs here, never in frontend

export function evaluateExecution({ budget, timeline, complexity }) {

  // Input validation
  if (!budget || !timeline || !complexity) {
    return { error: 'INVALID_INPUT' };
  }
  if (budget <= 0 || timeline <= 0 || complexity < 1 || complexity > 5) {
    return { error: 'INVALID_PARAMETERS' };
  }

  // Scale impact — logarithmic (real-world risk is non-linear)
  const scaleImpact = Math.log10(budget + 1);

  // Time pressure — complexity vs available time
  const timePressure = complexity / timeline;

  // Risk score — capped at 100 for credibility
  let riskScore = scaleImpact * timePressure * 20;
  riskScore = Math.min(riskScore, 100);

  // Loss exposure — max 50% of budget
  const lossExposure = Math.round(budget * (riskScore / 100) * 0.5);

  // 3-level authorization
  let status;
  if      (riskScore > 70) status = 'BLOCKED';
  else if (riskScore > 50) status = 'REQUIRES_REVIEW';
  else                     status = 'APPROVED';

  // Structured audit trace with values
  const trace = [];

  trace.push({ step: 'INPUT_VALIDATED',         value: null });
  trace.push({ step: 'BUDGET_ANALYSIS',          value: budget });

  if      (budget >= 10000000) trace.push({ step: 'BUDGET_SCALE_CRITICAL',     value: budget });
  else if (budget >= 1000000)  trace.push({ step: 'BUDGET_SCALE_HIGH',         value: budget });
  else                         trace.push({ step: 'BUDGET_SCALE_STANDARD',     value: budget });

  trace.push({ step: 'TIME_PRESSURE_ANALYSIS',   value: Number(timePressure.toFixed(3)) });

  if      (timePressure > 0.5) trace.push({ step: 'TIME_CONSTRAINT_CRITICAL',  value: timePressure });
  else if (timePressure > 0.3) trace.push({ step: 'TIME_CONSTRAINT_ELEVATED',  value: timePressure });
  else                         trace.push({ step: 'TIME_CONSTRAINT_ACCEPTABLE',value: timePressure });

  if      (complexity >= 5)    trace.push({ step: 'COMPLEXITY_MAXIMUM',        value: complexity });
  else if (complexity >= 4)    trace.push({ step: 'COMPLEXITY_OVERLOAD',       value: complexity });
  else if (complexity >= 3)    trace.push({ step: 'COMPLEXITY_ELEVATED',       value: complexity });

  trace.push({ step: 'RISK_SCORE_CALCULATED',    value: Number(riskScore.toFixed(1)) });

  if      (riskScore > 70) trace.push({ step: 'RISK_THRESHOLD_EXCEEDED',       value: riskScore });
  else if (riskScore > 50) trace.push({ step: 'RISK_THRESHOLD_REVIEW_ZONE',    value: riskScore });
  else                     trace.push({ step: 'RISK_THRESHOLD_WITHIN_BOUNDS',  value: riskScore });

  trace.push({ step: 'DECISION_' + status, value: null });

  // Confidence — how far from the decision boundary
  const confidence = Math.max(0, Math.min(100, 100 - Math.abs(riskScore - 50) * 0.4));

  return {
    status,
    riskScore:    Number(riskScore.toFixed(1)),
    lossExposure,
    confidence:   Number(confidence.toFixed(1)),
    trace
  };
}
