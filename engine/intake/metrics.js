/**
 * Engine · Intake metrics (developer mode only in products)
 */

export function createIntakeMetrics() {
  return {
    emailsInspected: 0,
    candidateDocumentsDetected: 0,
    executionObjectsCreated: 0,
    duplicatesPrevented: 0,
    objectsRequiringDecision: 0,
    objectsCompletedSilently: 0,
    ignoredNonCandidates: 0,
    adapterErrors: 0,
    exceptions: 0,
  };
}

let session = createIntakeMetrics();

export function getIntakeMetrics() {
  return { ...session };
}

export function resetIntakeMetrics() {
  session = createIntakeMetrics();
  return getIntakeMetrics();
}

export function bumpIntakeMetric(key, n = 1) {
  if (!(key in session)) return getIntakeMetrics();
  session[key] += n;
  return getIntakeMetrics();
}
