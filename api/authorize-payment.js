// /api/authorize-payment.js
// EXECUTIA — Payment Authorization Gate
// POST /api/authorize-payment
// Supabase-backed execution persistence

import { createClient } from '@supabase/supabase-js';
import { evaluateExecution } from '../lib/riskEngine.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const requests = {};

function rateLimit(ip) {
  const now = Date.now();
  if (!requests[ip]) requests[ip] = [];
  requests[ip] = requests[ip].filter((t) => now - t < 60000);
  if (requests[ip].length >= 30) return false;
  requests[ip].push(now);
  return true;
}

function badRequest(res, error, extra = {}) {
  return res.status(400).json({ error, ...extra });
}

function serverError(res, error, extra = {}) {
  return res.status(500).json({ error, ...extra });
}

function buildExecutionId() {
  const ts = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  try {
    const cryptoObj = globalThis.crypto;
    if (cryptoObj?.randomUUID) {
      return `EX-${ts}-${cryptoObj.randomUUID().slice(0, 4).toUpperCase()}`;
    }
  } catch (_) {}
  return `EX-${ts}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

function sanitizeText(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (!rateLimit(ip)) return res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED' });

  const apiKey = process.env.EXECUTIA_API_KEY;
  if (apiKey) {
    const provided = req.headers['x-executia-key'];
    if (provided !== apiKey) return res.status(403).json({ error: 'UNAUTHORIZED' });
  }

  const {
    budget, timeline, complexity,
    entity, country, paymentType, contractType, supplierRisk, complianceType,
  } = req.body || {};

  if (!budget || !timeline || !complexity) return badRequest(res, 'MISSING_PARAMETERS');

  const numericBudget     = Number(budget);
  const numericTimeline   = Number(timeline);
  const numericComplexity = Number(complexity);

  if (Number.isNaN(numericBudget) || Number.isNaN(numericTimeline) || Number.isNaN(numericComplexity)) {
    return badRequest(res, 'INVALID_NUMERIC_PARAMETERS');
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return serverError(res, 'SUPABASE_ENV_MISSING');
  }

  const result = evaluateExecution({ budget: numericBudget, timeline: numericTimeline, complexity: numericComplexity });

  if (result?.error) return badRequest(res, 'VALIDATION_FAILED', { authorized: false, reason: result.error });

  const executionId = buildExecutionId();
  const authorized  = result.status === 'APPROVED';
  const holdPending = result.status === 'REQUIRES_REVIEW';
  const timestamp   = new Date().toISOString();

  const response = {
    authorized, holdPending, executionId,
    status: result.status,
    riskScore: result.riskScore,
    lossExposure: result.lossExposure,
    reason: authorized ? 'VALIDATION_PASSED' : holdPending ? 'REQUIRES_OPERATOR_REVIEW' : 'RISK_THRESHOLD_EXCEEDED',
    trace: result.trace || [],
    timestamp,
    system: 'EXECUTION_CONTROL',
    authority: 'EXECUTIA',
    override: 'DISABLED',
    context: {
      entity: sanitizeText(entity), country: sanitizeText(country),
      paymentType: sanitizeText(paymentType), contractType: sanitizeText(contractType),
      supplierRisk: sanitizeText(supplierRisk), complianceType: sanitizeText(complianceType),
    },
    reasons: (result.trace || [])
      .filter((t) => t && t.value !== null && t.value !== undefined)
      .slice(0, 4)
      .map((t) => ({ code: t.step, value: t.value, impact: Math.round((Number(t.value) / (result.riskScore || 1)) * 10) / 10 })),
  };

  const insertPayload = {
    execution_id: executionId, status: response.status,
    authorized: response.authorized, hold_pending: response.holdPending,
    budget: numericBudget, timeline: numericTimeline, complexity: numericComplexity,
    risk_score: response.riskScore, loss_exposure: response.lossExposure, reason: response.reason,
    entity: response.context.entity, country: response.context.country,
    payment_type: response.context.paymentType, contract_type: response.context.contractType,
    supplier_risk: response.context.supplierRisk, compliance_type: response.context.complianceType,
    trace: response.trace, reasons: response.reasons,
    system: response.system, authority: response.authority, override: response.override,
    updated_at: timestamp,
  };

  try {
    const { error: insertError } = await supabase.from('executions').insert(insertPayload);
    if (insertError) {
      console.error('Execution insert failed:', insertError);
      return serverError(res, 'EXECUTION_PERSIST_FAILED', { details: insertError.message || null });
    }
    return res.status(200).json(response);
  } catch (err) {
    console.error('authorize-payment fatal error:', err);
    return serverError(res, 'SERVER_ERROR', { details: err?.message || null });
  }
}
