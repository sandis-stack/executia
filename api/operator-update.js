/**
 * EXECUTIA™ — POST /api/operator/update
 * Updates case status, adds operator note, appends trace event.
 * Required env: SUPABASE_URL · SUPABASE_SERVICE_KEY · OPERATOR_TOKEN
 */

import { createClient } from '@supabase/supabase-js';

const db = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const ALLOWED_STATUS = ['under_review', 'approved', 'blocked', 'closed'];
const TRACE_EVENTS   = {
  under_review: 'operator_review_started',
  approved:     'operator_approved',
  blocked:      'operator_blocked',
  closed:       'record_closed',
};

function isAuthorized(req) {
  return req.headers['x-operator-token'] === process.env.OPERATOR_TOKEN;
}

export default async function handler(req, res) {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-operator-token');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  if (!isAuthorized(req))      return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });

  const { id, status, operatorNote, reviewedBy } = req.body || {};
  if (!id)     return res.status(400).json({ ok: false, error: 'ID_REQUIRED' });
  if (!status) return res.status(400).json({ ok: false, error: 'STATUS_REQUIRED' });
  if (!ALLOWED_STATUS.includes(status)) {
    return res.status(400).json({ ok: false, error: 'INVALID_STATUS', allowed: ALLOWED_STATUS });
  }

  const client = db();
  const now    = new Date().toISOString();

  const { data: current, error: fetchErr } = await client
    .from('cases').select('trace').eq('id', id).maybeSingle();

  if (fetchErr || !current) {
    return res.status(404).json({ ok: false, error: 'RECORD_NOT_FOUND' });
  }

  const traceEvent = {
    ts:    now,
    event: TRACE_EVENTS[status],
    note:  reviewedBy ? `by ${reviewedBy}` : 'by operator',
  };

  const patch = {
    status,
    reviewed_by: reviewedBy || null,
    reviewed_at: now,
    updated_at:  now,
    trace:       [...(Array.isArray(current.trace) ? current.trace : []), traceEvent],
  };
  if (operatorNote?.trim()) patch.operator_note = operatorNote.trim();
  if (status === 'closed')  patch.archived_at   = now;

  const { error: updateErr } = await client.from('cases').update(patch).eq('id', id);

  if (updateErr) {
    console.error('[EXECUTIA] operator/update error:', updateErr.message);
    return res.status(500).json({ ok: false, error: 'DB_UPDATE_FAILED' });
  }

  return res.status(200).json({ ok: true, id, status, reviewedBy: reviewedBy||null, reviewedAt: now, traceEvent: traceEvent.event });
}
