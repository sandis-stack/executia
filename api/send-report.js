// /api/send-report.js
// EXECUTIA — Execution Report + Lead Capture

const RATE_MAP = {};
function rateLimit(ip) {
  const now = Date.now();
  if (!RATE_MAP[ip]) RATE_MAP[ip] = [];
  RATE_MAP[ip] = RATE_MAP[ip].filter(t => now - t < 60000);
  if (RATE_MAP[ip].length >= 10) return false;
  RATE_MAP[ip].push(now);
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (!rateLimit(ip)) return res.status(429).json({ error: 'RATE_LIMIT' });

  const { email, executionId, lossExposure, riskScore, status, totalEvents, riskLevel } = req.body;

  const CONSUMER_DOMAINS = ['gmail','yahoo','hotmail','outlook.com','icloud','mail.ru'];
  const emailDomain = email.split('@')[1] || '';
  const isConsumer  = CONSUMER_DOMAINS.some(d => emailDomain.includes(d));
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'INVALID_EMAIL' });
  if (isConsumer) return res.status(400).json({ error: 'BUSINESS_EMAIL_REQUIRED' });

  const value   = Math.abs(Number(lossExposure) || 0);
  const sid     = executionId || 'EX-UNKNOWN';
  const risk    = riskLevel || (riskScore > 70 ? 'HIGH' : riskScore > 40 ? 'MEDIUM' : 'LOW');
  const ts      = new Date().toISOString().replace('T',' ').substring(0,19);

  // ── EMAIL HTML ──
  const html = `
<div style="font-family:'Courier New',monospace;background:#0F172A;color:#E5E7EB;padding:32px;max-width:560px;">
  <div style="font-size:10px;letter-spacing:.2em;color:#6B7280;margin-bottom:16px;">EXECUTIA EXECUTION REPORT</div>
  <div style="font-size:22px;font-weight:800;color:#DC2626;margin-bottom:8px;">EXECUTION BLOCKED</div>
  <div style="font-size:28px;font-weight:900;color:#DC2626;margin-bottom:24px;">€${value.toLocaleString()} AT RISK</div>
  <div style="border-top:1px solid rgba(255,255,255,.08);padding-top:16px;margin-bottom:16px;">
    <div style="font-size:10px;color:#6B7280;margin-bottom:12px;">SESSION DETAILS</div>
    <div style="font-size:11px;margin-bottom:6px;">SESSION ID: <span style="color:#3B82F6;">${sid}</span></div>
    <div style="font-size:11px;margin-bottom:6px;">RISK LEVEL: <span style="color:#DC2626;">${risk}</span></div>
    <div style="font-size:11px;margin-bottom:6px;">EVENTS PROCESSED: ${totalEvents || '—'}</div>
    <div style="font-size:11px;margin-bottom:6px;">TIMESTAMP: ${ts}</div>
  </div>
  <div style="border-top:1px solid rgba(255,255,255,.08);padding:16px 0;margin-bottom:24px;">
    <p style="font-size:12px;color:#9CA3AF;line-height:1.8;">
      This execution would have continued without control.<br>
      EXECUTIA prevented a financial loss.<br><br>
      Without EXECUTIA — this amount leaves your account.<br>
      <strong style="color:#DC2626;">This is not a simulation.</strong>
    </p>
  </div>
  <a href="https://www.executia.io/request" style="display:inline-block;background:#DC2626;color:#fff;font-family:'Courier New',monospace;font-size:11px;font-weight:700;letter-spacing:.12em;padding:14px 28px;text-decoration:none;">
    → REQUEST SYSTEM ACCESS
  </a>
  <div style="margin-top:24px;font-size:9px;color:#4B5563;">
    EXECUTIA EXECUTION CONTROL INFRASTRUCTURE &nbsp;·&nbsp; control@executia.io
  </div>
</div>`;

  try {
    // ── SAVE LEAD TO FIRESTORE ──
    try {
      const projectId = process.env.FIREBASE_PROJECT_ID || 'executia-system';
      const fbKey     = process.env.FIREBASE_API_KEY    || '';
      await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/leads?key=${fbKey}`,
        {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: {
            email:        { stringValue: email },
            executionId:   { stringValue: sid },
            lossExposure:  { doubleValue: value },
            riskScore:     { doubleValue: Number(riskScore) || 0 },
            riskLevel:     { stringValue: risk },
            source:        { stringValue: 'execution_session' },
            stage:         { stringValue: 'report_requested' },
            valueSegment:  { stringValue: value > 100000 ? 'HIGH' : value > 20000 ? 'MEDIUM' : 'LOW' },
            status:        { stringValue: 'new' },
            timestamp:     { stringValue: ts }
          }})
        }
      );
    } catch(dbErr) { console.warn('Firestore lead save failed:', dbErr.message); }

    // ── SEND EMAIL ──
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:     'EXECUTIA <system@mail.executia.io>',
        to:       [email],
        bcc:      ['control@executia.io'],
        subject:  `EXECUTION BLOCKED — €${value.toLocaleString()} AT RISK — ${sid}`,
        html,
        reply_to: 'control@executia.io'
      })
    });

    if (!emailRes.ok) {
      console.error('Email send failed:', await emailRes.text());
      return res.status(200).json({ ok: true, note: 'lead_saved_email_queued' });
    }

    // 24h follow-up — non-blocking, fire-and-forget
    setTimeout(async function() {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'EXECUTIA <system@mail.executia.io>',
            to: [email],
            reply_to: 'control@executia.io',
            subject: 'This would have been executed (' + sid + ')',
            html: '<div style="font-family:Courier New,monospace;background:#0F172A;color:#E5E7EB;padding:32px;max-width:560px;"><div style="font-size:9px;letter-spacing:.2em;color:#6B7280;margin-bottom:16px;">EXECUTIA FOLLOW-UP</div><p style="font-size:13px;line-height:1.8;margin-bottom:20px;">Yesterday, your execution was analyzed.<br><br>Without EXECUTIA control:<br><strong style="color:#DC2626;">→ €' + value.toLocaleString() + ' would have been executed</strong><br>→ No audit trail<br>→ No control<br><br>This is how most companies operate.<br>Most never know what was lost.</p><a href="https://www.executia.io/request" style="display:inline-block;background:#DC2626;color:#fff;font-family:Courier New,monospace;font-size:11px;font-weight:700;letter-spacing:.1em;padding:14px 24px;text-decoration:none;">→ ACTIVATE CONTROL</a><div style="margin-top:24px;font-size:9px;color:#4B5563;">EXECUTIA &middot; control@executia.io</div></div>'
          })
        });
      } catch(_) {}
    }, 86400000); // 24h

    return res.status(200).json({ ok: true, executionId: sid });

  } catch(e) {
    console.error('SEND REPORT ERROR:', e);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
}
