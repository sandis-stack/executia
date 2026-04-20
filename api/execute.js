/**
 * EXECUTIA™ — POST /api/execute
 * Evaluate + persist + return ID + verdict
 * Required env: SUPABASE_URL · SUPABASE_SERVICE_KEY
 * Optional env: ALLOWED_ORIGIN
 */

import { createClient } from '@supabase/supabase-js';
import { computeRisk }  from './_shared-risk.js';

const db = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });

  const b      = req.body || {};
  const eng    = computeRisk(b);
  const now    = new Date().toISOString();
  const client = db();

  // Collision-safe ID
  let id = null;
  for (let i = 0; i < 3; i++) {
    const candidate = 'EXEC-' + Math.random().toString(36).slice(2, 10).toUpperCase();
    const { data: exists } = await client.from('cases').select('id').eq('id', candidate).maybeSingle();
    if (!exists) { id = candidate; break; }
  }
  if (!id) return res.status(500).json({ ok: false, error: 'ID_GENERATION_FAILED' });

  const trace = [
    { ts: now, event: 'case_created',     note: 'Submitted via execution demo' },
    { ts: now, event: 'engine_evaluated', note: `Risk ${eng.risk}/100 · ${eng.verdict}` },
  ];

  const { error } = await client.from('cases').insert({
    id,
    source:        'execution_demo',
    email:         b.email        || null,
    process_type:  b.processType  || null,
    process_value: b.value        || b.budget || null,
    main_risk:     b.risk         || b.whatIsAtRisk || null,
    consequence:   b.consequence  || null,
    country:       b.country      || null,
    risk_score:    eng.risk,
    exposure:      eng.exposure,
    verdict:       eng.verdict,
    lifecycle:     eng.lifecycle,
    status:        'execution_record',
    trace,
  });

  if (error) {
    console.error('[EXECUTIA] execute insert failed:', error.message);
    return res.status(500).json({ ok: false, error: 'DB_INSERT_FAILED' });
  }

  return res.status(200).json({
    ok:          true,
    id,
    executionId: id,
    verdict:     eng.verdict,
    lifecycle:   eng.lifecycle,
    risk:        eng.risk,
    riskScore:   eng.risk,
    exposure:    eng.exposure,
    trace,
  });
}
