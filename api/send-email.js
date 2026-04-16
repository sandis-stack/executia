// /api/send-email.js
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

function json(res, status, body) { return res.status(status).json(body); }

function getBaseUrl(req) {
  const protocol = req.headers['x-forwarded-proto'] || (process.env.NODE_ENV === 'development' ? 'http' : 'https');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${protocol}://${host}`;
}

function sanitize(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizePayload(body = {}) {
  return {
    company:     sanitize(body.company),
    name:        sanitize(body.name),
    email:       sanitize(body.email).toLowerCase(),
    phone:       sanitize(body.phone),
    country:     sanitize(body.country),
    website:     sanitize(body.website),
    message:     sanitize(body.message),
    source:      sanitize(body.source) || 'homepage',
    entry_point: sanitize(body.entry_point) || 'homepage',
    // EXECUTIA-specific fields
    executionId: sanitize(body.executionId),
    entity:      sanitize(body.entity),
    operator:    sanitize(body.operator),
    volume:      sanitize(body.volume),
    risk:        sanitize(body.risk),
    status:      sanitize(body.status),
  };
}

function buildClientEmailHtml(data, executionId) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:32px;">
      <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #DEE2E6;padding:32px;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.18em;color:#6B7280;margin-bottom:16px;">EXECUTIA · REQUEST RECEIVED</div>
        <h1 style="margin:0 0 16px;font-size:28px;line-height:1.1;color:#0A1F44;">Your request has entered the system.</h1>
        <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#4B5563;">We received your request and linked it to the EXECUTIA control flow.</p>
        <div style="border-left:3px solid #0A1F44;padding:16px 18px;background:#F5F7FA;margin-bottom:24px;font-family:'JetBrains Mono',monospace;font-size:11px;line-height:2;">
          ${executionId ? `EXECUTION ID: ${executionId}<br>` : ''}
          ${data.entity ? `COMPANY: ${data.entity}<br>` : data.company ? `COMPANY: ${data.company}<br>` : ''}
          ${data.name ? `CONTACT: ${data.name}<br>` : ''}
          EMAIL: ${data.email}<br>
          STATUS: UNDER REVIEW<br>
          RESPONSE WINDOW: 24&ndash;48H
        </div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;line-height:2;color:#374151;margin-bottom:24px;">
          NEXT:<br>&mdash; initial validation<br>&mdash; risk screening<br>&mdash; operator review
        </div>
        <a href="https://www.executia.io/execution" style="display:inline-block;background:#0A1F44;color:#fff;text-decoration:none;padding:14px 22px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;letter-spacing:.1em;">&rarr; ENTER EXECUTION</a>
        <div style="margin-top:28px;padding-top:18px;border-top:1px solid #DEE2E6;font-family:'JetBrains Mono',monospace;font-size:10px;line-height:2;color:#6B7280;">EXECUTIA<br>Execution Control Infrastructure<br>control@executia.io</div>
      </div>
    </div>`;
}

function buildInternalEmailHtml(data, leadId, req, executionId) {
  const baseUrl    = getBaseUrl(req);
  const dashboardUrl = `${baseUrl}/dashboard`;
  return `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#0A2540;">
      <h2 style="margin-bottom:16px;">New EXECUTIA lead</h2>
      <p><strong>Lead ID:</strong> ${leadId}</p>
      ${executionId ? `<p><strong>Execution ID:</strong> ${executionId}</p>` : ''}
      <p><strong>Company:</strong> ${data.entity || data.company || '-'}</p>
      <p><strong>Contact:</strong> ${data.operator || data.name || '-'}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Country:</strong> ${data.country || '-'}</p>
      <p><strong>Volume:</strong> ${data.volume || '-'}</p>
      <p><strong>Risk:</strong><br>${(data.risk || data.message || '-').replace(/\n/g, '<br>')}</p>
      <hr style="margin:24px 0;border:none;border-top:1px solid #dbe4ee;"/>
      <p><a href="${dashboardUrl}" style="color:#0A2540;font-weight:bold;">Open dashboard</a></p>
    </div>`;
}

async function insertLeadActivity(leadId, type, payload = {}) {
  try {
    await supabase.from('lead_activity').insert({ lead_id: leadId, activity_type: type, payload });
  } catch (err) {
    console.error(`lead_activity insert failed [${type}]`, err);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  try {
    const data = normalizePayload(req.body);

    // Backend is sole authority for executionId — frontend value ignored
    const finalExecutionId = 'EX-' + Math.random().toString(36).substring(2, 10).toUpperCase();

    // Accept both EXECUTIA execution flow and standard contact form
    const isExecution = !!data.entity;
    if (!isExecution && (!data.name || !data.email || !data.message)) {
      return json(res, 400, { error: 'Missing required fields: name, email, message' });
    }
    if (!data.email || !data.email.includes('@')) {
      return json(res, 400, { error: 'Invalid email' });
    }

    if (!process.env.RESEND_API_KEY) return json(res, 500, { error: 'MISSING_RESEND_API_KEY' });

    // 1. Save lead
    const leadPayload = {
      company:             data.entity || data.company || null,
      contact_name:        data.operator || data.name || null,
      email:               data.email,
      country:             data.country || null,
      volume:              data.volume || null,
      risk:                data.risk || data.message || null,
      source:              data.source || (isExecution ? 'execution_flow' : 'homepage'),
      entry_point:         data.entry_point || 'homepage',
      status:              'NEW',
      client_email_sent:   false,
      internal_email_sent: false,
      execution_id: finalExecutionId,
    };

    const { data: insertedLead, error: insertError } = await supabase.from('leads').insert(leadPayload).select().single();
    if (insertError) {
      console.error('Lead insert failed:', insertError);
      return json(res, 500, { error: 'Failed to save lead' });
    }
    const leadId = insertedLead.id;
    await insertLeadActivity(leadId, 'LEAD_CREATED', { source: data.source, executionId: finalExecutionId });

    let clientResult = null, internalResult = null;
    let clientEmailError = null, internalEmailError = null;

    // 2. Client email
    try {
      clientResult = await resend.emails.send({
        from:    'EXECUTIA System <system@executia.io>',
        to:      [data.email],
        reply_to:'control@executia.io',
        subject: `EXECUTIA — Request received (${finalExecutionId})`,
        html:    buildClientEmailHtml(data, finalExecutionId),
      });
      await insertLeadActivity(leadId, 'CLIENT_EMAIL_SENT', { resend_id: clientResult?.data?.id || clientResult?.id || null, to: data.email });
    } catch (err) {
      clientEmailError = err;
      console.error('Client email failed:', err);
      await insertLeadActivity(leadId, 'CLIENT_EMAIL_FAILED', { error: err?.message, to: data.email });
    }

    // 3. Internal email
    try {
      internalResult = await resend.emails.send({
        from:     'EXECUTIA System <system@executia.io>',
        to:       [process.env.INTERNAL_NOTIFICATION_EMAIL || 'control@executia.io'],
        reply_to: data.email,
        subject:  `[${isExecution ? 'EXECUTION' : 'CONTACT'}] New lead: ${data.entity || data.company || data.name || data.email}`,
        html:     buildInternalEmailHtml(data, leadId, req, finalExecutionId),
      });
      await insertLeadActivity(leadId, 'INTERNAL_EMAIL_SENT', { resend_id: internalResult?.data?.id || internalResult?.id || null });
    } catch (err) {
      internalEmailError = err;
      console.error('Internal email failed:', err);
      await insertLeadActivity(leadId, 'INTERNAL_EMAIL_FAILED', { error: err?.message });
    }

    // 4. Update flags with REAL results
    const { error: updateError } = await supabase.from('leads').update({
      client_email_sent:   !!clientResult,
      internal_email_sent: !!internalResult,
      updated_at:          new Date().toISOString(),
    }).eq('id', leadId);
    if (updateError) console.error('Lead email status update failed:', updateError);

    return json(res, 200, {
      success: true,
      lead_id: leadId,
      execution_id: finalExecutionId,
      client_email_sent: !!clientResult,
      internal_email_sent: !!internalResult,
      client_email_error: clientEmailError?.message || null,
      internal_email_error: internalEmailError?.message || null,
    });

  } catch (err) {
    console.error('send-email fatal error:', err);
    return json(res, 500, { error: 'Internal server error', details: err?.message || null });
  }
}
