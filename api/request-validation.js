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
  const statusUrl = `https://executia.io/status?id=${encodeURIComponent(id)}`;

  function renderEmail(v) {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${v.email_title}</title></head>
<body style="margin:0;padding:0;background:#f3f5f8;font-family:Arial,Helvetica,sans-serif;color:#0A2540;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f5f8;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:920px;background:#f3f5f8;">
        <tr><td style="border:1px solid #d7dee8;background:#eef2f7;padding:48px 36px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border:1px solid #d7dee8;">
            <tr><td style="padding:56px 64px 48px 64px;">
              <div style="font-size:16px;line-height:1.4;letter-spacing:0.22em;text-transform:uppercase;color:#6b778c;font-family:'Courier New',Courier,monospace;margin-bottom:28px;">EXECUTIA · ${v.eyebrow}</div>
              <div style="font-size:40px;line-height:1.14;font-weight:700;color:#0A2540;margin-bottom:28px;max-width:720px;">${v.main_title}</div>
              <div style="font-size:18px;line-height:1.7;color:#4b5563;margin-bottom:34px;max-width:720px;">${v.intro_text}</div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f7fb;border-left:6px solid #0A2540;margin-bottom:42px;">
                <tr><td style="padding:28px 34px;">
                  <div style="font-family:'Courier New',Courier,monospace;font-size:16px;line-height:2;color:#111827;">
                    <strong>REQUEST ID:</strong> ${v.request_id}<br>
                    <strong>VERDICT:</strong> ${v.verdict}<br>
                    <strong>LIFECYCLE:</strong> ${v.lifecycle}<br>
                    <strong>RISK SCORE:</strong> ${v.risk_score}<br>
                    <strong>STATUS:</strong> ${v.status_text}
                  </div>
                </td></tr>
              </table>
              <div style="font-size:16px;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:14px;">Next:</div>
              <div style="font-family:'Courier New',Courier,monospace;font-size:18px;line-height:2;color:#374151;margin-bottom:38px;">
                ${v.next_line_1}<br>${v.next_line_2}<br>${v.next_line_3}
              </div>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:54px;">
                <tr><td align="center" bgcolor="#0A2540">
                  <a href="${v.cta_url}" style="display:inline-block;padding:22px 42px;font-family:'Courier New',Courier,monospace;font-size:16px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#ffffff;text-decoration:none;">${v.cta_text}</a>
                </td></tr>
              </table>
              <div style="height:1px;background:#d7dee8;margin-bottom:34px;"></div>
              <div style="font-size:14px;line-height:1.9;color:#6b7280;">
                <strong style="color:#6b7280;">EXECUTIA</strong><br>${v.footer_line_1}<br>
                <a href="mailto:${v.contact_email}" style="color:#0A66D6;text-decoration:underline;">${v.contact_email}</a>
              </div>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  }

  const PAYLOADS = {
    'APPROVED': {
      email_title: `EXECUTIA — Execution approved under control (${id})`,
      eyebrow: 'CONTROL RECORD',
      main_title: 'Execution approved under control.',
      intro_text: 'Your process has been evaluated and can proceed under EXECUTIA control.',
      request_id: id, verdict: eng.verdict, lifecycle: eng.lifecycle,
      risk_score: `${eng.risk}/100`, status_text: 'Execution approved',
      next_line_1: '— execution status available',
      next_line_2: '— trace record active',
      next_line_3: '— control path visible',
      cta_url: statusUrl, cta_text: '→ View Execution Status',
      footer_line_1: 'Execution Control Infrastructure', contact_email: 'control@executia.io',
    },
    'BLOCKED': {
      email_title: `EXECUTIA — Execution cannot proceed uncontrolled (${id})`,
      eyebrow: 'CONTROL RECORD',
      main_title: 'Execution cannot proceed uncontrolled.',
      intro_text: 'The submitted process cannot continue without an active control layer.',
      request_id: id, verdict: eng.verdict, lifecycle: eng.lifecycle,
      risk_score: `${eng.risk}/100`, status_text: 'Execution blocked pending control',
      next_line_1: '— control submission required',
      next_line_2: '— execution path review',
      next_line_3: '— operator decision',
      cta_url: 'https://executia.io/request', cta_text: '→ Submit for Control',
      footer_line_1: 'Execution Control Infrastructure', contact_email: 'control@executia.io',
    },
    'REQUIRES REVIEW': {
      email_title: `EXECUTIA — Control record created (${id})`,
      eyebrow: 'CONTROL RECORD',
      main_title: 'Your process is now under control.',
      intro_text: 'We received your request and linked it to the EXECUTIA control system.',
      request_id: id, verdict: eng.verdict, lifecycle: eng.lifecycle,
      risk_score: `${eng.risk}/100`, status_text: 'Operator review active',
      next_line_1: '— initial validation',
      next_line_2: '— risk screening',
      next_line_3: '— operator review',
      cta_url: statusUrl, cta_text: '→ View Execution Status',
      footer_line_1: 'Execution Control Infrastructure', contact_email: 'control@executia.io',
    },
  };

  const payload = PAYLOADS[eng.verdict] || PAYLOADS['REQUIRES REVIEW'];
  const clientEmailOk = await sendEmail(b.email, payload.email_title, renderEmail(payload));

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
