// /api/lead-update.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function json(res, status, body) { return res.status(status).json(body); }

function isAuthorized(req) {
  const key = req.headers['x-dashboard-key'];
  return !!key && key === process.env.DASHBOARD_ACCESS_KEY;
}

function sanitize(value) {
  if (value === null || value === undefined) return null;
  const t = String(value).trim();
  return t === '' ? null : t;
}

const ALLOWED_STATUSES = ['NEW','UNDER_REVIEW','REPLIED','CALL_BOOKED','PILOT_SENT','CLOSED'];

export default async function handler(req, res) {
  if (req.method !== 'PATCH' && req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!isAuthorized(req)) return json(res, 401, { error: 'Unauthorized' });

  try {
    const leadId    = sanitize(req.body?.id || req.body?.lead_id || req.body?.executionId);
    const nextStatus= sanitize(req.body?.status);
    const note      = sanitize(req.body?.note || req.body?.notes);
    const operator  = sanitize(req.body?.actor || req.body?.operator) || 'dashboard_operator';

    if (!leadId) return json(res, 400, { error: 'Missing lead id' });
    if (nextStatus && !ALLOWED_STATUSES.includes(nextStatus)) {
      return json(res, 400, { error: 'Invalid status', allowed_statuses: ALLOWED_STATUSES });
    }

    // Read current lead — try by id first, then execution_id
    let existingLead = null;
    const byId = await supabase.from('leads').select('id,execution_id,status,notes').eq('id', leadId).maybeSingle();
    if (byId.data) {
      existingLead = byId.data;
    } else {
      const byEid = await supabase.from('leads').select('id,execution_id,status,notes').eq('execution_id', leadId).maybeSingle();
      existingLead = byEid.data;
    }
    if (!existingLead) return json(res, 404, { error: 'Lead not found' });

    const patch = { updated_at: new Date().toISOString() };
    if (nextStatus) patch.status = nextStatus;
    if (note !== null) patch.notes = note;

    const { data: updatedLead, error: updateError } = await supabase.from('leads').update(patch).eq('id', existingLead.id).select().single();
    if (updateError) { console.error('Lead update failed:', updateError); return json(res, 500, { error: 'Failed to update lead' }); }

    // Non-blocking operator activity log
    try {
      await supabase.from('operator_activity').insert({
        execution_id: existingLead.execution_id,
        event_type:   'LEAD_UPDATED',
        old_status:   existingLead.status || null,
        new_status:   nextStatus || existingLead.status || null,
        note:         note,
        actor:        operator,
      });
    } catch (activityErr) {
      console.error('operator_activity logging failed:', activityErr);
    }

    return json(res, 200, { success: true, lead: updatedLead });

  } catch (err) {
    console.error('lead-update fatal error:', err);
    return json(res, 500, { error: 'Internal server error', details: err?.message || null });
  }
}
