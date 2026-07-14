import test from 'node:test';
import assert from 'node:assert/strict';
import { runReasoningEngine, INSUFFICIENT_BASIS } from '../assets/living-engine/reasoning-engine.js';
import { runValidation } from '../assets/living-engine/validation-engine.js';
import { runEvidence } from '../assets/living-engine/evidence-engine.js';
import { EVIDENCE_OBLIGATION_CATALOG } from '../assets/living-engine/evidence-catalog.js';
import { EXECUTION_STANDARD_RULES } from '../assets/living-engine/validation-rules.js';
import { calculateExecutionValue } from '../assets/execution-value-engine.js';

const VALID_EVIDENCE_STATUSES = new Set(['REQUIRED', 'OPTIONAL', 'NOT REQUIRED']);
const VALID_VERIFICATIONS = new Set(['VERIFIED', 'MISSING', 'NOT VERIFIABLE']);
const VALID_RESULTS = new Set(['SATISFIED', 'UNSATISFIED', 'INSUFFICIENT BASIS']);
const RULE_IDS = new Set(EXECUTION_STANDARD_RULES.map((rule) => rule.id));
const CATALOG_RULE_IDS = new Set(Object.keys(EVIDENCE_OBLIGATION_CATALOG));

test('evidence catalog covers every Execution Standard validation rule', () => {
  RULE_IDS.forEach((ruleId) => {
    assert.ok(CATALOG_RULE_IDS.has(ruleId), `Missing evidence catalog entry for ${ruleId}`);
  });
});

test('every validation finding creates exactly one evidence obligation', () => {
  const reasoning = runReasoningEngine(
    'Executive sponsor requires governed expansion into Germany after legal entity setup.',
  );
  const validation = runValidation(reasoning);
  const evidence = runEvidence(reasoning, validation);

  assert.equal(evidence.obligations.length, validation.findings.length);
  assert.equal(evidence.summary.obligationsCount, validation.findings.length);
});

test('every obligation references one finding and one canonical rule', () => {
  const reasoning = runReasoningEngine(
    'We need ISO certification with governed evidence and executive sponsor sign-off.',
  );
  const validation = runValidation(reasoning);
  const evidence = runEvidence(reasoning, validation);
  const findingIds = new Set(validation.findings.map((finding) => finding.finding_id));

  evidence.obligations.forEach((obligation) => {
    assert.ok(findingIds.has(obligation.finding_id));
    assert.ok(RULE_IDS.has(obligation.rule_id));
    assert.ok(VALID_EVIDENCE_STATUSES.has(obligation.evidence_status));
    assert.ok(VALID_VERIFICATIONS.has(obligation.verification));
    assert.ok(VALID_RESULTS.has(obligation.evidence_result));
    assert.ok(obligation.obligation_text.length > 0);
    assert.ok(Array.isArray(obligation.proof_artifact_refs));
  });
});

test('informational valid findings produce NOT REQUIRED obligations that are SATISFIED', () => {
  const reasoning = runReasoningEngine('We want to reduce project delays with governed visibility.');
  const validation = runValidation(reasoning);
  const evidence = runEvidence(reasoning, validation);

  const objectiveObligation = evidence.obligations.find(
    (obligation) => obligation.rule_id === 'ES-REQ-002',
  );
  assert.ok(objectiveObligation);
  assert.equal(objectiveObligation.evidence_status, 'NOT REQUIRED');
  assert.equal(objectiveObligation.evidence_result, 'SATISFIED');
  assert.equal(objectiveObligation.proof_artifact_refs.length, 0);
});

test('required proof without declared artifacts yields MISSING and UNSATISFIED', () => {
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

  const bindingObligation = evidence.obligations.find(
    (obligation) => obligation.rule_id === 'ES-VAL-030' && obligation.evidence_status === 'REQUIRED',
  );
  assert.ok(bindingObligation);
  assert.equal(bindingObligation.verification, 'MISSING');
  assert.equal(bindingObligation.evidence_result, 'UNSATISFIED');
  assert.ok(evidence.summary.unsatisfiedObligations.includes(bindingObligation.obligation_id));
});

test('not evaluable findings yield INSUFFICIENT BASIS — never inferred evidence', () => {
  const reasoning = runReasoningEngine('We want to expand into Germany with governed operations.');
  const stakeholderClaim = reasoning.claims.find((claim) => claim.id.startsWith('claim-stakeholder-'));
  if (!stakeholderClaim) return;

  const tampered = {
    ...reasoning,
    facts: reasoning.facts.filter((fact) => !stakeholderClaim.premiseIds.includes(fact.id)),
  };
  const validation = runValidation(tampered);
  const evidence = runEvidence(tampered, validation);

  const obligation = evidence.obligations.find(
    (item) => item.claim_id === stakeholderClaim.id && item.rule_id === 'ES-REQ-001',
  );
  assert.ok(obligation);
  assert.equal(obligation.evidence_result, INSUFFICIENT_BASIS);
  assert.equal(obligation.verification, 'NOT VERIFIABLE');
  assert.equal(obligation.proof_artifact_refs.length, 0);
});

test('declared proof artifacts verify obligations without inference', () => {
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
  const obligation = evidence.obligations.find((item) => item.finding_id === finding.finding_id);
  assert.ok(obligation);
  assert.equal(obligation.verification, 'VERIFIED');
  assert.equal(obligation.evidence_result, 'SATISFIED');
  assert.deepEqual(obligation.proof_artifact_refs, ['proof-binding-geo-001']);
});

test('runEvidence is deterministic for identical inputs', () => {
  const reasoning = runReasoningEngine(
    'Executive sponsor must approve governed factory commissioning before dependency work begins.',
  );
  const validation = runValidation(reasoning);
  const first = runEvidence(reasoning, validation);
  const second = runEvidence(reasoning, validation);
  assert.deepEqual(first.summary, second.summary);
  assert.deepEqual(first.obligations, second.obligations);
});
