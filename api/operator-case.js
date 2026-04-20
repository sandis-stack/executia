/**
 * EXECUTIA™ — GET /api/operator/case?id=...
 * Returns full case detail for operator console.
 * Required env: SUPABASE_URL · SUPABASE_SERVICE_KEY · OPERATOR_TOKEN
 */

import { createClient } from '@supabase/supabase-js';

const db = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function isAuthorized(req) {
  const token = req.headers['x-operator-token'];
  return token && token === process.env.OPERATOR_TOKEN;
}

export default async function handler(req, res) {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-operator-token');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  if (!isAuthorized(req))      return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });

  const id = String(req.query.id || '').trim();
  if (!id) return res.status(400).json({ ok: false, error: 'ID_REQUIRED' });

  const { data, error } = await db()
    .from('cases')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[EXECUTIA] operator/case error:', error.message);
    return res.status(500).json({ ok: false, error: 'DB_QUERY_FAILED' });
  }

  if (!data) return res.status(404).json({ ok: false, error: 'RECORD_NOT_FOUND' });

  return res.status(200).json({
    ok:     true,
    record: {
      id:            data.id,
      source:        data.source,
      name:          data.name,
      company:       data.company,
      role:          data.role,
      email:         data.email,
      phone:         data.phone,
      processType:   data.process_type,
      country:       data.country,
      operatorName:  data.operator_name,
      processValue:  data.process_value,
      mainRisk:      data.main_risk,
      consequence:   data.consequence,
      context:       data.context,
      riskScore:     data.risk_score,
      exposure:      data.exposure,
      verdict:       data.verdict,
      lifecycle:     data.lifecycle,
      status:        data.status,
      operatorNote:  data.operator_note,
      reviewedBy:    data.reviewed_by,
      reviewedAt:    data.reviewed_at,
      trace:         Array.isArray(data.trace) ? data.trace : [],
      createdAt:     data.created_at,
      updatedAt:     data.updated_at,
    },
  });
}
