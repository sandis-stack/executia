/**
 * EXECUTIA™ — POST /api/request-validation
 * Control gate: saves case, sends emails, returns full state
 * Required env: SUPABASE_URL · SUPABASE_SERVICE_KEY · RESEND_API_KEY · OPERATOR_EMAIL
 * Optional env: ALLOWED_ORIGIN · EMAIL_FROM
 */

import { createClient } from '@supabase/supabase-js';
import { computeRisk }  from './_shared-risk.js';

const db = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function sendEmail(to, subject, html) {
  if (!process.env.RESEND_API_KEY) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        from: process.env.EMAIL_FROM || 'EXECUTIA Control <control@executia.io>',
        to: [to], subject, html,
      }),
    });
    return r.ok;
  } catch (e) {
    console.warn('[EXECUTIA] email error:', e.message);
    return false;
  }
}

export default async function handler(req, res) {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });

  const b = req.body || {};
  if (!b.email) return res.status(400).json({ ok: false, error: 'EMAIL_REQUIRED' });

  const eng    = computeRisk(b);
  const now    = new Date().toISOString();
  const client = db();

  // Collision-safe ID
  let id = null;
  for (let i = 0; i < 3; i++) {
    const candidate = 'REQ-' + Math.random().toString(36).slice(2, 10).toUpperCase();
    const { data: exists } = await client.from('cases').select('id').eq('id', candidate).maybeSingle();
    if (!exists) { id = candidate; break; }
  }
  if (!id) return res.status(500).json({ ok: false, error: 'ID_GENERATION_FAILED' });

  // Initial trace — only what actually happened so far
  const trace = [
    { ts: now, event: 'case_created',     note: 'Submitted via web intake' },
    { ts: now, event: 'engine_evaluated', note: `Risk ${eng.risk}/100 · ${eng.verdict}` },
  ];

  const { error } = await client.from('cases').insert({
    id,
    source:             'request_form',
    name:               b.name          || null,
    company:            b.company       || b.entity       || null,
    role:               b.role          || null,
    email:              b.email,
    phone:              b.phone         || null,
    process_type:       b.processType   || null,
    country:            b.country       || null,
    operator_name:      b.operator      || null,
    process_value:      b.value         || b.processValue || null,
    main_risk:          b.risk          || b.mainRisk     || null,
    consequence:        b.consequence   || null,
    context:            b.context       || null,
    risk_score:         eng.risk,
    exposure:           eng.exposure,
    verdict:            eng.verdict,
    lifecycle:          eng.lifecycle,
    status:             'pending',
    trace,
  });

  if (error) {
    console.error('[EXECUTIA] request-validation insert failed:', error.message);
    return res.status(500).json({ ok: false, error: 'DB_INSERT_FAILED' });
  }

  // Emails — after DB success
  const clientEmailOk = await sendEmail(
    b.email,
    `EXECUTIA Control Record ${id}`,
    `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:520px">
      <h2 style="margin:0 0 12px;font-size:15px;letter-spacing:.05em">CONTROL RECORD CREATED</h2>
      <p>Your process has entered the EXECUTIA review flow.</p>
      <table style="margin:16px 0;border-collapse:collapse;font-size:13px">
        <tr><td style="padding:3px 18px 3px 0;color:#888;text-transform:uppercase;font-size:11px;letter-spacing:.08em">Request ID</td><td><strong>${id}</strong></td></tr>
        <tr><td style="padding:3px 18px 3px 0;color:#888;text-transform:uppercase;font-size:11px;letter-spacing:.08em">Verdict</td><td>${eng.verdict}</td></tr>
        <tr><td style="padding:3px 18px 3px 0;color:#888;text-transform:uppercase;font-size:11px;letter-spacing:.08em">Lifecycle</td><td>${eng.lifecycle}</td></tr>
        <tr><td style="padding:3px 18px 3px 0;color:#888;text-transform:uppercase;font-size:11px;letter-spacing:.08em">Risk Score</td><td>${eng.risk}/100</td></tr>
        <tr><td style="padding:3px 18px 3px 0;color:#888;text-transform:uppercase;font-size:11px;letter-spacing:.08em">Status</td><td>Operator review active</td></tr>
      </table>
      <p><a href="https://executia.io/status?id=${encodeURIComponent(id)}">VIEW EXECUTION STATUS →</a></p>
      <p style="color:#aaa;font-size:11px;margin-top:28px">EXECUTIA — control@executia.io</p>
    </div>`
  );

  const operatorEmailOk = process.env.OPERATOR_EMAIL
    ? await sendEmail(
        process.env.OPERATOR_EMAIL,
        `[EXECUTIA] New case ${id} — ${eng.verdict}`,
        `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:520px">
          <h2 style="margin:0 0 12px;font-size:15px">[EXECUTIA] NEW CASE</h2>
          <table style="margin:0;border-collapse:collapse;font-size:13px">
            <tr><td style="padding:3px 16px 3px 0;color:#888;font-size:11px">ID</td><td>${id}</td></tr>
            <tr><td style="padding:3px 16px 3px 0;color:#888;font-size:11px">Company</td><td>${b.company || b.entity || '—'}</td></tr>
            <tr><td style="padding:3px 16px 3px 0;color:#888;font-size:11px">Email</td><td>${b.email}</td></tr>
            <tr><td style="padding:3px 16px 3px 0;color:#888;font-size:11px">Process</td><td>${b.processType || '—'}</td></tr>
            <tr><td style="padding:3px 16px 3px 0;color:#888;font-size:11px">Risk</td><td>${b.risk || b.mainRisk || '—'}</td></tr>
            <tr><td style="padding:3px 16px 3px 0;color:#888;font-size:11px">Consequence</td><td>${b.consequence || '—'}</td></tr>
            <tr><td style="padding:3px 16px 3px 0;color:#888;font-size:11px">Verdict</td><td><strong>${eng.verdict}</strong> · ${eng.risk}/100</td></tr>
            <tr><td style="padding:3px 16px 3px 0;color:#888;font-size:11px">Country</td><td>${b.country || '—'}</td></tr>
          </table>
        </div>`
      )
    : false;

  // Update trace with honest email result
  const finalTrace = [
    ...trace,
    {
      ts:    new Date().toISOString(),
      event: clientEmailOk   ? 'confirmation_sent'              : 'confirmation_failed',
      note:  clientEmailOk   ? `Sent to ${b.email}`             : `Failed: ${b.email}`,
    },
    {
      ts:    new Date().toISOString(),
      event: operatorEmailOk ? 'operator_notified'              : 'operator_notification_failed',
      note:  operatorEmailOk ? `Sent to ${process.env.OPERATOR_EMAIL}` : 'Not sent or skipped',
    },
  ];

  await client.from('cases').update({
    trace:             finalTrace,
    client_email_sent: clientEmailOk,
    operator_email_sent: operatorEmailOk,
    updated_at:        new Date().toISOString(),
  }).eq('id', id);

  return res.status(200).json({
    ok:                 true,
    id,
    executionId:        id,
    verdict:            eng.verdict,
    lifecycle:          eng.lifecycle,
    risk:               eng.risk,
    riskScore:          eng.risk,
    exposure:           eng.exposure,
    emailSent:          clientEmailOk,
    operatorEmailSent:  operatorEmailOk,
  });
}
