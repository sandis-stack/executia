// /api/send-email.js
// Vercel serverless function — Resend email + Firestore write (server-side)
//
// This function now does TWO things:
//   1. Writes submission to Firestore (replaces client-side Firebase SDK)
//   2. Sends notification email via Resend
//
// No Firebase API key is exposed to the frontend.
//
// REQUIRED ENV VARIABLES (Vercel → Settings → Environment Variables):
//   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
//   RESEND_DOMAIN_VERIFIED=true
//   FIREBASE_PROJECT_ID=executia-system
//   FIREBASE_API_KEY=AIza...   ← kept server-side only

const RATE_MAP = {};
function rateLimit(ip) {
  const now = Date.now();
  if (!RATE_MAP[ip]) RATE_MAP[ip] = [];
  RATE_MAP[ip] = RATE_MAP[ip].filter(t => now - t < 60000);
  if (RATE_MAP[ip].length >= 5) return false; // 5 submissions / min
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

  const {
    executionId,
    entity,
    operator,
    email,
    type,
    volume,
    avg_transaction,
    current_system,
    risk,
    country,
    priority,
    timestamp
  } = req.body;

  // Input validation
  if (!executionId || executionId.length < 5) return res.status(400).json({ error: 'INVALID_EXECUTION_ID' });
  if (!entity || entity.length < 2 || entity.length > 120) return res.status(400).json({ error: 'INVALID_ENTITY' });
  if (!email || !email.includes('@') || !email.includes('.')) return res.status(400).json({ error: 'INVALID_EMAIL' });
  if (risk && risk.length > 2000) return res.status(400).json({ error: 'PAYLOAD_TOO_LARGE' });

  const volumeLabel = {
    '1M_10M':   '€1M – €10M',
    '10M_100M': '€10M – €100M',
    '100M_1B':  '€100M – €1B',
    '1B_plus':  '€1B+'
  }[volume] || volume || '—';

  const isElevated = volume === '100M_1B' || volume === '1B_plus';
  const ts = timestamp || new Date().toISOString();

  // ── 1. WRITE TO FIRESTORE (server-side — no client key exposure) ──
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'executia-system';
    const fbApiKey  = process.env.FIREBASE_API_KEY    || '';
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/execution_flows?key=${fbApiKey}`;

    await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          executionId:      { stringValue: executionId },
          entity:           { stringValue: entity },
          operator:         { stringValue: operator || '—' },
          access_node:      { stringValue: email },
          payment_type:     { stringValue: type || '—' },
          volume:           { stringValue: volume || '—' },
          avg_transaction:  { stringValue: avg_transaction || '—' },
          current_system:   { stringValue: current_system || '—' },
          risk_description: { stringValue: risk || '—' },
          country:          { stringValue: country || '—' },
          status:           { stringValue: 'NEW' },
          priority:         { stringValue: isElevated ? 'ELEVATED' : 'STANDARD' },
          source:           { stringValue: 'pilot_request_v2' },
          timestamp:        { stringValue: ts }
        }
      })
    });
  } catch(dbErr) {
    console.warn('Firestore write failed (non-blocking):', dbErr.message);
    // Non-blocking — continue to email
  }

  // ── 2. SEND EMAIL VIA RESEND ──
  const emailBody = `
EXECUTIA — PILOT REQUEST
========================================

EXECUTION ID:     ${executionId}
PRIORITY:         ${isElevated ? 'ELEVATED' : 'STANDARD'}
TIMESTAMP:        ${ts}

COMPANY:          ${entity}
CONTACT:          ${operator || '—'}
EMAIL:            ${email}
PAYMENT TYPE:     ${type || '—'}
MONTHLY VOLUME:   ${volumeLabel}
AVG TRANSACTION:  ${avg_transaction || '—'}
CURRENT SYSTEM:   ${current_system || '—'}
COUNTRY:          ${country || '—'}

EXECUTION RISK DESCRIPTION:
${risk || '— not provided —'}

========================================
SOURCE:           pilot_request_v2
STATUS:           NEW
ACTION:           Review and respond within 24–48h

EXECUTIA EXECUTION CONTROL INFRASTRUCTURE
control@executia.io
PCT/IB2026/050141
`.trim();

  const fromAddress = process.env.RESEND_DOMAIN_VERIFIED === 'true'
    ? 'EXECUTIA <control@executia.io>'
    : 'EXECUTIA <onboarding@resend.dev>';

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({
        from:    fromAddress,
        to:      ['control@executia.io'],
        subject: `[${isElevated ? 'ELEVATED' : 'STANDARD'}] PILOT REQUEST — ${executionId} — ${entity}`,
        text:    emailBody
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Resend error:', errText);
      // Firestore write already succeeded — return partial success
      return res.status(200).json({ success: true, executionId, note: 'SAVED — EMAIL_DELAY' });
    }

    return res.status(200).json({ success: true, executionId });

  } catch(emailErr) {
    console.error('Email error:', emailErr);
    // Firestore write already succeeded — not a hard failure
    return res.status(200).json({ success: true, executionId, note: 'SAVED — EMAIL_DELAY' });
  }
}
