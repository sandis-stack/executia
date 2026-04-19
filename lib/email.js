// /lib/email.js
// EXECUTIA — Shared email helper via Resend

export async function sendEmail({ to, subject, text, html, replyTo = 'control@executia.io' }) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn('EMAIL: RESEND_API_KEY not set');
    return { ok: false, reason: 'no_api_key' };
  }

  try {
    const payload = {
      from: 'EXECUTIA System <control@mail.executia.io>',
      to:   Array.isArray(to) ? to : [to],
      subject,
      text
    };

    if (html) payload.html = html;
    payload.reply_to = replyTo || 'control@executia.io';

    const r = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) console.warn('EMAIL: Resend rejected', JSON.stringify(data));
    return { ok: r.ok, data };
  } catch (e) {
    console.error('EMAIL: fetch error', e.message);
    return { ok: false, reason: e.message };
  }
}
