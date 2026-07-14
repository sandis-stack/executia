import test from 'node:test';
import assert from 'node:assert/strict';
import { runReasoningEngine } from '../assets/living-engine/reasoning-engine.js';
import { runValidation } from '../assets/living-engine/validation-engine.js';
import {
  EXECUTION_STANDARD_RULES,
  rulesForClaim,
} from '../assets/living-engine/validation-rules.js';
import { calculateExecutionValue } from '../assets/execution-value-engine.js';

const VALID_SEVERITIES = new Set(['INFO', 'WARNING', 'MAJOR', 'CRITICAL']);
const VALID_STATUSES = new Set(['VALID', 'INVALID', 'NOT EVALUABLE']);
const RULE_IDS = new Set(EXECUTION_STANDARD_RULES.map((rule) => rule.id));

test('runValidation validates claims only — never the mission object', () => {
  const reasoning = runReasoningEngine(
    'We need executive sponsor alignment for governed hospital renovation.',
  );
  assert.equal(reasoning.ok, true);

  const validation = runValidation(reasoning);
  assert.ok(validation.findings.length >= 1);
  validation.findings.forEach((finding) => {
    assert.ok(finding.claim_id.startsWith('claim-'));
    assert.notEqual(finding.claim_id, 'mission');
  });
});

test('every finding references one claim and one canonical rule', () => {
  const reasoning = runReasoningEngine(
    'We want to expand into Germany with governed cross-border operations and executive sponsor review.',
  );
  const validation = runValidation(reasoning);

  validation.findings.forEach((finding) => {
    assert.ok(RULE_IDS.has(finding.rule_id));
    assert.ok(reasoning.claims.some((claim) => claim.id === finding.claim_id));
    assert.ok(VALID_SEVERITIES.has(finding.severity));
    assert.ok(VALID_STATUSES.has(finding.execution_status));
    assert.ok(finding.explanation.length > 0);
    assert.ok(Array.isArray(finding.evaluated_against));
  });
});

test('objective claim cites mission fact — ES-REQ-002', () => {
  const reasoning = runReasoningEngine('We want to reduce project delays with governed visibility.');
  const validation = runValidation(reasoning);
  const objectiveFinding = validation.findings.find(
    (finding) => finding.claim_id === 'claim-mission-objective' && finding.rule_id === 'ES-REQ-002',
  );
  assert.ok(objectiveFinding);
  assert.equal(objectiveFinding.execution_status, 'VALID');
});

test('missing premise facts yield NOT EVALUABLE — never assumed compliance', () => {
  const reasoning = runReasoningEngine('We want to expand into Germany with governed operations.');
  const stakeholderClaim = reasoning.claims.find((claim) => claim.id.startsWith('claim-stakeholder-'));
  if (!stakeholderClaim) return;

  const tampered = {
    ...reasoning,
    facts: reasoning.facts.filter((fact) => !stakeholderClaim.premiseIds.includes(fact.id)),
  };
  const validation = runValidation(tampered);
  const finding = validation.findings.find(
    (finding) => finding.claim_id === stakeholderClaim.id && finding.rule_id === 'ES-REQ-001',
  );
  assert.ok(finding);
  assert.equal(finding.execution_status, 'NOT EVALUABLE');
  assert.equal(finding.severity, 'MAJOR');
});

test('single-country footprint with cross-border geography yields INVALID binding', () => {
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
  const bindingFinding = validation.findings.find(
    (finding) => finding.rule_id === 'ES-VAL-030' && finding.execution_status === 'INVALID',
  );
  assert.ok(bindingFinding);
  assert.equal(bindingFinding.severity, 'CRITICAL');
  assert.ok(validation.summary.blockedClaims.includes(bindingFinding.claim_id));
});

test('runValidation is deterministic for identical reasoning input', () => {
  const reasoning = runReasoningEngine(
    'Executive sponsor must approve governed factory commissioning before dependency work begins.',
  );
  const first = runValidation(reasoning);
  const second = runValidation(reasoning);
  assert.deepEqual(first.summary, second.summary);
  assert.deepEqual(first.findings, second.findings);
});

test('rulesForClaim uses catalog rules only — no invented rule ids in findings', () => {
  const reasoning = runReasoningEngine(
    'We need ISO certification with governed evidence and executive sponsor sign-off.',
  );
  reasoning.claims.forEach((claim) => {
    rulesForClaim(claim).forEach((rule) => {
      assert.ok(EXECUTION_STANDARD_RULES.some((catalogRule) => catalogRule.id === rule.id));
    });
  });
});
