/**
 * Mission Parser — isolated from UI.
 * Derives mission structure from visitor objective text (demonstration model).
 */

const DOMAIN_PATTERNS = [
  { id: 'manufacturing', match: /\b(factory|manufactur|plant|production)\b/i, label: 'Manufacturing expansion' },
  { id: 'expansion', match: /\b(expand|germany|international|market|country|countries)\b/i, label: 'Geographic expansion' },
  { id: 'healthcare', match: /\b(hospital|healthcare|clinic|medical|renovat)\b/i, label: 'Healthcare infrastructure' },
  { id: 'certification', match: /\b(iso|certification|certify|compliance|standard)\b/i, label: 'Certification & compliance' },
  { id: 'delivery', match: /\b(delay|project|portfolio|timeline|slippage)\b/i, label: 'Project delivery improvement' },
];

export const ENGINE_DISCLOSURE =
  'Demonstration execution scenario. Generated from mission text and funnel context — not verified organizational outcomes.';

/**
 * @param {string} rawText
 */
export function parseMission(rawText) {
  const text = String(rawText ?? '').trim();
  if (text.length < 8) {
    return { ok: false, error: 'MISSION_TOO_SHORT', message: 'Enter a business objective (at least 8 characters).' };
  }

  const domain = DOMAIN_PATTERNS.find((p) => p.match.test(text)) ?? {
    id: 'general',
    label: 'Governed execution initiative',
  };

  const sentences = text.split(/[.!?]/).map((s) => s.trim()).filter(Boolean);
  const headline = sentences[0] ?? text;

  return {
    ok: true,
    mission: {
      statement: text,
      headline,
      domain: domain.id,
      domainLabel: domain.label,
      verb: detectVerb(text),
    },
    meta: { kind: 'Calculated', parser: '1.0.0' },
  };
}

function detectVerb(text) {
  const lower = text.toLowerCase();
  if (/\b(build|construct|establish)\b/.test(lower)) return 'build';
  if (/\b(expand|enter|grow)\b/.test(lower)) return 'expand';
  if (/\b(renovat|upgrade|moderniz)\b/.test(lower)) return 'renovate';
  if (/\b(certif|comply|achieve)\b/.test(lower)) return 'certify';
  if (/\b(reduce|improve|eliminate)\b/.test(lower)) return 'improve';
  return 'execute';
}
