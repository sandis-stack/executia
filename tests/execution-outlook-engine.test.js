import test from 'node:test';
import assert from 'node:assert/strict';
import { runReasoningEngine, INSUFFICIENT_BASIS } from '../assets/living-engine/reasoning-engine.js';
import { runValidation } from '../assets/living-engine/validation-engine.js';
import { runEvidence } from '../assets/living-engine/evidence-engine.js';
import { runExecutionOutlook } from '../assets/living-engine/execution-outlook-engine.js';
import { calculateExecutionValue } from '../assets/execution-value-engine.js';

const VALID_CONFIDENCE = new Set(['HIGH', 'MEDIUM', 'LOW']);

test('outlook returns INSUFFICIENT BASIS when required evidence is missing', () => {
  const calculator = {
    connected: true,
    inputs: {
      industry: 'technology',
      annualRevenue: 120_000_000,
      employees: 900,
      countries: 1,
      activeProjects: 24,
      averageProjectValue: 2_500_000,
      majorRisks: ['multi-site'],
    },
    results: calculateExecutionValue({
      industry: 'technology',
      annualRevenue: 120_000_000,
      employees: 900,
      countries: 1,
      activeProjects: 24,
      averageProjectValue: 2_500_000,
      majorRisks: ['multi-site'],
    }),
  };

  const reasoning = runReasoningEngine(
    'We want to expand into Germany with governed cross-border operations.',
    { calculator },
  );
  const validation = runValidation(reasoning);
  const evidence = runEvidence(reasoning, validation);
  const outlook = runExecutionOutlook(reasoning, validation, evidence);

  assert.equal(outlook.status, INSUFFICIENT_BASIS);
  assert.equal(outlook.confidence, INSUFFICIENT_BASIS);
  assert.equal(outlook.scenario, null);
  assert.match(outlook.summary.reason, /Required evidence|Blocking validation/);
});

test('outlook scenario includes assumptions dependencies constraints evidence and reasoning references', () => {
  const reasoning = runReasoningEngine(
    'Executive sponsor requires governed expansion into Germany after legal entity setup.',
  );
  const validation = runValidation(reasoning);
  const evidence = runEvidence(reasoning, validation);
  const outlook = runExecutionOutlook(reasoning, validation, evidence);

  assert.equal(outlook.status, 'READY');
  assert.ok(outlook.scenario);
  assert.ok(Array.isArray(outlook.assumptions));
  assert.ok(outlook.assumptions.length >= 1);
  assert.ok(Array.isArray(outlook.scenario.dependencies));
  assert.ok(Array.isArray(outlook.scenario.constraints));
  assert.ok(Array.isArray(outlook.scenario.evidence_used));
  assert.ok(Array.isArray(outlook.scenario.reasoning_references));
  assert.ok(VALID_CONFIDENCE.has(outlook.confidence));
  assert.ok(outlook.invalid_conditions.length >= 1);
});

test('outlook uses only valid claims in scenario', () => {
  const reasoning = runReasoningEngine(
    'We want to reduce project delays with governed visibility and executive sponsor review.',
  );
  const validation = runValidation(reasoning);
  const evidence = runEvidence(reasoning, validation);
  const outlook = runExecutionOutlook(reasoning, validation, evidence);

  const validClaimIds = new Set(
    validation.findings
      .filter((finding) => finding.execution_status === 'VALID')
      .map((finding) => finding.claim_id),
  );

  outlook.scenario.validated_claims.forEach((claim) => {
    assert.ok(validClaimIds.has(claim.claim_id));
  });
  outlook.scenario.reasoning_references.forEach((reference) => {
    assert.ok(validClaimIds.has(reference.claim_id));
  });
});

test('outlook evidence_used includes only verified satisfied obligations', () => {
  const reasoning = runReasoningEngine(
    'We want to expand into Germany with governed cross-border operations.',
  );
  const validation = runValidation(reasoning);
  const finding = validation.findings.find((item) => item.rule_id === 'ES-VAL-030');
  if (!finding) return;

  const withProof = {
    ...reasoning,
    facts: [
      ...reasoning.facts,
      {
        id: 'proof-binding-geo-001',
        type: 'proof_artifact',
        label: 'Geographic authority mapping proof',
        value: 'Declared footprint alignment record',
        source: 'declared_proof',
        finding_id: finding.finding_id,
        claim_id: finding.claim_id,
        rule_id: finding.rule_id,
      },
    ],
  };

  const evidence = runEvidence(withProof, validation);
  const outlook = runExecutionOutlook(withProof, validation, evidence);

  if (outlook.status === INSUFFICIENT_BASIS) return;

  outlook.scenario.evidence_used.forEach((item) => {
    const obligation = evidence.obligations.find((entry) => entry.obligation_id === item.obligation_id);
    assert.ok(obligation);
    assert.equal(obligation.verification, 'VERIFIED');
    assert.equal(obligation.evidence_result, 'SATISFIED');
  });
});

test('outlook confidence is deterministic', () => {
  const reasoning = runReasoningEngine(
    'Executive sponsor must approve governed factory commissioning before dependency work begins.',
  );
  const validation = runValidation(reasoning);
  const evidence = runEvidence(reasoning, validation);
  const first = runExecutionOutlook(reasoning, validation, evidence);
  const second = runExecutionOutlook(reasoning, validation, evidence);
  assert.deepEqual(first.summary, second.summary);
  assert.equal(first.confidence, second.confidence);
});

test('complete context with verified required evidence yields HIGH confidence', () => {
  const calculator = {
    connected: true,
    inputs: {
      industry: 'technology',
      annualRevenue: 120_000_000,
      employees: 900,
      countries: 3,
      activeProjects: 24,
      averageProjectValue: 2_500_000,
      majorRisks: ['multi-site'],
    },
    results: calculateExecutionValue({
      industry: 'technology',
      annualRevenue: 120_000_000,
      employees: 900,
      countries: 3,
      activeProjects: 24,
      averageProjectValue: 2_500_000,
      majorRisks: ['multi-site'],
    }),
  };

  const reasoning = runReasoningEngine(
    'We want to reduce project delays with governed visibility.',
    { calculator },
  );
  const validation = runValidation(reasoning);
  const evidence = runEvidence(reasoning, validation);
  const outlook = runExecutionOutlook(reasoning, validation, evidence);

  assert.equal(outlook.status, 'READY');
  assert.equal(outlook.confidence, 'HIGH');
});

test('outlook never invents facts in assumptions', () => {
  const reasoning = runReasoningEngine('We want to reduce project delays with governed visibility.');
  const validation = runValidation(reasoning);
  const evidence = runEvidence(reasoning, validation);
  const outlook = runExecutionOutlook(reasoning, validation, evidence);
  const factIds = new Set(reasoning.facts.map((fact) => fact.id));

  outlook.assumptions.forEach((assumption) => {
    assert.ok(factIds.has(assumption.fact_id));
  });
});
