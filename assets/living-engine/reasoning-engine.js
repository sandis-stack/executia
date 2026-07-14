/**
 * Execution Intelligence — Reasoning Engine v1.0
 * Authority: EXECUTIA_EXECUTION_INTELLIGENCE_MODEL.md
 *
 * Flow: Mission → Intent → Execution Context → Facts → Claims → Reasoning Chain
 */

import { extractIntent } from './intent-extractor.js';

export const INSUFFICIENT_BASIS = 'INSUFFICIENT BASIS';

const ORG_FACT_FIELDS = [
  { key: 'industry', id: 'fact-org-industry', label: 'Industry' },
  { key: 'annualRevenue', id: 'fact-org-revenue', label: 'Annual revenue' },
  { key: 'employees', id: 'fact-org-employees', label: 'Employees' },
  { key: 'countries', id: 'fact-org-countries', label: 'Countries' },
  { key: 'activeProjects', id: 'fact-org-active-projects', label: 'Active projects' },
  { key: 'averageProjectValue', id: 'fact-org-project-value', label: 'Average project value' },
];

/**
 * @param {string} missionText
 * @param {{ calculator?: object, assessment?: object }} connectors
 */
export function runReasoningEngine(missionText, connectors = {}) {
  const text = String(missionText ?? '').trim();
  if (text.length < 8) {
    return {
      ok: false,
      error: 'MISSION_TOO_SHORT',
      message: 'Enter a business objective (at least 8 characters).',
    };
  }

  const intent = extractIntent(text);
  const executionContext = buildExecutionContext(connectors);
  const facts = buildFacts(text, intent, executionContext, connectors);
  const { claims, chain, insufficientAreas } = buildClaimsAndChain(intent, executionContext, facts);

  return {
    ok: true,
    mission: {
      statement: text,
      headline: intent.headline,
    },
    intent,
    executionContext,
    facts,
    claims,
    chain,
    insufficientAreas,
    status: insufficientAreas.length ? 'context_limited' : 'reasoned',
  };
}

function buildExecutionContext(connectors) {
  const { calculator, assessment } = connectors;
  const orgFactsPresent = [];
  const orgFactsMissing = [];
  const bindings = [];

  if (calculator?.connected && calculator.inputs) {
    ORG_FACT_FIELDS.forEach(({ key, label }) => {
      const value = calculator.inputs[key];
      if (value !== '' && value != null) {
        orgFactsPresent.push(label);
      } else {
        orgFactsMissing.push(label);
      }
    });
    if (Array.isArray(calculator.inputs.majorRisks) && calculator.inputs.majorRisks.length) {
      orgFactsPresent.push('Declared execution risks');
    }
  } else {
    orgFactsMissing.push(...ORG_FACT_FIELDS.map((field) => field.label));
    orgFactsMissing.push('Declared execution risks');
  }

  if (assessment?.connected) {
    orgFactsPresent.push('Organization assessment');
    bindings.push({
      id: 'ctx-assessment-bound',
      type: 'assessment_binding',
      organization: assessment.organization || INSUFFICIENT_BASIS,
      executionDomain: assessment.executionDomain || INSUFFICIENT_BASIS,
      source: 'organization_assessment',
    });
  }

  return {
    calculatorConnected: Boolean(calculator?.connected),
    assessmentConnected: Boolean(assessment?.connected),
    orgFactsPresent,
    orgFactsMissing,
    bindings,
    completeness:
      calculator?.connected && orgFactsMissing.length === 0
        ? 'complete'
        : calculator?.connected
          ? 'partial'
          : 'missing',
  };
}

