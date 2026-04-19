// /api/status.js
// EXECUTIA — Execution Status Lookup
// GET /api/status?id=EX-XXXXXX

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const executionId = req.query.id;

    if (!executionId) {
      return res.status(400).json({ ok: false, error: 'MISSING_ID' });
    }

    const { data, error } = await supabase
      .from('executions')
      .select('*')
      .eq('execution_id', executionId)
      .maybeSingle();

    if (error) {
      console.error('Supabase lookup error:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    if (!data) {
      // Could be in processing — return ANALYZING state
      return res.status(200).json({
        ok:     true,
        found:  false,
        status: 'ANALYZING',
        record: {
          executionId:  executionId,
          status:       'ANALYZING',
          lifecycle:    'PROCESSING',
          riskScore:    null,
          lossExposure: null
        }
      });
    }

    return res.status(200).json({
      ok:    true,
      found: true,
      record: {
        executionId:  data.execution_id,
        status:       data.result_status,
        lifecycle:    data.lifecycle,
        riskScore:    data.risk_score,
        lossExposure: data.loss_exposure,
        budget:       data.budget,
        timeline:     data.timeline,
        complexity:   data.complexity,
        entity:       data.entity,
        country:      data.country,
        source:       data.source,
        createdAt:    data.created_at,
        trace:        data.result?.trace || []
      }
    });

  } catch (err) {
    console.error('Status error:', err);
    return res.status(500).json({ ok: false, error: 'STATUS_FAILED' });
  }
}
