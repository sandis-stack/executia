// /api/authorize-payment.js
// EXECUTIA — Payment Authorization Gate
// POST /api/authorize-payment
// This is the core demo endpoint — it intercepts execution before payment proceeds

import { evaluateExecution } from '../lib/riskEngine.js';

const requests = {};
function rateLimit(ip) {
  const now = Date.now();
  if (!requests[ip]) requests[ip] = [];
  requests[ip] = requests[ip].filter(t => now - t < 60000);
  if (requests[ip].length >= 30) return false;
  requests[ip].push(now);
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

  // API key check (optional — set EXECUTIA_API_KEY in Vercel env to enforce)
  const apiKey = process.env.EXECUTIA_API_KEY;
  if (apiKey) {
    const provided = req.headers['x-executia-key'];
    if (provided !== apiKey) {
      return res.status(403).json({ error: 'UNAUTHORIZED' });
    }
  }

  const { amount, timeline, complexity } = req.body;

  if (!amount || !timeline || !complexity) {
    return res.status(400).json({ error: 'MISSING_PARAMETERS' });
  }

  const result = evaluateExecution({
    budget:     Number(amount),
    timeline:   Number(timeline),
    complexity: Number(complexity)
  });

  if (result.error) {
    return res.status(400).json({ authorized: false, reason: result.error });
  }

  const executionId = 'EX-' + Math.random().toString(36).substring(2, 8).toUpperCase();

  // Map status to payment gate decision
  const authorized  = result.status === 'APPROVED';
  const holdPending = result.status === 'REQUIRES_REVIEW';

  const response = {
    authorized,
    holdPending,
    executionId,
    status:       result.status,
    riskScore:    result.riskScore,
    lossExposure: result.lossExposure,
    reason: authorized   ? 'VALIDATION_PASSED'
          : holdPending  ? 'REQUIRES_OPERATOR_REVIEW'
          : 'RISK_THRESHOLD_EXCEEDED',
    trace:    result.trace,
    timestamp: new Date().toISOString()
  };

  // Persist to Firestore
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'executia-system';
    const fbApiKey  = process.env.FIREBASE_API_KEY    || '';
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/payment_gates?key=${fbApiKey}`;

    const traceFirestore = {
      arrayValue: {
        values: result.trace.map(t => ({
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

    await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          executionId:  { stringValue: executionId },
          authorized:   { booleanValue: authorized },
          status:       { stringValue: result.status },
          riskScore:    { doubleValue: result.riskScore },
          lossExposure: { doubleValue: result.lossExposure },
          amount:       { doubleValue: Number(amount) },
          reason:       { stringValue: response.reason },
          timestamp:    { stringValue: response.timestamp },
          trace:        traceFirestore
        }
      })
    });
  } catch(e) {
    console.warn('Firestore persist failed:', e);
  }

  return res.status(200).json(response);
}
