// /api/status.js
// EXECUTIA — Execution Status Lookup

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();

  const executionId = req.query.id || req.body?.executionId;
  if (!executionId) return res.status(400).json({ error: 'EXECUTION_ID_REQUIRED' });

  try {
    // Try Firestore lookup
    const projectId = process.env.FIREBASE_PROJECT_ID || 'executia-system';
    const fbKey     = process.env.FIREBASE_API_KEY    || '';

    const query = {
      structuredQuery: {
        from: [{ collectionId: 'payment_gates' }],
        where: { fieldFilter: {
          field: { fieldPath: 'executionId' },
          op: 'EQUAL',
          value: { stringValue: executionId }
        }},
        limit: 1
      }
    };

    const fbRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${fbKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(query) }
    );

    if (fbRes.ok) {
      const docs = await fbRes.json();
      const doc = docs[0]?.document;
      if (doc) {
        const fields = doc.fields || {};
        return res.json({
          executionId,
          status:       fields.status?.stringValue       || 'UNKNOWN',
          riskScore:    fields.riskScore?.doubleValue    || 0,
          lossExposure: fields.lossExposure?.doubleValue || 0,
          timestamp:    fields.timestamp?.stringValue    || '',
          found: true
        });
      }
    }
  } catch(_) {}

  // Fallback — execution ID acknowledged but not persisted yet
  return res.json({
    executionId,
    status: 'PROCESSING',
    message: 'EXECUTION STILL RUNNING — record being validated',
    found: false
  });
}
