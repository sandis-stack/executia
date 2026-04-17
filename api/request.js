// /api/request.js
// EXECUTIA — Validate/Request endpoint
// POST /api/request
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
// Resend initialized inside handler

if (process.env.NODE_ENV !== 'production') console.log('[/api/request] ENV', { supabase_url: !!process.env.SUPABASE_URL, supabase_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY, resend_key: !!process.env.RESEND_API_KEY, internal_email: process.env.INTERNAL_NOTIFICATION_EMAIL||'not set' });


// In-memory rate limit (resets on cold start — sufficient for protection)
const RATE_MAP = new Map();
function rateLimit(ip) {
  const now = Date.now();
  const prev = RATE_MAP.get(ip) || [];
  const recent = prev.filter(t => now - t < 60000);
  if (recent.length >= 5) return false;
  RATE_MAP.set(ip, [...recent, now]);
  return true;
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default async function handler(req, res) {
  // ENV validation — fail fast with clear message
  if (!process.env.SUPABASE_URL)              return res.status(500).json({ error: 'MISSING_SUPABASE_URL' });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: 'MISSING_SUPABASE_KEY' });
  if (!process.env.RESEND_API_KEY)            return res.status(500).json({ error: 'MISSING_RESEND_KEY' });

  const resend = new Resend(process.env.RESEND_API_KEY);

  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  if (!rateLimit(ip)) return res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED' });

  try {
    const _b      = req.body || {};
    const email    = (_b.email    || '').trim();
    const entity   = (_b.entity   || '').trim();
    const operator = (_b.operator || '').trim();
    const volume   = (_b.volume   || '').trim();
    const country  = (_b.country  || '').trim();
    const risk     = (_b.risk     || '').trim();

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'INVALID_EMAIL' });
    }
    const executionId = 'EX-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const ts = new Date().toISOString();

    // 1. Save lead
    const { data: lead, error: insertError } = await supabase.from('leads').insert({
      execution_id: executionId,
      company:      entity   || null,
      contact_name: operator || null,
      email,
      country:      country  || null,
      volume:       volume   || null,
      risk:         risk     || null,
      status:       'NEW',
      source:       'validate_form',
      client_email_sent:   false,
      internal_email_sent: false,
    }).select().single();

    if (insertError) {
      console.error('Lead insert failed:', insertError);
      return res.status(500).json({ error: 'LEAD_SAVE_FAILED', details: insertError.message });
    }

    // 2. Activity log
    await supabase.from('lead_activity').insert({
      lead_id:       lead.id,
      activity_type: 'LEAD_CREATED',
      payload:       { executionId, source: 'request_form' }
    });

    let clientResult = null, internalResult = null;
    let clientError = null, internalError = null;

    // 3. Client email
    try {
      clientResult = await resend.emails.send({
        from:     'EXECUTIA System <system@executia.io>',
        to:       [email],
        reply_to: 'control@executia.io',
        subject:  `EXECUTIA — Request received (${executionId})`,
        html: `<div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:32px;">
          <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #DEE2E6;padding:32px;">
            <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.18em;color:#6B7280;margin-bottom:16px;">EXECUTIA &middot; REQUEST RECEIVED</div>
            <h1 style="margin:0 0 16px;font-size:28px;color:#0A1F44;">Your request has entered the system.</h1>
            <div style="border-left:3px solid #0A1F44;padding:16px 18px;background:#F5F7FA;font-family:'JetBrains Mono',monospace;font-size:11px;line-height:2;margin-bottom:24px;">
              EXECUTION ID: ${executionId}<br>STATUS: UNDER REVIEW<br>RESPONSE WINDOW: 24&ndash;48H
            </div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#6B7280;">EXECUTIA &mdash; control@executia.io</div>
          </div></div>`,
      });
      await supabase.from('lead_activity').insert({
        lead_id: lead.id, activity_type: 'CLIENT_EMAIL_SENT',
        payload: { to: email, resend_id: clientResult?.data?.id || null }
      });
    } catch (e) {
      clientError = e;
      console.error('Client email failed:', e.message);
      await supabase.from('lead_activity').insert({
        lead_id: lead.id, activity_type: 'CLIENT_EMAIL_FAILED',
        payload: { error: e.message }
      });
    }

    // 4. Internal email
    try {
      internalResult = await resend.emails.send({
        from:     'EXECUTIA System <system@executia.io>',
        to:       [process.env.INTERNAL_NOTIFICATION_EMAIL || 'control@executia.io'],
        reply_to: email,
        subject:  `[NEW] VALIDATE REQUEST — ${executionId} — ${entity || email}`,
        html: `<div style="font-family:Arial;padding:24px;color:#0A1F44;">
          <h2>New validate request</h2>
          <p><strong>ID:</strong> ${executionId}</p>
          <p><strong>Company:</strong> ${escHtml(entity) || '—'}</p>
          <p><strong>Contact:</strong> ${escHtml(operator) || '—'}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Volume:</strong> ${escHtml(volume) || '—'}</p>
          <p><strong>Country:</strong> ${escHtml(country) || '—'}</p>
          <p><strong>Risk:</strong><br>${escHtml(risk) || '—'}</p>
          <p><strong>Timestamp:</strong> ${ts}</p>
        </div>`,
      });
      await supabase.from('lead_activity').insert({
        lead_id: lead.id, activity_type: 'INTERNAL_EMAIL_SENT',
        payload: { resend_id: internalResult?.data?.id || null }
      });
    } catch (e) {
      internalError = e;
      console.error('Internal email failed:', e.message);
      await supabase.from('lead_activity').insert({
        lead_id: lead.id,
        activity_type: 'INTERNAL_EMAIL_FAILED',
        payload: { error: e?.message || String(e) }
      }).catch(() => {});
    }

    // 5. Update flags
    await supabase.from('leads').update({
      client_email_sent:   !!clientResult,
      internal_email_sent: !!internalResult,
      updated_at: ts,
    }).eq('id', lead.id);

    return res.status(200).json({
      success: true,
      execution_id: executionId,
      lead_id: lead.id,
      client_email_sent:   !!clientResult,
      internal_email_sent: !!internalResult,
      client_email_error:   clientError?.message   || null,
      internal_email_error: internalError?.message || null,
    });

  } catch (e) {
    console.error('REQUEST HANDLER ERROR:', e);
    return res.status(500).json({ error: 'SERVER_ERROR', details: e.message });
  }
}