function buildFacts(missionText, intent, executionContext, connectors) {
  const facts = [
    {
      id: 'fact-mission-statement',
      type: 'mission',
      label: 'Mission statement',
      value: missionText,
      source: 'user_input',
      completeness: 'complete',
    },
  ];

  intent.objectives.forEach((objective) => {
    facts.push({
      id: `fact-${objective.id}`,
      type: 'objective',
      label: 'Execution objective',
      value: objective.text,
      source: objective.source,
      span: objective.span,
      completeness: 'complete',
    });
  });

  intent.constraints.forEach((constraint) => {
    facts.push({
      id: `fact-${constraint.id}`,
      type: 'constraint',
      label: 'Execution constraint',
      value: constraint.text,
      marker: constraint.marker,
      source: constraint.source,
      span: constraint.span,
      completeness: 'complete',
    });
  });

  intent.stakeholders.forEach((stakeholder) => {
    facts.push({
      id: `fact-${stakeholder.id}`,
      type: 'stakeholder',
      label: 'Stakeholder mentioned',
      value: stakeholder.role,
      source: stakeholder.source,
      span: stakeholder.span,
      completeness: 'complete',
    });
  });

  intent.dependencies.forEach((dependency) => {
    facts.push({
      id: `fact-${dependency.id}`,
      type: 'dependency',
      label: 'Execution dependency',
      value: dependency.target,
      dependencyType: dependency.type,
      source: dependency.source,
      span: dependency.span,
      completeness: 'complete',
    });
  });

  intent.geography.forEach((geo) => {
    facts.push({
      id: `fact-${geo.id}`,
      type: 'geography',
      label: 'Geographic scope mentioned',
      value: geo.place,
      source: geo.source,
      span: geo.span,
      completeness: 'complete',
    });
  });

  const { calculator, assessment } = connectors;
  if (calculator?.connected && calculator.inputs) {
    ORG_FACT_FIELDS.forEach(({ key, id, label }) => {
      const value = calculator.inputs[key];
      if (value === '' || value == null) return;
      facts.push({
        id,
        type: 'organization',
        label,
        value,
        source: 'execution_value_calculator',
        completeness: 'declared',
      });
    });

    if (Array.isArray(calculator.inputs.majorRisks)) {
      calculator.inputs.majorRisks.forEach((risk, index) => {
        facts.push({
          id: `fact-org-risk-${index + 1}`,
          type: 'organization_risk',
          label: 'Declared execution risk',
          value: risk,
          source: 'execution_value_calculator',
          completeness: 'declared',
        });
      });
    }
  }

  if (assessment?.connected) {
    facts.push({
      id: 'fact-assessment-organization',
      type: 'organization',
      label: 'Organization name',
      value: assessment.organization,
      source: 'organization_assessment',
      completeness: assessment.organization ? 'declared' : 'missing',
    });
    if (assessment.executionDomain) {
      facts.push({
        id: 'fact-assessment-domain',
        type: 'organization',
        label: 'Execution domain',
        value: assessment.executionDomain,
        source: 'organization_assessment',
        completeness: 'declared',
      });
    }
  }

  facts.push({
    id: 'fact-context-completeness',
    type: 'context',
    label: 'Execution context completeness',
    value: executionContext.completeness,
    source: 'reasoning_engine',
    completeness: 'complete',
  });

  return facts;
}

