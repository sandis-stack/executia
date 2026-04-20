/**
 * EXECUTIA™ — Shared Risk Engine
 * Single source of truth for verdict generation.
 * Used by: /api/execute, /api/request-validation
 */

export function computeRisk(p = {}) {
  const rawValue = String(p.value || p.processValue || p.budget || '').replace(/[^0-9.]/g, '');
  const v = parseFloat(rawValue) || 500000;

  const cplx = parseInt(String(p.complexity || '2').replace(/[^0-9]/g, ''), 10) || 2;
  const tl   = parseInt(String(p.timeline   || '6').replace(/[^0-9]/g, ''), 10) || 6;

  const txt = (
    (p.risk || p.mainRisk || p.consequence || p.processType || '') +
    ' ' +
    (p.whatIsAtRisk || p.context || '')
  ).toLowerCase();

  let score = 0;
  score += Math.min(40, (v / 1e6) * 8);
  score += Math.min(25, tl * 2);
  score += Math.min(35, cplx * 7);

  if (/penalty|legal|compliance|contract|audit|liability/.test(txt)) score += 18;
  else if (/delay|overrun|cost|budget/.test(txt)) score += 10;
  else if (txt.trim().length > 20) score += 5;

  score = Math.min(98, Math.round(score));

  return {
    risk:      score,
    verdict:   score < 38 ? 'APPROVED' : score < 68 ? 'REQUIRES REVIEW' : 'BLOCKED',
    lifecycle: score < 38 ? 'IN CONTROL' : score < 68 ? 'UNDER REVIEW' : 'HALTED',
    exposure:  '€' + Math.round(v * (score / 100) * 0.35).toLocaleString(),
  };
}
