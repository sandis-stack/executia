import test from 'node:test';
import assert from 'node:assert/strict';
import { runReasoningEngine, INSUFFICIENT_BASIS } from '../assets/living-engine/reasoning-engine.js';
import { extractIntent } from '../assets/living-engine/intent-extractor.js';
import { calculateExecutionValue } from '../assets/execution-value-engine.js';

test('extractIntent cites mission text without domain templates', () => {
  const intent = extractIntent('We want to expand into Germany with governed cross-border operations.');
  assert.equal(intent.objectives[0].text.includes('Germany'), true);
  assert.equal(intent.constraints.some((item) => item.marker === 'governed'), true);
  assert.equal(intent.geography.some((item) => item.place === 'Germany'), true);
});

test('runReasoningEngine rejects short missions', () => {
  const result = runReasoningEngine('short');
  assert.equal(result.ok, false);
});

test('runReasoningEngine builds claims with cited premises', () => {
  const result = runReasoningEngine(
    'We want to expand into Germany with governed cross-border operations.',
  );
  assert.equal(result.ok, true);
  assert.ok(result.claims.length >= 1);
  assert.ok(result.chain.length >= 1);
  result.claims.forEach((claim) => {
    assert.ok(claim.premiseIds.length >= 1);
    claim.premiseIds.forEach((premiseId) => {
      assert.ok(result.facts.some((fact) => fact.id === premiseId));
    });
  });
});

test('runReasoningEngine returns insufficient basis for unstated stakeholders', () => {
  const result = runReasoningEngine('We want to expand into Germany with governed operations.');
  const stakeholders = result.insufficientAreas.find((area) => area.area === 'stakeholders');
  assert.equal(stakeholders.status, INSUFFICIENT_BASIS);
});

test('runReasoningEngine does not invent organization data', () => {
  const result = runReasoningEngine('We want to expand into Germany with governed operations.');
  const orgFacts = result.facts.filter((fact) => fact.source === 'execution_value_calculator');
  assert.equal(orgFacts.length, 0);
  const orgGap = result.insufficientAreas.find((area) => area.area === 'organization_profile');
  assert.equal(orgGap.status, INSUFFICIENT_BASIS);
});

test('runReasoningEngine binds geography to declared country footprint', () => {
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

  const result = runReasoningEngine(
    'We want to expand into Germany with governed cross-border operations.',
    { calculator },
  );

  const bindingClaim = result.claims.find((claim) => claim.id.startsWith('claim-binding-'));
  assert.ok(bindingClaim);
  assert.match(bindingClaim.statement, /Germany/);
  assert.equal(result.executionContext.completeness, 'complete');
});

test('reasoning output is deterministic', () => {
  const mission = 'Executive sponsor requires governed expansion into Germany after legal entity setup.';
  const a = runReasoningEngine(mission);
  const b = runReasoningEngine(mission);
  assert.deepEqual(a.claims, b.claims);
  assert.deepEqual(a.chain, b.chain);
});
