/**
 * Pilot section — Executive Assessment product surface.
 */

import { formatCurrency } from './execution-value-engine.js';
import {
  loadPublicFunnelContext,
  applyPilotHandoff,
  buildRequestUrl,
  refinedExecutionScore,
  recoverableValue,
  priorityAreas,
} from './public-funnel.js';

const JOURNEY_STEPS = [
  { id: 'org', label: 'Current Organization' },
  { id: 'assessment', label: 'Execution Assessment' },
  { id: 'score', label: 'Execution Score' },
  { id: 'improvement', label: 'Execution Improvement' },
  { id: 'report', label: 'Pilot Report' },
  { id: 'implementation', label: 'Implementation' },
];

function journeyDetail(ctx, stepId) {
  const assessment = ctx.assessment?.results;
  const inputs = ctx.assessment?.inputs;
  const calc = ctx.calculator?.results;
  const engine = ctx.engine;
  const score = refinedExecutionScore(ctx);
  const plan = assessment?.improvementPlan?.value ?? [];
  const gaps = assessment?.gapAnalysis?.value ?? [];

  switch (stepId) {
    case 'org':
      if (inputs?.organization) {
        const domain = inputs.executionDomain ? ` · ${inputs.executionDomain}` : '';
        return `${inputs.organization}${domain}`;
      }
      if (calc?.organizationProfile?.value) return calc.organizationProfile.value;
      return 'Organization profile from your funnel inputs';
    case 'assessment':
      if (assessment?.ok) {
        return `${gaps.length} execution gap areas diagnosed across self-assessment domains`;
      }
      if (calc) return 'Execution Intelligence bound — complete Assessment for full diagnosis';
      return 'Self-assessment across execution domains and loss exposure';
    case 'score':
      if (score != null) {
        return `${score}/100 — where execution is being lost today`;
      }
      return 'Refined score from calculator estimate and organizational readiness';
    case 'improvement':
      if (plan.length) return plan[0].action;
      if (gaps.length) {
        return `Address ${gaps[0].area.toLowerCase()} — first remediation step in the roadmap`;
      }
      return 'Prioritized steps to close execution gaps and recover value';
    case 'report':
      if (assessment?.ok) {
        return `Executive Summary, risks, and roadmap — ${assessment.pilotRecommendation.readiness} for pilot`;
      }
      return 'Executive Summary, Execution Score, value opportunity, risks, and roadmap';
    case 'implementation':
      if (engine?.completed) return 'Governed pilot scope validated through Living Engine scenario';
      if (assessment?.ok) return assessment.pilotRecommendation.value;
      return 'Controlled validation at one execution point — then scale through EXECUTIA ONE';
    default:
      return '';
  }
}

function journeyKind(ctx, stepId) {
  const assessment = ctx.assessment?.results;
  const calc = ctx.calculator?.results;
  const engine = ctx.engine;
  const score = refinedExecutionScore(ctx);

  switch (stepId) {
    case 'org':
      if (ctx.assessment?.inputs?.organization) return 'Calculated';
      if (calc) return 'Estimated';
      return 'Demo';
    case 'assessment':
      return assessment?.ok ? 'Calculated' : (calc ? 'Estimated' : 'Demo');
    case 'score':
      if (score == null) return 'Demo';
      return assessment?.ok ? 'Calculated' : 'Estimated';
    case 'improvement':
      return assessment?.improvementPlan?.value?.length ? 'Calculated' : (assessment?.gapAnalysis?.value?.length ? 'Estimated' : 'Demo');
    case 'report':
      return assessment?.ok ? 'Calculated' : (calc ? 'Estimated' : 'Demo');
    case 'implementation':
      if (engine?.completed) return 'Demonstration';
      return assessment?.ok ? 'Calculated' : 'Demo';
    default:
      return 'Demo';
  }
}

function journeyActive(ctx, stepId) {
  const assessment = ctx.assessment?.results;
  const calc = ctx.calculator?.results;
  const engine = ctx.engine;
  const score = refinedExecutionScore(ctx);

  switch (stepId) {
    case 'org':
      return Boolean(ctx.assessment?.inputs?.organization || calc);
    case 'assessment':
      return Boolean(assessment?.ok);
    case 'score':
      return score != null;
    case 'improvement':
      return Boolean(assessment?.improvementPlan?.value?.length || assessment?.gapAnalysis?.value?.length);
    case 'report':
      return Boolean(assessment?.ok);
    case 'implementation':
      return Boolean(engine?.completed || assessment?.ok);
    default:
      return false;
  }
}

function kindClass(kind) {
  const normalized = kind.toLowerCase().replace('demonstration', 'demo');
  return `pi-kind-${normalized}`;
}

