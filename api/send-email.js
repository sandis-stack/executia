// /api/send-email.js
// Vercel serverless function — Resend email trigger
//
// REQUIRED ENV VARIABLES (Vercel → Settings → Environment Variables):
//   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
//   RESEND_DOMAIN_VERIFIED=true   ← set after verifying executia.io in Resend dashboard
//
// RESEND DOMAIN SETUP:
//   1. Resend dashboard → Domains → Add Domain → executia.io
//   2. Add DNS records shown (MX, TXT, DKIM)
//   3. Wait for verification → set RESEND_DOMAIN_VERIFIED=true in Vercel
//
// FIRESTORE RULES (Firebase Console → Firestore → Rules → Publish):
// ─────────────────────────────────────────────────────────────────
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /execution_flows/{doc} {
//       allow write: if true;
//       allow read:  if false;
//     }
//   }
// }
// ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Method guard
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const {
    executionId,
    entity,
    operator,
    email,
    type,
    volume,
    risk,
    country,
    priority,
    timestamp
  } = req.body;

  // Input guard — rate limiting layer 1
  if (!executionId || executionId.length < 5) {
    return res.status(400).json({ error: 'INVALID_EXECUTION_ID' });
  }
  if (!entity || entity.length < 2 || entity.length > 120) {
    return res.status(400).json({ error: 'INVALID_ENTITY' });
  }
  if (!email || !email.includes('@') || !email.includes('.')) {
    return res.status(400).json({ error: 'INVALID_EMAIL' });
  }
  if (risk && risk.length > 2000) {
    return res.status(400).json({ error: 'PAYLOAD_TOO_LARGE' });
  }

  const volumeLabel = {
    '1M_10M':   '€1M – €10M',
    '10M_100M': '€10M – €100M',
    '100M_1B':  '€100M – €1B',
    '1B_plus':  '€1B+'
  }[volume] || volume;

  const emailBody = `
EXECUTIA — PILOT REQUEST
========================================

EXECUTION ID:     ${executionId}
PRIORITY:         ${priority}
TIMESTAMP:        ${timestamp}

COMPANY:          ${entity}
CONTACT:          ${operator || '—'}
EMAIL:            ${email}
PAYMENT TYPE:     ${type}
MONTHLY VOLUME:   ${volumeLabel}
AVG TRANSACTION:  ${req.body.avg_transaction || '—'}
CURRENT SYSTEM:   ${req.body.current_system || '—'}
COUNTRY:          ${country || '—'}

EXECUTION RISK:
${risk || '— not provided —'}

========================================
SOURCE:           pilot_request
STATUS:           NEW
ACTION:           Review and respond within 24–48h

EXECUTIA PAYMENT CONTROL INFRASTRUCTURE
control@executia.io
PCT/IB2026/050141
`.trim();

  // control@executia.io if domain verified, fallback to onboarding@resend.dev
  const fromAddress = process.env.RESEND_DOMAIN_VERIFIED === 'true'
    ? 'EXECUTIA <control@executia.io>'
    : 'EXECUTIA <onboarding@resend.dev>';

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from:    fromAddress,
        to:      ['control@executia.io'],
        subject: `[${priority}] PILOT REQUEST — ${executionId} — ${entity}`,
        text:    emailBody
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Resend error:', errText);
      return res.status(502).json({ error: 'EMAIL_SEND_FAILED' });
    }

    return res.status(200).json({ success: true, executionId });

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'SYSTEM_ERROR' });
  }
}
