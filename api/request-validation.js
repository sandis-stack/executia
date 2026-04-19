// /api/request-validation.js
// EXECUTIA — Pilot Request Validation
// POST /api/request-validation
// Receives /request form, writes to DB, sends email, returns executionId

import { createClient } from '@supabase/supabase-js';
import { sendEmail }              from '../lib/email.js';
import { sendTelegram }           from '../lib/telegram.js';
import { operatorNewRequestEmail, requestReceivedEmail } from '../lib/email-templates.js';

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
      return res.status(500).json({
        ok:    false,
        error: 'DB_INSERT_FAILED',
        detail: dbError.message
      });
    }

    // Telegram alert to operator
    const tgResult = await sendTelegram(
      `🔔 *NEW EXECUTIA REQUEST*\n\n` +
      `ID: \`${executionId}\`\n` +
      `Entity: ${entity}\n` +
      `Email: ${email}\n` +
      `Country: ${country || '—'}\n` +
      `Volume: ${volume || '—'}\n\n` +
      `Risk: ${risk ? risk.slice(0, 120) : '—'}\n\n` +
      `→ https://www.executia.io/operator`
    ).catch(() => ({ ok: false }));

    // HTML alert to operator
    const operatorEmail   = process.env.OPERATOR_EMAIL || 'control@executia.io';
    const operatorPayload = operatorNewRequestEmail({ executionId, entity, operator, email, country, volume, risk, consequence });
    console.log(`EMAIL_OPERATOR: start — to: ${operatorEmail}, id: ${executionId}`);
    const r1 = await sendEmail({
      to:      operatorEmail,
      subject: operatorPayload.subject,
      text:    operatorPayload.text,
      html:    operatorPayload.html,
      replyTo: email || 'control@executia.io'
    });
    console.log(`EMAIL_OPERATOR: result`, JSON.stringify(r1));
    if (!r1?.ok) console.error('CRITICAL: operator email failed', { executionId, to: operatorEmail });

    // HTML confirmation to submitter
    console.log(`EMAIL_CLIENT: start — to: ${email}, id: ${executionId}`);
    const clientEmail = requestReceivedEmail({ executionId });
    const r2 = await sendEmail({
      to:      email,
      subject: clientEmail.subject,
      text:    clientEmail.text,
      html:    clientEmail.html,
      replyTo: 'control@executia.io'
    });
    console.log(`EMAIL_CLIENT: result`, JSON.stringify(r2));
    if (!r2?.ok) console.error('CRITICAL: client email failed', { executionId, to: email });

    return res.status(200).json({
      ok:              true,
      executionId,
      status:          'REQUIRES_REVIEW',
      operatorEmailOk: r1?.ok  ?? false,
      clientEmailOk:   r2?.ok  ?? false,
      telegramOk:      tgResult?.ok ?? false
    });

  } catch (err) {
    console.error('Request validation error:', err);
    return res.status(500).json({ ok: false, error: 'REQUEST_FAILED' });
  }
}
