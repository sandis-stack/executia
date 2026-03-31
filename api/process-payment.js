// /api/process-payment.js
// EXECUTIA — Payment Processing Gate
// POST /api/process-payment
//
// FLOW:
//   Frontend → /api/process-payment → EXECUTIA /api/authorize-payment → IF APPROVED → Stripe
//   Stripe is NEVER called if EXECUTIA blocks. This is the mandatory gate.
//
// ENV VARIABLES (Vercel → Settings → Environment Variables):
//   STRIPE_SECRET_KEY    — sk_live_xxx or sk_test_xxx
//   EXECUTIA_API_KEY     — your EXECUTIA gate key
//   EXECUTIA_BASE_URL    — https://www.executia.io (or localhost for dev)

import Stripe from 'stripe';

const requests = {};
function rateLimit(ip) {
  const now = Date.now();
  if (!requests[ip]) requests[ip] = [];
  requests[ip] = requests[ip].filter(t => now - t < 60000);
  if (requests[ip].length >= 10) return false; // stricter — this moves money
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

  const { amount, timeline, complexity, description } = req.body;

  if (!amount || !timeline || !complexity) {
    return res.status(400).json({ error: 'MISSING_PARAMETERS' });
  }

  if (Number(amount) <= 0 || Number(amount) > 100000000) {
    return res.status(400).json({ error: 'INVALID_AMOUNT' });
  }

  // ─────────────────────────────────────────────────────────────
  // STEP 1: EXECUTIA AUTHORIZATION
  // Stripe is never reached if this returns authorized: false
  // ─────────────────────────────────────────────────────────────
  let execData;
  try {
    const baseUrl  = process.env.EXECUTIA_BASE_URL || 'https://www.executia.io';
    const execRes  = await fetch(`${baseUrl}/api/authorize-payment`, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-executia-key':  process.env.EXECUTIA_API_KEY || ''
      },
      body: JSON.stringify({ amount, timeline, complexity })
    });

    execData = await execRes.json();
  } catch (execErr) {
    // If EXECUTIA is unreachable — BLOCK by default. Never fail open.
    console.error('EXECUTIA unreachable:', execErr);
    return res.status(503).json({
      error:   'EXECUTIA_UNAVAILABLE',
      message: 'Payment blocked — authorization system unreachable. Fail-safe: BLOCKED.',
      blocked: true
    });
  }

  // ─────────────────────────────────────────────────────────────
  // STEP 2: DECISION
  // ─────────────────────────────────────────────────────────────
  if (!execData.authorized) {
    return res.status(403).json({
      error:            'PAYMENT_BLOCKED',
      reason:           execData.reason            || 'RISK_THRESHOLD_EXCEEDED',
      riskScore:        execData.riskScore          || null,
      capitalProtected: execData.lossExposure       || null,
      executionId:      execData.executionId        || null,
      message:          'Payment blocked by EXECUTIA. No funds were moved.'
    });
  }

  if (execData.holdPending) {
    return res.status(202).json({
      status:      'REQUIRES_REVIEW',
      executionId: execData.executionId,
      message:     'Payment held — operator review required before funds release.'
    });
  }

  // ─────────────────────────────────────────────────────────────
  // STEP 3: STRIPE — only reached if EXECUTIA authorized
  // ─────────────────────────────────────────────────────────────
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const paymentIntent = await stripe.paymentIntents.create({
      amount:      Math.round(Number(amount) * 100), // Stripe uses cents
      currency:    'eur',
      description: description || `EXECUTIA authorized payment — ${execData.executionId}`,
      metadata: {
        executionId: execData.executionId,
        riskScore:   String(execData.riskScore),
        authorizedBy: 'EXECUTIA'
      }
    });

    return res.status(200).json({
      success:       true,
      paymentId:     paymentIntent.id,
      clientSecret:  paymentIntent.client_secret,
      executionId:   execData.executionId,
      riskScore:     execData.riskScore,
      authorizedBy:  'EXECUTIA'
    });

  } catch (stripeErr) {
    console.error('Stripe error:', stripeErr);
    return res.status(502).json({
      error:   'PAYMENT_PROCESSOR_ERROR',
      message: stripeErr.message
    });
  }
}
