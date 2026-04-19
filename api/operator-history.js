// /api/operator-history.js
// EXECUTIA — Operator: fetch audit trail for one execution
// GET /api/operator-history?executionId=REQ-XXXXXX
// Requires: x-operator-token header

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

  const executionId = req.query.executionId;
  if (!executionId) {
    return res.status(400).json({ ok: false, error: 'MISSING_ID' });
  }

  try {
    const { data, error } = await supabase
      .from('execution_actions')
      .select('*')
      .eq('execution_id', executionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('operator-history DB error:', error);
      return res.status(500).json({ ok: false, error: 'DB_QUERY_FAILED' });
    }

    return res.status(200).json({
      ok:      true,
      actions: data || []
    });

  } catch (err) {
    console.error('operator-history fatal:', err);
    return res.status(500).json({ ok: false, error: 'HISTORY_FAILED' });
  }
}