function buildClaimsAndChain(intent, executionContext, facts) {
  const claims = [];
  const chain = [];
  const insufficientAreas = [];
  let stepCounter = 0;

  const factById = Object.fromEntries(facts.map((fact) => [fact.id, fact]));

  function addStep({ premises, inference, conclusion, confidence, confidenceReason, alternatives = [] }) {
    stepCounter += 1;
    const stepId = `step-${String(stepCounter).padStart(3, '0')}`;
    chain.push({
      step_id: stepId,
      premises,
      inference,
      conclusion,
      confidence,
      confidenceReason,
      alternatives,
    });
    return stepId;
  }

  function addClaim({ id, statement, premiseIds, confidence, confidenceReason }) {
    const claim = { id, statement, premiseIds, confidence, confidenceReason };
    claims.push(claim);
    return id;
  }

  const missionFactId = 'fact-mission-statement';
  const objectiveClaimId = addClaim({
    id: 'claim-mission-objective',
    statement: `Primary execution objective: ${intent.headline}`,
    premiseIds: [missionFactId],
    confidence: 'high',
    confidenceReason: 'Objective is taken directly from the declared mission statement.',
  });
  addStep({
    premises: [missionFactId],
    inference: 'The mission statement declares the governing execution objective.',
    conclusion: objectiveClaimId,
    confidence: 'high',
    confidenceReason: 'Direct citation of user-provided mission text.',
  });

  intent.constraints.forEach((constraint) => {
    const factId = `fact-${constraint.id}`;
    const claimId = addClaim({
      id: `claim-${constraint.id}`,
      statement: `Mission imposes execution constraint: ${constraint.marker}.`,
      premiseIds: [missionFactId, factId],
      confidence: 'high',
      confidenceReason: `Constraint term "${constraint.marker}" appears in the mission text.`,
    });
    addStep({
      premises: [missionFactId, factId],
      inference: 'Constraint language in the mission limits how execution may proceed.',
      conclusion: claimId,
      confidence: 'high',
      confidenceReason: 'Constraint is explicitly present in the mission statement.',
    });
  });

  if (intent.stakeholders.length) {
    intent.stakeholders.forEach((stakeholder) => {
      const factId = `fact-${stakeholder.id}`;
      const claimId = addClaim({
        id: `claim-${stakeholder.id}`,
        statement: `Mission identifies stakeholder role: ${stakeholder.role}.`,
        premiseIds: [missionFactId, factId],
        confidence: 'high',
        confidenceReason: 'Stakeholder role is explicitly named in the mission text.',
      });
      addStep({
        premises: [missionFactId, factId],
        inference: 'Named stakeholder roles in the mission create accountability requirements.',
        conclusion: claimId,
        confidence: 'high',
        confidenceReason: 'Role is cited from mission text only.',
      });
    });
  } else {
    insufficientAreas.push({
      area: 'stakeholders',
      status: INSUFFICIENT_BASIS,
      reason: 'No stakeholder roles are named in the mission statement.',
    });
  }

  if (intent.dependencies.length) {
    intent.dependencies.forEach((dependency) => {
      const factId = `fact-${dependency.id}`;
      const claimId = addClaim({
        id: `claim-${dependency.id}`,
        statement: `Execution depends on (${dependency.type}): ${dependency.target}.`,
        premiseIds: [missionFactId, factId],
        confidence: 'high',
        confidenceReason: 'Dependency language is explicitly stated in the mission.',
      });
      addStep({
        premises: [missionFactId, factId],
        inference: 'Dependency language defines sequencing constraints on execution.',
        conclusion: claimId,
        confidence: 'high',
        confidenceReason: 'Dependency target is cited from mission text only.',
      });
    });
  } else {
    insufficientAreas.push({
      area: 'dependencies',
      status: INSUFFICIENT_BASIS,
      reason: 'No execution dependencies are stated in the mission statement.',
    });
  }

  const geoFacts = facts.filter((fact) => fact.type === 'geography');
  const countriesFact = factById['fact-org-countries'];

  if (geoFacts.length && countriesFact) {
    geoFacts.forEach((geoFact) => {
      const claimId = addClaim({
        id: `claim-binding-${geoFact.id}`,
        statement:
          countriesFact.value <= 1
            ? `Mission references geography (${geoFact.value}) while organization declares operations in ${countriesFact.value} countr${countriesFact.value === 1 ? 'y' : 'ies'}.`
            : `Mission geography (${geoFact.value}) must be bound against organization footprint (${countriesFact.value} countries declared).`,
        premiseIds: [missionFactId, geoFact.id, countriesFact.id],
        confidence: countriesFact.value <= 1 ? 'high' : 'medium',
        confidenceReason:
          countriesFact.value <= 1
            ? 'Single-country profile with explicit foreign geography in mission.'
            : 'Cross-footprint binding requires further authority mapping.',
      });
      addStep({
        premises: [missionFactId, geoFact.id, countriesFact.id],
        inference: 'Geographic scope in the mission is bound to declared organizational footprint.',
        conclusion: claimId,
        confidence: countriesFact.value <= 1 ? 'high' : 'medium',
        confidenceReason: 'Conclusion uses only mission geography and declared country count.',
        alternatives:
          countriesFact.value > 1
            ? ['Organization may already operate in the referenced geography.']
            : [],
      });
    });
  } else if (geoFacts.length) {
    insufficientAreas.push({
      area: 'geography_binding',
      status: INSUFFICIENT_BASIS,
      reason: 'Mission references geography but organization country footprint is not declared.',
    });
  }

  if (!executionContext.calculatorConnected) {
    insufficientAreas.push({
      area: 'organization_profile',
      status: INSUFFICIENT_BASIS,
      reason: 'Organization profile facts are not available from Execution Value.',
    });
  } else if (executionContext.orgFactsMissing.length) {
    insufficientAreas.push({
      area: 'organization_profile',
      status: INSUFFICIENT_BASIS,
      reason: `Missing organization facts: ${executionContext.orgFactsMissing.join(', ')}.`,
    });
  } else {
    const orgClaimId = addClaim({
      id: 'claim-org-profile-bound',
      statement: `Organization profile is bound to mission for reasoning (${executionContext.orgFactsPresent.join(', ')}).`,
      premiseIds: facts.filter((fact) => fact.source === 'execution_value_calculator').map((fact) => fact.id),
      confidence: 'high',
      confidenceReason: 'All required organization facts are declared in Execution Value.',
    });
    addStep({
      premises: facts.filter((fact) => fact.source === 'execution_value_calculator').map((fact) => fact.id),
      inference: 'Declared organization facts establish execution context before conclusions.',
      conclusion: orgClaimId,
      confidence: 'high',
      confidenceReason: 'Binding uses declared calculator inputs only.',
    });
  }

  insufficientAreas.push(
    {
      area: 'budget',
      status: INSUFFICIENT_BASIS,
      reason: 'Budget is not declared in mission or organization facts.',
    },
    {
      area: 'timeline',
      status: INSUFFICIENT_BASIS,
      reason: 'Timeline is not declared in mission or organization facts.',
    },
  );

  return { claims, chain, insufficientAreas };
}
