// /api/execute.js
// EXECUTIA — Execution Validation Endpoint
// POST /api/execute
// Receives scenario, runs risk model, writes to DB, returns executionId + decision

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function makeExecutionId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'EX-';
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function evaluateExecution(budget, timeline, complexity) {
  budget     = Number(budget);
  timeline   = Number(timeline);
  complexity = Number(complexity);

  if (!budget || !timeline || !complexity) {
    return {
      riskScore:    0,
      status:       'REQUIRES_REVIEW',
      lossExposure: 0,
      lifecycle:    'UNDER_REVIEW',
      trace: [{ step: 'INPUT_INCOMPLETE', value: null }]
    };
  }

  const scaleImpact  = Math.log10(budget + 1);
  const timePressure = complexity / timeline;
  const riskScore    = Math.min(scaleImpact * timePressure * 20, 100);
  const lossExposure = Math.round(budget * (riskScore / 100) * 0.5);

  let status    = 'APPROVED';
  let lifecycle = 'APPROVED';

  if (riskScore > 70) {
    status    = 'BLOCKED';
    lifecycle = 'BLOCKED';
  } else if (riskScore > 50) {
    status    = 'REQUIRES_REVIEW';
    lifecycle = 'UNDER_REVIEW';
  }

  const trace = [
    { step: 'INPUT_VALIDATED',           value: null },
    { step: 'BUDGET_ANALYSIS',           value: budget },
    { step: budget > 1000000 ? 'BUDGET_SCALE_HIGH' : 'BUDGET_SCALE_NORMAL', value: budget },
    { step: 'TIME_PRESSURE_ANALYSIS',    value: Number(timePressure.toFixed(3)) },
    { step: timePressure > 0.4 ? 'TIME_CONSTRAINT_CRITICAL' : timePressure > 0.25 ? 'TIME_CONSTRAINT_ELEVATED' : 'TIME_CONSTRAINT_NORMAL', value: Number(timePressure.toFixed(3)) },
    { step: complexity >= 4 ? 'COMPLEXITY_OVERLOAD' : 'COMPLEXITY_ACCEPTABLE', value: complexity },
    { step: 'RISK_SCORE_CALCULATED',     value: Number(riskScore.toFixed(1)) },
    { step: riskScore > 70 ? 'RISK_THRESHOLD_EXCEEDED' : riskScore > 50 ? 'RISK_THRESHOLD_ELEVATED' : 'RISK_WITHIN_THRESHOLD', value: Number(riskScore.toFixed(1)) },
    { step: 'DECISION_' + status,        value: null }
  ];

  return {
    riskScore:    Number(riskScore.toFixed(1)),
    lossExposure,
    status,
    lifecycle,
    trace
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const {
      budget,
      timeline,
      complexity,
      source = 'execution_page',
      entity,
      email,
      country
    } = req.body || {};

    // Input validation
    const b = Number(budget);
    const t = Number(timeline);
    const c = Number(complexity);

    if (!b || b <= 0 || b > 1e12) {
      return res.status(400).json({ ok: false, error: 'INVALID_BUDGET' });
    }
    if (!t || t <= 0 || t > 600) {
      return res.status(400).json({ ok: false, error: 'INVALID_TIMELINE' });
    }
    if (!c || c < 1 || c > 5) {
      return res.status(400).json({ ok: false, error: 'INVALID_COMPLEXITY' });
    }

    // Generate ID with collision retry
    let executionId = makeExecutionId();
    let attempts = 0;
    while (attempts < 3) {
      const { data: existing } = await supabase
        .from('executions')
        .select('execution_id')
        .eq('execution_id', executionId)
        .maybeSingle();
      if (!existing) break;
      executionId = makeExecutionId();
      attempts++;
    }
    const result = evaluateExecution(b, t, c);

    const payload = { budget: b, timeline: t, complexity: c, source, entity, email, country };

    const { error: dbError } = await supabase.from('executions').insert({
      execution_id:  executionId,
      source,
      entity:        entity  || null,
      email:         email   || null,
      country:       country || null,
      budget:        b,
      timeline:      t,
      complexity:    c,
      risk_score:    result.riskScore,
      loss_exposure: result.lossExposure,
      result_status: result.status,
      lifecycle:     result.lifecycle,
      payload,
      result:        { riskScore: result.riskScore, lossExposure: result.lossExposure, status: result.status, trace: result.trace }
    });

    return res.status(200).json({
      ok:           true,
      executionId,
      status:       result.status,
      riskScore:    result.riskScore,
      lossExposure: result.lossExposure,
      lifecycle:    result.lifecycle,
      trace:        result.trace,
      registry:     dbError ? 'FAILED' : 'STORED',
      warning:      dbError ? 'REGISTRY_WRITE_FAILED' : null
    });

  } catch (err) {
    console.error('Execute error:', err);
    return res.status(500).json({ ok: false, error: 'EXECUTION_FAILED' });
  }
}
