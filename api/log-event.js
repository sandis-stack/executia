// /api/log-event.js
// EXECUTIA — Structured Event Logger
// POST /api/log-event

const VALID_EVENTS = new Set([
  'page_load', 'entry_loaded', 'demo_started', 'demo_auto_started',
  'validation_run', 'payment_attempt',
  'decision_approved', 'decision_blocked', 'decision_review',
  'request_submitted', 'financial_loaded', 'dashboard_live',
  'demo_result_shown', 'execution_opened'
]);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const body   = req.body || {};
    const event  = body.event  || 'unknown';
    const source = body.source || 'web';
    const ts     = body.ts     || new Date().toISOString();
    const ip     = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';

    const structured = {
      event,
      source,
      timestamp:  ts,
      ip:         ip.split(',')[0].trim(),
      valid:      VALID_EVENTS.has(event),
      meta:       body.meta || {}
    };

    console.log('EVENT:', JSON.stringify(structured));

    // Persist to Firestore (non-blocking)
    try {
      const projectId = process.env.FIREBASE_PROJECT_ID || 'executia-system';
      const fbApiKey  = process.env.FIREBASE_API_KEY    || '';
      const url = \`https://firestore.googleapis.com/v1/projects/\${projectId}/databases/(default)/documents/event_logs?key=\${fbApiKey}\`;

      await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            event:     { stringValue: event },
            source:    { stringValue: source },
            timestamp: { stringValue: ts },
            valid:     { booleanValue: VALID_EVENTS.has(event) }
          }
        })
      });
    } catch(dbErr) {
      // Non-blocking — never fail on logging
    }

    return res.status(200).json({ ok: true, event, valid: VALID_EVENTS.has(event) });

  } catch(e) {
    console.error('LOG EVENT ERROR:', e);
    return res.status(200).json({ ok: true }); // never block on analytics
  }
}
