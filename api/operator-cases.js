/**
 * EXECUTIA™ — GET /api/operator/cases
 * Returns filtered case list for operator console.
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

  const { status, q, limit = 100 } = req.query;

  let query = db()
    .from('cases')
    .select('id, source, company, email, process_type, country, status, verdict, risk_score, created_at')
    .order('created_at', { ascending: false })
    .limit(Number(limit));

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (q) {
    query = query.or(`id.ilike.%${q}%,company.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[EXECUTIA] operator/cases error:', error.message);
    return res.status(500).json({ ok: false, error: 'DB_QUERY_FAILED' });
  }

  return res.status(200).json({
    ok:    true,
    count: data.length,
    items: data.map(r => ({
      id:          r.id,
      source:      r.source,
      company:     r.company,
      email:       r.email,
      processType: r.process_type,
      country:     r.country,
      status:      r.status,
      verdict:     r.verdict,
      riskScore:   r.risk_score,
      createdAt:   r.created_at,
    })),
  });
}
