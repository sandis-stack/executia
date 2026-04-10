// /api/log-event.js
// EXECUTIA — Minimal analytics event logger
// POST /api/log-event

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const body = req.body || {};
    console.log('EVENT:', JSON.stringify({
      event:     body.event || '—',
      ts:        body.ts    || new Date().toISOString(),
      ip:        req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'
    }));
  } catch(e) {
    // Non-blocking — never fail on logging
  }

  return res.status(200).json({ ok: true });
}
