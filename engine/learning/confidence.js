/**
 * Engine · Learning confidence
 * Deterministic bands — not probabilistic ML.
 */

export const CONFIDENCE_BAND = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

/** First confirmation is enough to stay quiet until reality changes. */
export const FIRST_CONFIRM_CONFIDENCE = 0.92;
export const CONFIRM_STEP = 0.02;
export const MAX_CONFIDENCE = 0.99;
export const CONTRADICTION_CONFIDENCE = 0.4;

export const HIGH_THRESHOLD = 0.85;
export const MEDIUM_THRESHOLD = 0.55;

export function bandForConfidence(confidence) {
  const c = Number(confidence) || 0;
  if (c >= HIGH_THRESHOLD) return CONFIDENCE_BAND.HIGH;
  if (c >= MEDIUM_THRESHOLD) return CONFIDENCE_BAND.MEDIUM;
  return CONFIDENCE_BAND.LOW;
}

/**
 * High / medium → do not interrupt (silence).
 * Low → Needs Decision.
 */
export function shouldInterrupt(rule) {
  if (!rule) return true;
  return bandForConfidence(rule.confidence) === CONFIDENCE_BAND.LOW;
}

export function shouldApplySilently(rule) {
  if (!rule) return false;
  const band = bandForConfidence(rule.confidence);
  return band === CONFIDENCE_BAND.HIGH || band === CONFIDENCE_BAND.MEDIUM;
}

/**
 * Strengthen a rule with the same confirmed value.
 */
export function strengthen(rule, at = new Date().toISOString()) {
  const count = (rule.confirmationCount || 0) + 1;
  const confidence =
    count === 1
      ? FIRST_CONFIRM_CONFIDENCE
      : Math.min(MAX_CONFIDENCE, (Number(rule.confidence) || FIRST_CONFIRM_CONFIDENCE) + CONFIRM_STEP);
  return {
    ...rule,
    confidence,
    confirmationCount: count,
    lastConfirmed: at,
    lastChanged: rule.value === undefined ? at : rule.lastChanged || at,
  };
}

/**
 * Replace value after a changed confirmation — reduce confidence, new truth.
 */
export function replaceWithContradiction(rule, newValue, at = new Date().toISOString()) {
  return {
    ...rule,
    value: newValue,
    confidence: CONTRADICTION_CONFIDENCE,
    confirmationCount: 1,
    lastConfirmed: at,
    lastChanged: at,
  };
}

export function createRule({ kind, key, value, at = new Date().toISOString() }) {
  return {
    kind,
    key,
    value,
    confidence: FIRST_CONFIRM_CONFIDENCE,
    confirmationCount: 1,
    lastConfirmed: at,
    lastChanged: at,
  };
}
