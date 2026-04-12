// /api/send-email.js
// EXECUTIA — Execution Decision Email
// Sends SYSTEM NOTICE (not marketing email)

const RATE_MAP = {};
function rateLimit(ip) {
  const now = Date.now();
  if (!RATE_MAP[ip]) RATE_MAP[ip] = [];
  RATE_MAP[ip] = RATE_MAP[ip].filter(t => now - t < 60000);
  if (RATE_MAP[ip].length >= 5) return false;
  RATE_MAP[ip].push(now);
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (!rateLimit(ip)) {
    return res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED' });
  }

  try {
    const {
      executionId, email, status, lossExposure, riskScore, budget, timestamp,
      entity, operator, type, volume, avg_transaction, current_system, risk, country
    } = req.body;

    if (!executionId || executionId.length < 5)
      return res.status(400).json({ error: 'INVALID_EXECUTION_ID' });
    if (!email || !email.includes('@') || !email.includes('.'))
      return res.status(400).json({ error: 'INVALID_EMAIL' });

    const ts = timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19);
    const isRequest = !!entity;

    const statusLabel =
      status === 'APPROVED'        ? 'APPROVED' :
      status === 'REQUIRES_REVIEW' ? 'REQUIRES REVIEW' : 'BLOCKED';

    const exposure = lossExposure ? `\u20ac${Number(lossExposure).toLocaleString()}` : '\u2014';

    const volumeLabel = {
      '1M_10M':'€1M – €10M','10M_100M':'€10M – €100M','100M_1B':'€100M – €1B','1B_plus':'€1B+'
    }[volume] || volume || '—';

    const isElevated = volume === '100M_1B' || volume === '1B_plus';

    const text = isRequest ? [
      'EXECUTIA \u2014 PILOT REQUEST RECEIVED',
      '========================================',
      '',
      `EXECUTION ID:     ${executionId}`,
      `PRIORITY:         ${isElevated ? 'ELEVATED' : 'STANDARD'}`,
      `TIMESTAMP:        ${ts}`,
      '',
      `COMPANY:          ${entity || '\u2014'}`,
      `CONTACT:          ${operator || '\u2014'}`,
      `EMAIL:            ${email}`,
      `PAYMENT TYPE:     ${type || '\u2014'}`,
      `MONTHLY VOLUME:   ${volumeLabel}`,
      `AVG TRANSACTION:  ${avg_transaction || '\u2014'}`,
      `CURRENT SYSTEM:   ${current_system || '\u2014'}`,
      `COUNTRY:          ${country || '\u2014'}`,
      '',
      'EXECUTION RISK DESCRIPTION:',
      risk || '\u2014 not provided \u2014',
      '',
      '========================================',
      'STATUS:           NEW',
      'ACTION:           Review and respond within 24\u201348h',
      '',
      'SYSTEM STATUS:    ENFORCING EXECUTION CONTROL',
      'OVERRIDE:         DISABLED',
      '',
      'This decision is permanently recorded.',
      '',
      'EXECUTIA EXECUTION CONTROL INFRASTRUCTURE',
      'contact@executia.io | PCT/IB2026/050141',
    ].join('\n') : [
      'EXECUTION DECISION NOTICE',
      'SYSTEM: EXECUTIA',
      `STATUS: ${statusLabel}`,
      '',
      `Execution ID: ${executionId}`,
      `Timestamp:    ${ts}`,
      '',
      '---',
      '',
      'DECISION:',
      status === 'APPROVED'
        ? 'Execution approved. Risk within acceptable threshold.'
        : status === 'REQUIRES_REVIEW'
        ? 'Execution held for operator review.'
        : 'Execution blocked due to risk threshold exceeded.',
      '',
      `Financial exposure: ${exposure}`,
      `Risk score:         ${riskScore || '\u2014'}%`,
      `FINANCIAL EXPOSURE:  ${exposure}`,
      (budget && lossExposure ? `Impact:              ${Math.round((Number(lossExposure) / Number(budget)) * 100)}% of total budget` : ''),
      (budget && lossExposure ? `Impact on project:  ${Math.round((Number(lossExposure) / Number(budget)) * 100)}% of total budget at risk` : ''),
      '',
      '---',
      '',
      'THIS WOULD HAVE BEEN APPROVED IN YOUR CURRENT SYSTEM.',
      '',
      'It has now been evaluated and controlled by EXECUTIA.',
      '',
      '---',
      '',
      'NEXT STEP:',
      'Submit full project parameters for complete validation:',
      'https://www.executia.io/request',
      '',
      'Forward this decision to your financial controller.',
      '',
      'If this decision had not been intercepted,',
      'the financial impact would already be irreversible.',
      '',
      '---',
      '',
      'SYSTEM STATUS:    ENFORCING EXECUTION CONTROL',
      'OVERRIDE:         DISABLED',
      '',
      'This decision is permanently recorded.',
      '',
      'EXECUTIA EXECUTION CONTROL INFRASTRUCTURE',
      'contact@executia.io | PCT/IB2026/050141',
    ].join('\n');

    // Persist to Firestore
    try {
      const projectId = process.env.FIREBASE_PROJECT_ID || 'executia-system';
      const fbApiKey  = process.env.FIREBASE_API_KEY    || '';
      const collection = isRequest ? 'execution_flows' : 'decision_notices';
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}?key=${fbApiKey}`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: {
          executionId:  { stringValue: executionId },
          email:        { stringValue: email },
          status:       { stringValue: status || 'REQUIRES_REVIEW' },
          lossExposure: { doubleValue: Number(lossExposure || 0) },
          riskScore:    { doubleValue: Number(riskScore || 0) },
          entity:       { stringValue: entity || '—' },
          source:       { stringValue: isRequest ? 'pilot_request_v2' : 'decision_notice' },
          priority:     { stringValue: isElevated ? 'ELEVATED' : 'STANDARD' },
          timestamp:    { stringValue: ts }
        }})
      });
    } catch(dbErr) {
      console.warn('Firestore write failed (non-blocking):', dbErr.message);
    }

    // Send via Resend
    const fromAddress = process.env.RESEND_DOMAIN_VERIFIED === 'true'
      ? 'EXECUTIA <system@executia.io>'
      : 'EXECUTIA <onboarding@resend.dev>';

    const subject = isRequest
      ? `[${isElevated ? 'ELEVATED' : 'STANDARD'}] PILOT REQUEST — ${executionId} — ${entity || email}`
      : `EXECUTION DECISION — ${executionId} — ${statusLabel}`;

    const toList = isRequest
      ? ['control@executia.io']
      : [email, 'control@executia.io'];

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({ from: fromAddress, to: toList, subject, text, reply_to: 'control@executia.io' })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('EMAIL ERROR:', err);
      return res.status(200).json({ ok: true, executionId, note: 'SAVED_EMAIL_DELAYED' });
    }

    return res.status(200).json({ ok: true, executionId });

  } catch(e) {
    console.error('SEND EMAIL ERROR:', e);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
}
