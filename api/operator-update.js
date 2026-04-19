// /api/operator-update.js
// EXECUTIA — Operator: update execution status
// POST /api/operator-update
// Body: { executionId, status, operatorNote, reviewedBy }
// Requires: x-operator-token header === OPERATOR_TOKEN env

import { createClient } from '@supabase/supabase-js';
import { sendEmail }             from '../lib/email.js';
import { requestApprovedEmail, requestBlockedEmail } from '../lib/email-templates.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function isAuthorized(req) {
  const token = req.headers['x-operator-token'];
  return !!process.env.OPERATOR_TOKEN && token === process.env.OPERATOR_TOKEN;
}

const ALLOWED_STATUS = new Set(['UNDER_REVIEW', 'APPROVED', 'BLOCKED', 'ARCHIVED']);

export default async function handler(req, res) {
  if (!isAuthorized(req)) {
    return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const { executionId, status, operatorNote, reviewedBy } = req.body || {};

    if (!executionId || !status) {
      return res.status(400).json({ ok: false, error: 'MISSING_REQUIRED_FIELDS' });
    }

    if (!ALLOWED_STATUS.has(status)) {
      return res.status(400).json({ ok: false, error: 'INVALID_STATUS', allowed: [...ALLOWED_STATUS] });
    }

    const resultStatus = status === 'UNDER_REVIEW' ? 'REQUIRES_REVIEW' : status;
    const lifecycle    = status === 'UNDER_REVIEW' ? 'UNDER_REVIEW'    : status;

    // Fetch current status for audit trail
    const { data: existing } = await supabase
      .from('executions')
      .select('status')
      .eq('execution_id', executionId)
      .maybeSingle();
    const previousStatus = existing?.status || null;

    const { data, error } = await supabase
      .from('executions')
      .update({
        status,
        result_status: resultStatus,
        lifecycle,
        operator_note: operatorNote || null,
        reviewed_at:   new Date().toISOString(),
        reviewed_by:   reviewedBy || 'operator',
        updated_at:    new Date().toISOString()
      })
      .eq('execution_id', executionId)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('operator-update DB error:', error);
      return res.status(500).json({ ok: false, error: 'DB_UPDATE_FAILED' });
    }

    if (!data) {
      return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
    }

    // ── Audit log ────────────────────────────────────────────────────
    await supabase.from('execution_actions').insert({
      execution_id:    executionId,
      action:          'STATUS_CHANGE',
      previous_status: previousStatus,
      new_status:      status,
      operator_note:   operatorNote || null,
      reviewed_by:     reviewedBy || 'operator'
    }).then(({ error: logErr }) => {
      if (logErr) console.error('CRITICAL: audit log failed', logErr.message, { executionId, status });
    });

    // ── HTML email on APPROVED or BLOCKED ────────────────────────────
    let clientEmailOk = null;
    if (data.email && (status === 'APPROVED' || status === 'BLOCKED')) {
      const emailPayload = status === 'APPROVED'
        ? requestApprovedEmail({ executionId, operatorNote })
        : requestBlockedEmail({  executionId, operatorNote });

      console.log(`OPERATOR_EMAIL: sending ${status} to ${data.email}`);
      const emailResult = await sendEmail({
        to:      data.email,
        subject: emailPayload.subject,
        text:    emailPayload.text,
        html:    emailPayload.html,
        replyTo: 'control@executia.io'
      });
      console.log('OPERATOR_EMAIL_RESULT', JSON.stringify(emailResult));
      clientEmailOk = emailResult?.ok ?? false;
      if (!clientEmailOk) console.error('CRITICAL: client email failed', { executionId, status, email: data.email });
    }

    return res.status(200).json({
      ok:            true,
      clientEmailOk,
      record: {
        executionId:  data.execution_id,
        status:       data.status,
        resultStatus: data.result_status,
        lifecycle:    data.lifecycle,
        reviewedAt:   data.reviewed_at,
        reviewedBy:   data.reviewed_by,
        operatorNote: data.operator_note
      }
    });

  } catch (err) {
    console.error('operator-update fatal:', err);
    return res.status(500).json({ ok: false, error: 'UPDATE_FAILED' });
  }
}
