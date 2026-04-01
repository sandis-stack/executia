// /api/execute.js
// EXECUTIA — Full Execution Cycle Endpoint
// POST /api/execute
// Headers: X-EXECUTIA-KEY (optional for public demo, required for production)

import { evaluateExecution } from '../lib/riskEngine.js';

// In-memory rate limiting (resets on serverless cold start — upgrade to Upstash Redis for production)
const requests = {};
function rateLimit(ip) {
  const now = Date.now();
  if (!requests[ip]) requests[ip] = [];
  requests[ip] = requests[ip].filter(t => now - t < 60000);
  if (requests[ip].length >= 30) return false;
  requests[ip].push(now);
  return true;
}

// Convert trace array to Firestore arrayValue format
function traceToFirestore(trace) {
  return {
    arrayValue: {
      values: trace.map(t => ({
        mapValue: {
          fields: {
            step:  { stringValue: t.step },
            value: t.value !== null && t.value !== undefined
              ? { doubleValue: Number(t.value) }
              : { nullValue: null }
          }
        }
      }))
    }
  };
}

export default async function handler(req, res) {

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  // Rate limiting
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (!rateLimit(ip)) {
    return res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED' });
  }

  // Optional API key check (set EXECUTIA_API_KEY in Vercel env to enforce)
  const apiKey = process.env.EXECUTIA_API_KEY;
  if (apiKey) {
    const provided = req.headers['x-executia-key'];
    if (provided !== apiKey) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }
  }

  const { budget, timeline, complexity } = req.body;

  if (!budget || !timeline || !complexity) {
    return res.status(400).json({ error: 'MISSING_PARAMETERS' });
  }

  const result = evaluateExecution({
    budget:     Number(budget),
    timeline:   Number(timeline),
    complexity: Number(complexity)
  });

  if (result.error) {
    return res.status(400).json(result);
  }

  const executionId = 'EX-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const createdAt   = new Date().toISOString();

  // State lifecycle: CREATED → VALIDATED → AUTHORIZED | BLOCKED | PENDING_REVIEW
  const state =
    result.status === 'BLOCKED'         ? 'BLOCKED' :
    result.status === 'REQUIRES_REVIEW' ? 'PENDING_REVIEW' :
    'AUTHORIZED';

  const record = {
    executionId,
    status:       result.status,
    state,
    riskScore:    result.riskScore,
    lossExposure: result.lossExposure,
    trace:        result.trace,
    budget:       Number(budget),
    timeline:     Number(timeline),
    complexity:   Number(complexity),
    lifecycle:    ['CREATED', 'VALIDATED', state],
    createdAt
  };

  // Persist to Firestore REST API
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'executia-system';
    const fbApiKey  = process.env.FIREBASE_API_KEY    || '';

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/execution_registry?key=${fbApiKey}`;

    const fields = {
      executionId:  { stringValue: executionId },
      status:       { stringValue: result.status },
      state:        { stringValue: state },
      riskScore:    { doubleValue: result.riskScore },
      lossExposure: { doubleValue: result.lossExposure },
      budget:       { doubleValue: Number(budget) },
      timeline:     { doubleValue: Number(timeline) },
      complexity:   { doubleValue: Number(complexity) },
      createdAt:    { stringValue: createdAt },
      lifecycle:    { arrayValue: { values: record.lifecycle.map(s => ({ stringValue: s })) } },
      trace:        traceToFirestore(result.trace)
    };

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
  } catch (dbErr) {
    console.warn('Firestore persist failed:', dbErr);
  }

  return res.status(200).json(record);
}
