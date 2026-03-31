// /api/stripe-webhook.js
// EXECUTIA — Stripe Webhook Verification
// POST /api/stripe-webhook
//
// PURPOSE: Second enforcement layer.
// Even if a payment intent is created directly via Stripe (bypassing process-payment),
// this webhook intercepts it and cancels any payment not verified by EXECUTIA.
//
// SETUP (Stripe Dashboard → Webhooks → Add endpoint):
//   URL:    https://www.executia.io/api/stripe-webhook
//   Events: payment_intent.created, payment_intent.payment_failed
//
// ENV VARIABLES:
//   STRIPE_SECRET_KEY        — sk_live_xxx
//   STRIPE_WEBHOOK_SECRET    — whsec_xxx (from Stripe webhook dashboard)
//   EXECUTIA_API_KEY         — your EXECUTIA gate key

import Stripe from 'stripe';

export const config = { api: { bodyParser: false } }; // Required for webhook signature verification

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end',  () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {

  if (req.method !== 'POST') {
    return res.status(405).end('METHOD_NOT_ALLOWED');
  }

  const stripe    = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig       = req.headers['stripe-signature'];
  const rawBody   = await getRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).end(`Webhook Error: ${err.message}`);
  }

  // ─────────────────────────────────────────────────────────────
  // ENFORCEMENT: Check every new payment intent
  // ─────────────────────────────────────────────────────────────
  if (event.type === 'payment_intent.created') {
    const intent   = event.data.object;
    const execId   = intent.metadata?.executionId;
    const authBy   = intent.metadata?.authorizedBy;

    // If payment was not created through EXECUTIA — cancel it
    if (authBy !== 'EXECUTIA' || !execId) {
      try {
        await stripe.paymentIntents.cancel(intent.id);
        console.warn(`EXECUTIA WEBHOOK: Cancelled unauthorized payment ${intent.id}. No EXECUTIA authorization found.`);
        return res.status(200).json({ action: 'CANCELLED', reason: 'NO_EXECUTIA_AUTHORIZATION' });
      } catch (cancelErr) {
        console.error('Failed to cancel payment intent:', cancelErr);
        return res.status(500).json({ error: 'CANCEL_FAILED' });
      }
    }

    // Payment is EXECUTIA-authorized — log and allow
    console.log(`EXECUTIA WEBHOOK: Payment ${intent.id} authorized — executionId: ${execId}`);
    return res.status(200).json({ action: 'VERIFIED', executionId: execId });
  }

  // Handle other event types
  res.status(200).json({ received: true });
}
