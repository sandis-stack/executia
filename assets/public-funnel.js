/**
 * Public funnel context — single session bridge for ENTRY funnel.
 * Execution Value → Assessment → Engine → Pilot → ONE
 */

import { loadExecutionValue, formatCurrency } from './execution-value-engine.js';
import { loadOrganizationAssessment, ASSESSMENT_STORAGE_KEY } from './organization-assessment-engine.js';

export const ENGINE_RUN_KEY = 'executia.publicFunnel.engine.v1';

export function loadEngineRun() {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(ENGINE_RUN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function persistEngineRun(payload) {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(ENGINE_RUN_KEY, JSON.stringify({
    ...payload,
    recordedAt: new Date().toISOString(),
  }));
  notifyFunnelUpdate();
}

export function notifyFunnelUpdate() {
  if (typeof document === 'undefined') return;
  document.dispatchEvent(new CustomEvent('executia:funnel-update'));
}

/** @returns {{ calculator: object|null, assessment: object|null, engine: object|null }} */
export function loadPublicFunnelContext() {
  return {
    calculator: loadExecutionValue(),
    assessment: loadOrganizationAssessment(),
    engine: loadEngineRun(),
  };
}

export function funnelIsReady(stage) {
  const ctx = loadPublicFunnelContext();
  switch (stage) {
    case 'calculator':
      return Boolean(ctx.calculator?.results);
    case 'assessment':
      return Boolean(ctx.assessment?.results?.ok);
    case 'engine':
      return Boolean(ctx.engine?.completed);
    case 'pilot':
      return funnelIsReady('assessment');
    case 'one':
      return funnelIsReady('assessment');
    default:
      return false;
  }
}

export function priorityAreas(ctx) {
  const assessment = ctx.assessment?.results;
  const calculator = ctx.calculator?.results;
  const gaps = assessment?.gapAnalysis?.value?.map((g) => g.area) ?? [];
  const calcPriorities = calculator?.priorityImprovementAreas?.value ?? [];
  return [...new Set([...gaps.slice(0, 2), ...calcPriorities.slice(0, 2)])].slice(0, 3);
}

export function refinedExecutionScore(ctx) {
  return ctx.assessment?.results?.executionScore?.value
    ?? ctx.calculator?.results?.executionScore?.value
    ?? null;
}

export function recoverableValue(ctx) {
  return ctx.calculator?.results?.recoverableValue?.value ?? null;
}

export function missionContext(ctx) {
  const engineMission = ctx.engine?.missionText;
  if (engineMission) return engineMission;
  const recover = recoverableValue(ctx);
  if (recover != null) {
    return `Govern mission portfolio — recover ${formatCurrency(recover)} execution value (demo)`;
  }
  return '';
}

export function engineScenarioSummary(ctx) {
  const engine = ctx.engine;
  if (!engine?.completed) return null;
  const outputs = engine.outputs;
  if (!outputs) {
    return {
      mission: engine.missionText,
      score: engine.executionScore ?? null,
      decision: engine.decision,
    };
  }
  return {
    mission: outputs.missionSummary?.headline ?? engine.missionText,
    score: outputs.executionScore?.value ?? engine.executionScore,
    readiness: engine.executionReadiness ?? outputs.executionScore?.value,
    budget: outputs.estimatedBudget?.total,
    timelineMonths: outputs.estimatedTimeline?.months,
    risks: outputs.executionRisks?.count,
    pilotReadiness: outputs.recommendedNextActions?.readiness,
    decision: engine.decision,
  };
}

/** @typedef {'complete'|'active'|'pending'} JourneyStatus */

/**
 * Live hero journey — reflects funnel session state (no fabricated metrics).
 * @param {ReturnType<typeof loadPublicFunnelContext>} [ctx]
 */
export function buildFunnelJourney(ctx = loadPublicFunnelContext()) {
  const calc = ctx.calculator?.results;
  const assessment = ctx.assessment?.results;
  const engine = ctx.engine;
  const engineSummary = engineScenarioSummary(ctx);
  const refinedScore = refinedExecutionScore(ctx);

  const steps = [
    {
      id: 'mission',
      label: 'Mission',
      complete: Boolean(engine?.missionText),
      detail: engine?.missionText
        ? engine.missionText.slice(0, 56)
        : 'Enter your business objective',
      kind: engine?.missionText ? 'Calculated' : 'Demo',
      href: '#living-engine',
    },
    {
      id: 'execution-value',
      label: 'Execution Value',
      complete: Boolean(calc),
      detail: calc
        ? `Score ${calc.executionScore.value}/100`
        : 'Not calculated',
      kind: calc ? 'Estimated' : 'Demo',
      href: '#execution-value',
    },
    {
      id: 'assessment',
      label: 'Assessment',
      complete: Boolean(assessment?.ok),
      detail: assessment?.ok
        ? `Score ${assessment.executionScore.value}/100`
        : 'Not completed',
      kind: assessment?.ok ? 'Calculated' : 'Demo',
      href: '#organization-assessment',
    },
    {
      id: 'living-engine',
      label: 'Living Engine',
      complete: Boolean(engine?.completed),
      detail: engine?.completed
        ? (engineSummary?.readiness != null
          ? `Readiness ${engineSummary.readiness}%`
          : 'Execution scenario ready')
        : 'Not built',
      kind: engine?.completed ? 'Demonstration' : 'Demo',
      href: '#living-engine',
    },
    {
      id: 'pilot',
      label: 'Pilot Ready',
      complete: Boolean(assessment?.ok),
      detail: assessment?.ok
        ? assessment.pilotRecommendation.readiness
        : 'Complete assessment',
      kind: assessment?.ok ? 'Calculated' : 'Demo',
      href: '#pilot',
    },
    {
      id: 'one',
      label: 'ONE Ready',
      complete: Boolean(assessment?.ok),
      detail: assessment?.ok && refinedScore != null
        ? `Score ${refinedScore}/100 · context preserved`
        : 'Complete assessment',
      kind: assessment?.ok ? 'Calculated' : 'Demo',
      href: '#one-core',
    },
  ];

  const firstIncomplete = steps.findIndex((step) => !step.complete);
  return steps.map((step, index) => ({
    ...step,
    status: step.complete
      ? 'complete'
      : index === firstIncomplete
        ? 'active'
        : 'pending',
  }));
}

export function buildFunnelSummary(ctx = loadPublicFunnelContext()) {
  const lines = [];
  const calc = ctx.calculator?.results;
  const assessment = ctx.assessment?.results;
  const engine = ctx.engine;

  if (calc) {
    lines.push(`Estimated execution loss: ${formatCurrency(calc.estimatedExecutionLoss.value)}`);
    lines.push(`Recoverable value (estimated): ${formatCurrency(calc.recoverableValue.value)}`);
    lines.push(`Calculator Execution Score: ${calc.executionScore.value}/100`);
  }
  if (assessment?.ok) {
    lines.push(`Refined Execution Score: ${assessment.executionScore.value}/100`);
    lines.push(`Pilot readiness: ${assessment.pilotRecommendation.readiness}`);
    lines.push(`Pilot recommendation: ${assessment.pilotRecommendation.value}`);
    lines.push(`Gap analysis areas: ${assessment.gapAnalysis.value.length}`);
    lines.push(`Priority areas: ${priorityAreas(ctx).join('; ')}`);
  }
  if (engine?.completed) {
    const summary = engineScenarioSummary(ctx);
    lines.push(`Living Engine: ${engine.decision ?? 'EXECUTION_READY'} — demonstration scenario`);
    lines.push(`Engine mission: ${summary?.mission ?? engine.missionText}`);
    if (summary?.score != null) lines.push(`Engine Execution Score: ${summary.score}/100`);
    if (summary?.timelineMonths != null) lines.push(`Estimated timeline: ${summary.timelineMonths} months`);
    if (summary?.budget != null) lines.push(`Estimated budget: ${formatCurrency(summary.budget)}`);
    if (summary?.risks != null) lines.push(`Execution risks identified: ${summary.risks}`);
    if (summary?.pilotReadiness) lines.push(`Pilot readiness: ${summary.pilotReadiness}`);
  }
  lines.push('Note: Estimated demonstration values — verify in formal assessment.');
  return lines.join('\n');
}

export function buildRequestUrl() {
  const ctx = loadPublicFunnelContext();
  const params = new URLSearchParams({ source: 'public-funnel' });
  const score = refinedExecutionScore(ctx);
  if (score != null) params.set('executionScore', String(score));
  if (recoverableValue(ctx) != null) params.set('recoverableValue', String(recoverableValue(ctx)));
  if (ctx.assessment?.results?.pilotRecommendation?.readiness) {
    params.set('pilotReadiness', ctx.assessment.results.pilotRecommendation.readiness);
  }
  if (ctx.calculator?.results?.estimatedExecutionLoss?.value != null) {
    params.set('estimatedLoss', String(ctx.calculator.results.estimatedExecutionLoss.value));
  }
  if (ctx.engine?.completed) {
    params.set('engineDemo', '1');
    const summary = engineScenarioSummary(ctx);
    if (summary?.mission) params.set('mission', summary.mission.slice(0, 120));
    if (summary?.readiness != null) params.set('executionReadiness', String(summary.readiness));
  }
  return `/request?${params.toString()}`;
}

export function buildOneUrl() {
  const ctx = loadPublicFunnelContext();
  const params = new URLSearchParams({ source: 'executia-entry-funnel' });
  const score = refinedExecutionScore(ctx);
  if (score != null) params.set('executionScore', String(score));
  if (ctx.assessment?.inputs?.organization) {
    params.set('organization', ctx.assessment.inputs.organization);
  }
  const engineSummary = engineScenarioSummary(ctx);
  if (engineSummary?.mission) params.set('mission', engineSummary.mission.slice(0, 120));
  else if (ctx.engine?.missionText) params.set('mission', ctx.engine.missionText.slice(0, 120));
  if (engineSummary?.score != null) params.set('engineScore', String(engineSummary.score));
  return `https://one.executia.io/?${params.toString()}`;
}

export function applyEngineHandoff(ctx = loadPublicFunnelContext()) {
  const banner = document.getElementById('ev-engine-handoff');
  const missionInput = document.getElementById('living-engine-input')
    ?? document.getElementById('demo-input');
  if (!banner && !missionInput) return;

  const score = refinedExecutionScore(ctx);
  const recover = recoverableValue(ctx);
  const priorities = priorityAreas(ctx);
  const parts = [];

  if (score != null) parts.push(`Execution Score ${score}/100`);
  if (recover != null) parts.push(`Recoverable ${formatCurrency(recover)}`);
  if (priorities.length) parts.push(`Priority: ${priorities[0]}`);

  if (ctx.assessment?.results?.ok) {
    parts.unshift('Assessment context consumed');
  } else if (ctx.calculator?.results) {
    parts.unshift('Calculator context');
  }

  if (ctx.engine?.completed) {
    const summary = engineScenarioSummary(ctx);
    if (summary?.score != null) parts.push(`Engine score ${summary.score}/100`);
  }

  if (banner && parts.length) {
    banner.hidden = false;
    banner.innerHTML = `<strong>Funnel context (Demo):</strong> ${parts.join(' · ')}.`;
  }

  if (missionInput && !missionInput.value?.trim()) {
    const suggested = missionContext(ctx);
    if (suggested) missionInput.value = suggested;
    else if (priorities.length) {
      missionInput.placeholder = `e.g. Address ${priorities[0]} across the organization`;
    }
  }
}

export function applyPilotHandoff(ctx = loadPublicFunnelContext()) {
  const host = document.getElementById('ev-pilot-handoff');
  const cta = document.getElementById('ev-cta-pilot-request');
  if (!ctx.assessment?.results?.ok) {
    if (host) host.hidden = true;
    return;
  }

  const res = ctx.assessment.results;
  if (host) {
    host.hidden = false;
    host.className = 'evc-handoff oa-pilot-handoff';
    let html =
      `<strong>Funnel context (Calculated):</strong> Execution Score ${res.executionScore.value}/100 · ` +
      `${res.pilotRecommendation.value}`;
    if (ctx.engine?.completed) {
      const summary = engineScenarioSummary(ctx);
      html += ` · Living Engine: ${summary?.mission?.slice(0, 48) ?? 'scenario ready'}…`;
    }
    host.innerHTML = html;
  }

  if (cta) {
    cta.href = buildRequestUrl();
  }
}

export function applyOneHandoff() {
  const ctx = loadPublicFunnelContext();
  const signIn = document.getElementById('ev-cta-one-signin');
  const banner = document.getElementById('ev-one-handoff');
  if (!funnelIsReady('assessment')) {
    if (banner) banner.hidden = true;
    return;
  }

  const score = refinedExecutionScore(ctx);
  if (signIn) signIn.href = buildOneUrl();

  if (banner) {
    banner.hidden = false;
    banner.className = 'evc-handoff';
    banner.innerHTML =
      `<strong>Funnel context preserved:</strong> Execution Score ${score}/100 · ` +
      `Mission: ${missionContext(ctx).slice(0, 80)}… · Sign in without re-entering assessment data.`;
  }
}

export function prefillRequestForm(form) {
  if (!form) return;
  const ctx = loadPublicFunnelContext();
  const params = new URLSearchParams(location.search);
  const source = params.get('source');
  if (source !== 'public-funnel' && source !== 'organization-assessment' && source !== 'execution-value-calculator') {
    if (!ctx.assessment?.results?.ok && !ctx.calculator?.results) return;
  }

  const org = form.querySelector('#organization');
  const operator = form.querySelector('#operator');
  const email = form.querySelector('#email');
  const sector = form.querySelector('#sector');
  const context = form.querySelector('#context');

  if (ctx.assessment?.inputs) {
    if (org && ctx.assessment.inputs.organization) org.value = ctx.assessment.inputs.organization;
    if (operator && ctx.assessment.inputs.contact) operator.value = ctx.assessment.inputs.contact;
    if (email && ctx.assessment.inputs.email) email.value = ctx.assessment.inputs.email;
    if (sector && ctx.assessment.inputs.executionDomain) {
      for (const opt of sector.options) {
        if (opt.value === ctx.assessment.inputs.executionDomain) {
          sector.value = opt.value;
          break;
        }
      }
    }
  }

  if (context) context.value = buildFunnelSummary(ctx);
}

export function initPublicFunnelIntegration() {
  const ctx = loadPublicFunnelContext();
  applyEngineHandoff(ctx);
  applyPilotHandoff(ctx);
  applyOneHandoff();
  prefillRequestForm(document.getElementById('request-form'));
}

/** Storage keys exported for tests */
export const STORAGE_KEYS = {
  calculator: 'executia.executionValue.v1',
  assessment: ASSESSMENT_STORAGE_KEY,
  engine: ENGINE_RUN_KEY,
};
