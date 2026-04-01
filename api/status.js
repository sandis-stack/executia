// /api/status.js
// EXECUTIA — Execution Status Lookup
// GET /api/status?id=EX-XXXXXX

function parseFirestoreValue(v) {
  if (!v) return null;
  if (v.stringValue  !== undefined) return v.stringValue;
  if (v.doubleValue  !== undefined) return v.doubleValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.nullValue    !== undefined) return null;
  if (v.arrayValue?.values) {
    return v.arrayValue.values.map(item => {
      if (item.mapValue?.fields) {
        const obj = {};
        for (const [k, fv] of Object.entries(item.mapValue.fields)) {
          obj[k] = parseFirestoreValue(fv);
        }
        return obj;
      }
      return parseFirestoreValue(item);
    });
  }
  if (v.mapValue?.fields) {
    const obj = {};
    for (const [k, fv] of Object.entries(v.mapValue.fields)) {
      obj[k] = parseFirestoreValue(fv);
    }
    return obj;
  }
  return null;
}

export default async function handler(req, res) {

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const { id } = req.query;

  if (!id || id.length < 5) {
    return res.status(400).json({ error: 'INVALID_EXECUTION_ID' });
  }

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'executia-system';
    const fbApiKey  = process.env.FIREBASE_API_KEY    || '';

    const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${fbApiKey}`;

    const queryBody = {
      structuredQuery: {
        from:  [{ collectionId: 'execution_registry' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'executionId' },
            op:    'EQUAL',
            value: { stringValue: id.toUpperCase() }
          }
        },
        limit: 1
      }
    };

    const response = await fetch(queryUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(queryBody)
    });

    const results = await response.json();

    if (!results[0]?.document?.fields) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }

    const fields = results[0].document.fields;
    const record = {};
    for (const [k, v] of Object.entries(fields)) {
      record[k] = parseFirestoreValue(v);
    }

    return res.status(200).json(record);

  } catch (err) {
    console.error('Status lookup error:', err);
    return res.status(500).json({ error: 'SYSTEM_ERROR' });
  }
}
