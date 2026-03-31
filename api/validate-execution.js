// /api/validate-execution.js
// EXECUTIA — Execution Validation Endpoint
// POST /api/validate-execution
// Returns: status, riskScore, lossExposure, trace, executionId

import { evaluateExecution } from '../lib/riskEngine.js';

// In-memory rate limiting — 20 requests per IP per minute
const requests = {};

function rateLimit(ip) {
  const now = Date.now();
  if (!requests[ip]) requests[ip] = [];
  requests[ip] = requests[ip].filter(t => now - t < 60000);
  if (requests[ip].length >= 20) return false;
  requests[ip].push(now);
  return true;
}

export default async function handler(req, res) {

  // Method guard
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  // Rate limiting
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (!rateLimit(ip)) {
    return res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED' });
  }

  const { budget, timeline, complexity } = req.body;

  // Input guard
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

  return res.status(200).json({
    ...result,
    executionId
  });
}
