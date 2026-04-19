// /api/request-validation.js
// EXECUTIA — Pilot Request Validation
// POST /api/request-validation
// Receives /request form, writes to DB, sends email, returns executionId

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function makeRequestId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'REQ-';
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

async function sendEmail({ to, subject, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, reason: 'no_api_key' };

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({
        from:    'EXECUTIA <control@executia.io>',
        to:      Array.isArray(to) ? to : [to],
        subject,
        text
      })
    });
    const data = await r.json();
    return { ok: r.ok, data };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const {
      email,
      entity,
      operator,
      volume,
      risk,
      consequence,
      country
    } = req.body || {};

    if (!email || !entity) {
      return res.status(400).json({ ok: false, error: 'MISSING_REQUIRED_FIELDS' });
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ ok: false, error: 'INVALID_EMAIL' });
    }

    const executionId = makeRequestId();

    const payload = { entity, operator, email, volume, risk, consequence, country };

    const { error: dbError } = await supabase.from('executions').insert({
      execution_id:  executionId,
      source:        'request_form',
      entity,
      operator:      operator  || null,
      email,
      country:       country   || null,
      risk_note:     risk      || null,
      consequence:   consequence || null,
      payload,
      result:        {},
      status:        'REQUIRES_REVIEW',
      result_status: 'REQUIRES_REVIEW',
      lifecycle:     'UNDER_REVIEW'
    });

    if (dbError) {
      console.error('Supabase request insert error:', dbError);
      // Still send email and return — don't fail the user
    }

    // Email to operator
    const operatorEmail = process.env.OPERATOR_EMAIL || 'control@executia.io';
    console.log(`EMAIL_OPERATOR: start — to: ${operatorEmail}, id: ${executionId}`);
    const r1 = await sendEmail({
      to:      operatorEmail,
      subject: `[EXECUTIA] New Request — ${executionId} — ${entity}`,
      text:    [
        `EXECUTION REQUEST RECEIVED`,
        ``,
        `ID:          ${executionId}`,
        `Entity:      ${entity}`,
        `Operator:    ${operator || '—'}`,
        `Email:       ${email}`,
        `Country:     ${country || '—'}`,
        `Volume:      ${volume || '—'}`,
        ``,
        `Execution Risk:`,
        risk || '—',
        ``,
        `What happens if this fails:`,
        consequence || '—',
        ``,
        `Status page: https://www.executia.io/status?id=${executionId}`
      ].join('\n')
    });
    console.log(`EMAIL_OPERATOR: result`, JSON.stringify(r1));

    // Confirmation to submitter
    console.log(`EMAIL_CLIENT: start — to: ${email}, id: ${executionId}`);
    const r2 = await sendEmail({
      to:      email,
      subject: `EXECUTIA — Execution Request Received [${executionId}]`,
      text:    [
        `EXECUTION REQUEST ACCEPTED`,
        ``,
        `Execution ID: ${executionId}`,
        ``,
        `Your scenario has been submitted to EXECUTIA.`,
        `Operator review has started.`,
        ``,
        `If qualified, you will receive a response within 24–48h.`,
        ``,
        `Track your request:`,
        `https://www.executia.io/status?id=${executionId}`,
        ``,
        `Direct contact: control@executia.io`,
        ``,
        `EXECUTIA — Standard of Execution`
      ].join('\n')
    });
    console.log(`EMAIL_CLIENT: result`, JSON.stringify(r2));

    return res.status(200).json({
      ok:          true,
      executionId,
      status:      'REQUIRES_REVIEW'
    });

  } catch (err) {
    console.error('Request validation error:', err);
    return res.status(500).json({ ok: false, error: 'REQUEST_FAILED' });
  }
}
