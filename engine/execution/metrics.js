/**
 * Engine · Execution metrics
 * Collected on the execution object. Surfaced only in developer mode by products.
 */

export function createEmptyMetrics() {
  return {
    questionsAsked: 0,
    questionsAvoidedByMemory: 0,
    questionsAvoidedByLearning: 0,
    memoryHits: 0,
    learningHits: 0,
    confidence: null,
    executionTimeMs: 0,
    executionComplete: false,
    askedTypes: [],
    startedAt: null,
    finishedAt: null,
  };
}

export function beginMetrics(invoice) {
  const metrics = {
    ...(invoice.metrics || createEmptyMetrics()),
    startedAt: invoice.metrics?.startedAt || Date.now(),
  };
  return { ...invoice, metrics };
}

/**
 * After Memory + Learning apply, record what was restored/avoided.
 * Accumulates across advance passes (do not wipe earlier hits).
 */
export function recordRestoreMetrics(invoice, { hadContextBeforeMemory, hadContextBeforeLearning }) {
  const metrics = { ...(invoice.metrics || createEmptyMetrics()) };
  const memoryRestored = invoice.memory?.restored || [];
  const learningApplied = invoice.learning?.applied || [];

  metrics.memoryHits = Math.max(metrics.memoryHits || 0, memoryRestored.length);
  metrics.learningHits = Math.max(metrics.learningHits || 0, learningApplied.length);
  metrics.confidence =
    invoice.memory?.confidence ??
    learningApplied.find((a) => a.kind === 'context')?.confidence ??
    metrics.confidence;

  const alreadyAvoidedContext =
    (metrics.questionsAvoidedByMemory || 0) + (metrics.questionsAvoidedByLearning || 0) > 0;

  if (!alreadyAvoidedContext) {
    if (!hadContextBeforeMemory && memoryRestored.some((r) => r.field === 'context')) {
      metrics.questionsAvoidedByMemory += 1;
    } else if (
      !hadContextBeforeLearning &&
      learningApplied.some((a) => a.kind === 'context')
    ) {
      metrics.questionsAvoidedByLearning += 1;
    }
  }

  return { ...invoice, metrics };
}

export function recordQuestionAsked(invoice, decisionType) {
  const metrics = { ...(invoice.metrics || createEmptyMetrics()) };
  const askedTypes = metrics.askedTypes || [];
  // Count each decision type once per execution (re-advance must not double-count)
  if (!askedTypes.includes(decisionType)) {
    metrics.questionsAsked += 1;
    metrics.askedTypes = [...askedTypes, decisionType];
  }
  return { ...invoice, metrics };
}

export function finalizeMetrics(invoice, { complete }) {
  const metrics = { ...(invoice.metrics || createEmptyMetrics()) };
  const started = metrics.startedAt || Date.now();
  metrics.finishedAt = Date.now();
  metrics.executionTimeMs = Math.max(0, metrics.finishedAt - started);
  metrics.executionComplete = Boolean(complete);
  metrics.confidence = invoice.memory?.confidence ?? metrics.confidence;
  return { ...invoice, metrics };
}
