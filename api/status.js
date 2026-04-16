// /api/status.js
// EXECUTIA — Execution status lookup (Supabase, not Firestore)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  const id = (req.query.id || '').trim().toUpperCase();
  if (!id) return res.status(400).json({ error: 'MISSING_ID' });

  try {
    const { data, error } = await supabase
      .from('executions')
      .select('*')
      .eq('execution_id', id)
      .maybeSingle();

    if (error) {
      console.error('status lookup error:', error);
      return res.status(500).json({ error: 'LOOKUP_FAILED', details: error.message });
    }

    if (!data) {
      return res.status(200).json({ found: false, id });
    }

    return res.status(200).json({
      found:        true,
      executionId:  data.execution_id,
      status:       data.status,
      authorized:   data.authorized   || false,
      holdPending:  data.hold_pending || false,
      riskScore:    Number(data.risk_score   || 0),
      lossExposure: Number(data.loss_exposure || 0),
      budget:       Number(data.budget       || 0),
      timeline:     Number(data.timeline     || 0),
      complexity:   Number(data.complexity   || 0),
      trace:        data.trace    || [],
      reasons:      data.reasons  || [],
      timestamp:    data.created_at || null,
    });

  } catch (e) {
    console.error('status.js error:', e);
    return res.status(500).json({ error: 'SERVER_ERROR', details: e.message });
  }
}
