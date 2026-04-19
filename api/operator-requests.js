// /api/operator-requests.js
// EXECUTIA — Operator: list all execution requests
// GET /api/operator-requests?status=REQUIRES_REVIEW&limit=50
// Requires: x-operator-token header === OPERATOR_TOKEN env

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function isAuthorized(req) {
  const token = req.headers['x-operator-token'];
  return !!process.env.OPERATOR_TOKEN && token === process.env.OPERATOR_TOKEN;
}

export default async function handler(req, res) {
  if (!isAuthorized(req)) {
    return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const status = req.query.status || '';
    const limit  = Math.min(Number(req.query.limit || 100), 200);

    let query = supabase
      .from('executions')
      .select(`
        id,
        execution_id,
        status,
        result_status,
        lifecycle,
        entity,
        email,
        country,
        source,
        risk_note,
        consequence,
        operator_note,
        reviewed_at,
        reviewed_by,
        created_at,
        updated_at,
        payload,
        result,
        trace,
        risk_score,
        loss_exposure
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('operator-requests DB error:', error);
      return res.status(500).json({ ok: false, error: 'DB_QUERY_FAILED' });
    }

    const now = Date.now();
    const enriched = (data || []).map(r => {
      const ageMs  = r.created_at ? now - new Date(r.created_at).getTime() : 0;
      const ageH   = Math.floor(ageMs / 3600000);
      const isReview = r.status === 'REQUIRES_REVIEW' || r.status === 'UNDER_REVIEW';
      const priority = isReview && ageH >= 24 ? 'HIGH' : isReview ? 'NORMAL' : 'LOW';
      return { ...r, _ageHours: ageH, _priority: priority };
    });

    return res.status(200).json({
      ok:       true,
      count:    enriched.length,
      requests: enriched
    });

  } catch (err) {
    console.error('operator-requests fatal:', err);
    return res.status(500).json({ ok: false, error: 'REQUESTS_FAILED' });
  }
}
