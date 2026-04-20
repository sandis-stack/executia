/**
 * EXECUTIA™ — GET /api/status?id=...
 * Single public truth reader. Reads from cases table.
 * Required env: SUPABASE_URL · SUPABASE_SERVICE_KEY
 */

import { createClient } from '@supabase/supabase-js';

const db = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });

  const id = String(req.query.id || '').trim();
  if (!id) return res.status(400).json({ ok: false, error: 'ID_REQUIRED' });

  const { data, error } = await db()
    .from('cases')
    .select(`
      id, company, email, process_type, country,
      risk_score, exposure, verdict, lifecycle, status,
      main_risk, consequence, operator_note,
      trace, created_at, updated_at
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[EXECUTIA] status query error:', error.message);
    return res.status(500).json({ ok: false, error: 'DB_QUERY_FAILED' });
  }

  if (!data) {
    return res.status(404).json({ ok: false, error: 'RECORD_NOT_FOUND', id });
  }

  return res.status(200).json({
    ok:           true,
    executionId:  data.id,
    verdict:      data.verdict,
    status:       data.status,
    lifecycle:    data.lifecycle,
    riskScore:    data.risk_score,
    exposure:     data.exposure,
    entity:       data.company,
    country:      data.country,
    processType:  data.process_type,
    mainRisk:     data.main_risk,
    consequence:  data.consequence,
    operatorNote: data.operator_note,
    trace:        Array.isArray(data.trace) ? data.trace : [],
    createdAt:    data.created_at,
    updatedAt:    data.updated_at,
  });
}