function renderJourney(root, ctx) {
  const rail = root.querySelector('#pi-journey');
  if (!rail) return;

  // Security (#586): session/form strings (organization, domain, plan text) via textContent only.
  while (rail.firstChild) rail.removeChild(rail.firstChild);

  JOURNEY_STEPS.forEach((step, index) => {
    const detail = journeyDetail(ctx, step.id);
    const active = journeyActive(ctx, step.id);

    const stepEl = document.createElement('div');
    stepEl.className = active ? 'pi-flow-step pi-flow-step--active' : 'pi-flow-step';

    const head = document.createElement('div');
    head.className = 'pi-flow-step-head';
    const label = document.createElement('span');
    label.className = 'pi-flow-step-label';
    label.textContent = step.label;
    head.appendChild(label);

    const value = document.createElement('p');
    value.className = 'pi-flow-step-value';
    value.textContent = detail;

    stepEl.appendChild(head);
    stepEl.appendChild(value);
    rail.appendChild(stepEl);

    if (index < JOURNEY_STEPS.length - 1) {
      const arrow = document.createElement('div');
      arrow.className = 'pi-flow-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '↓';
      rail.appendChild(arrow);
    }
  });
}

function buildDeliverables(ctx) {
  const assessment = ctx.assessment?.results;
  const calc = ctx.calculator?.results;
  const score = refinedExecutionScore(ctx);
  const recover = recoverableValue(ctx);
  const priorities = priorityAreas(ctx);
  const gaps = assessment?.gapAnalysis?.value ?? [];
  const plan = assessment?.improvementPlan?.value ?? [];
  const org = ctx.assessment?.inputs?.organization;

  return [
    {
      title: 'Executive Summary',
      body: assessment?.ok
        ? `${org ? `${org} — ` : ''}${assessment.pilotRecommendation.value}`
        : 'Where execution breaks down — from Assessment and Execution Value.',
      kind: assessment?.ok ? 'Calculated' : (calc ? 'Estimated' : 'Demo'),
    },
    {
      title: 'Execution Score',
      body: score != null
        ? `${score}/100`
        : 'Complete Execution Value and Assessment.',
      kind: score != null ? (assessment?.ok ? 'Calculated' : 'Estimated') : 'Demo',
    },
    {
      title: 'Value Opportunity',
      body: recover != null
        ? `${formatCurrency(recover)} recoverable`
        : 'From Execution Value — quantify loss before Assessment.',
      kind: recover != null ? 'Estimated' : 'Demo',
    },
    {
      title: 'Top Risks',
      body: gaps.length
        ? gaps.slice(0, 3).map((gap) => `${gap.area} (${gap.severity})`).join(' · ')
        : priorities.length
          ? priorities.join(' · ')
          : 'Decision-point leakage, approval drift, registry gaps',
      kind: gaps.length ? 'Calculated' : (priorities.length ? 'Estimated' : 'Demo'),
    },
    {
      title: 'Improvement Roadmap',
      body: plan.length
        ? plan.slice(0, 2).map((item) => item.action).join(' ')
        : 'Remediation steps tied to gap areas and recoverable value.',
      kind: plan.length ? 'Calculated' : 'Demo',
    },
  ];
}

function renderDeliverables(root, ctx) {
  const list = root.querySelector('#pi-deliverable-list');
  if (!list) return;

  // Security (#586): deliverable body may include organization / gap free-text → textContent.
  while (list.firstChild) list.removeChild(list.firstChild);

  buildDeliverables(ctx).forEach((item) => {
    const li = document.createElement('li');
    li.className = 'pi-deliverable';

    const head = document.createElement('div');
    head.className = 'pi-deliverable-head';
    const title = document.createElement('h4');
    title.textContent = item.title;
    head.appendChild(title);

    const body = document.createElement('p');
    body.textContent = item.body;

    li.appendChild(head);
    li.appendChild(body);
    list.appendChild(li);
  });
}

function updateCta(root, ctx) {
  const cta = root.querySelector('#ev-cta-pilot-request');
  const hint = root.querySelector('#pi-cta-hint');

  if (cta) {
    cta.href = buildRequestUrl();
    cta.textContent = 'Request a pilot';
  }

  if (hint) {
    if (ctx.assessment?.results?.ok || ctx.calculator?.results) {
      hint.textContent = 'Your execution context will be included in the assessment.';
    } else {
      hint.textContent = '';
    }
  }
}

function refreshPilotSection() {
  const root = document.getElementById('pilot');
  if (!root) return;

  const ctx = loadPublicFunnelContext();
  renderJourney(root, ctx);
  renderDeliverables(root, ctx);
  updateCta(root, ctx);
  applyPilotHandoff(ctx);
}

if (typeof document !== 'undefined') {
  refreshPilotSection();
  document.addEventListener('executia:funnel-update', refreshPilotSection);
}

export {
  renderJourney,
  renderDeliverables,
  buildDeliverables,
  journeyDetail,
  refreshPilotSection,
};
