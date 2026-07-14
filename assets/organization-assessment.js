import {
  loadExecutionValue,
  formatCurrency,
  INDUSTRIES,
} from './execution-value-engine.js';
import {
  ASSESSMENT_DISCLOSURE,
  QUALIFICATION_FOCUS,
  EXECUTION_DOMAINS,
  calculateOrganizationAssessment,
  persistOrganizationAssessment,
  loadOrganizationAssessment,
} from './organization-assessment-engine.js';
import { applyEngineHandoff, applyPilotHandoff, notifyFunnelUpdate } from './public-funnel.js';

const SLIDER_FIELDS = [
  { id: 'authorityValidation', label: 'Authority validation — accountable ownership before action' },
  { id: 'governanceReadiness', label: 'Governance readiness — controls mapped to execution' },
  { id: 'executionQualification', label: 'Execution qualification — proof eligibility' },
  { id: 'evidenceAudit', label: 'Evidence & audit — proof at execution time' },
  { id: 'visibilityControl', label: 'Execution visibility — decision-to-outcome chain' },
];

const DEFAULT_OUTCOME =
  'Institutional qualification for governance readiness and execution authority validation.';

const REQUIRED_FIELDS = [
  { key: 'organization', label: 'Organization' },
  { key: 'contact', label: 'Contact person' },
];

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function industryLabel(id) {
  return INDUSTRIES.find((item) => item.id === id)?.label ?? id;
}

function validateInputs(inputs) {
  const missing = [];
  if (!inputs.organization?.trim()) missing.push('Organization');
  if (!inputs.contact?.trim()) missing.push('Contact person');
  return { ok: missing.length === 0, missing };
}

function applyKindClass(el, kind) {
  if (!el) return;
  el.classList.remove('oa-kind--estimated', 'oa-kind--calculated', 'oa-kind--demo');
  const map = {
    Estimated: 'oa-kind--estimated',
    Calculated: 'oa-kind--calculated',
    Demo: 'oa-kind--demo',
  };
  if (map[kind]) el.classList.add(map[kind]);
}

function setFlowKind(step, kind) {
  const kindEl = step?.querySelector('.oa-flow-step-kind');
  if (!kindEl) return;
  kindEl.textContent = kind ?? 'Calculated';
  applyKindClass(kindEl, kind);
}

function shortenGap(area) {
  const text = area.split('—')[0].split(' against ')[0].trim();
  return text.length > 42 ? `${text.slice(0, 39)}…` : text;
}

function renderGate(container, gateActions) {
  container.hidden = false;
  container.innerHTML =
    `<p class="oa-gate-title">Complete Execution Value first</p>` +
    `<a class="pill-btn primary" href="#execution-value">Go to Execution Value</a>`;
  if (gateActions) gateActions.hidden = true;
}

function renderGapChips(container, gaps) {
  if (!container) return;
  container.innerHTML = '';
  const top = gaps.slice(0, 3);
  if (!top.length) {
    container.hidden = true;
    return;
  }
  container.hidden = false;
  top.forEach((gap) => {
    const chip = document.createElement('span');
    chip.className = `oa-chip oa-chip--${gap.severity === 'High' ? 'high' : 'medium'}`;
    chip.textContent = shortenGap(gap.area);
    container.appendChild(chip);
  });
}

function renderFlow(flowRoot, result, calculatorPayload) {
  if (!flowRoot || !result?.ok) return;

  const calc = calculatorPayload.results;
  const gaps = result.gapAnalysis?.value ?? [];
  const orgName = result.inputs?.organization?.trim() || 'Your organization';

  const currentStep = flowRoot.querySelector('[data-oa-step="currentState"]');
  if (currentStep) {
    currentStep.querySelector('.oa-flow-step-value').textContent =
      `${result.executionQuality.value} · ${result.executionRisk.value} risk`;
    const detail = currentStep.querySelector('.oa-flow-step-detail');
    if (detail) {
      detail.textContent = gaps.length
        ? `${gaps.length} execution gap${gaps.length === 1 ? '' : 's'} · ${orgName}`
        : `Execution stable · ${orgName}`;
    }
    setFlowKind(currentStep, result.executionQuality.kind);
  }

  const scoreStep = flowRoot.querySelector('[data-oa-step="executionScore"]');
  if (scoreStep) {
    scoreStep.querySelector('.oa-flow-step-value').textContent =
      `${result.executionScore.value}/100`;
    const fill = scoreStep.querySelector('.oa-score-bar-fill');
    if (fill) fill.style.width = `${result.executionScore.value}%`;
    setFlowKind(scoreStep, result.executionScore.kind);
  }

  const lossStep = flowRoot.querySelector('[data-oa-step="estimatedLoss"]');
  if (lossStep) {
    lossStep.querySelector('.oa-flow-step-value').textContent =
      formatCurrency(calc.estimatedExecutionLoss?.value ?? 0);
    setFlowKind(lossStep, calc.estimatedExecutionLoss?.kind ?? 'Estimated');
  }

  const improveStep = flowRoot.querySelector('[data-oa-step="improvementOpportunity"]');
  if (improveStep) {
    improveStep.querySelector('.oa-flow-step-value').textContent =
      formatCurrency(calc.recoverableValue?.value ?? 0);
    setFlowKind(improveStep, calc.recoverableValue?.kind ?? 'Estimated');
    renderGapChips(improveStep.querySelector('#oa-gap-chips'), gaps);
  }

  const nextStep = flowRoot.querySelector('[data-oa-step="recommendedNextStep"]');
  if (nextStep) {
    const pilot = result.pilotRecommendation;
    const readiness = pilot?.readiness ?? 'Qualified';
    const short =
      readiness === 'Ready'
        ? 'Proceed to governed pilot'
        : readiness === 'Urgent'
          ? 'Executive-sponsored pilot recommended'
          : 'Scoped pilot with gap remediation';
    nextStep.querySelector('.oa-flow-step-value').textContent = short;
    const badge = nextStep.querySelector('.oa-readiness-badge');
    if (badge) {
      badge.hidden = false;
      badge.textContent = readiness;
      badge.className = `oa-readiness-badge oa-readiness-badge--${readiness.toLowerCase()}`;
    }
    setFlowKind(nextStep, pilot?.kind ?? 'Calculated');
  }
}

function markInvalidFields(form, inputs) {
  const orgField = form.elements.namedItem('organization');
  const contactField = form.elements.namedItem('contact');
  orgField?.closest('.oa-field')?.classList.toggle('is-invalid', !inputs.organization?.trim());
  contactField?.closest('.oa-field')?.classList.toggle('is-invalid', !inputs.contact?.trim());
}

function updateLivingEngineCta(complete, missing) {
  const cta = document.getElementById('oa-cta-living-engine');
  const hint = document.getElementById('oa-cta-engine-hint');
  if (!cta || !hint) return;

  if (complete) {
    cta.classList.remove('is-disabled');
    cta.setAttribute('aria-disabled', 'false');
    hint.textContent = 'Assessment complete. Run the Living Engine.';
  } else {
    cta.classList.add('is-disabled');
    cta.setAttribute('aria-disabled', 'true');
    hint.textContent = missing.length
      ? `Complete: ${missing.join(', ')}.`
      : 'Complete qualification inputs.';
  }
}

function initAssessment(root) {
  const disclosure = root.querySelector('.oa-disclosure');
  const gate = root.querySelector('#oa-calculator-gate');
  const workspace = root.querySelector('#oa-assessment-workspace');
  const form = root.querySelector('#oa-assessment-form');
  const flowRoot = root.querySelector('#oa-assessment-flow');
  const live = root.querySelector('#oa-assessment-live');
  const gateActions = root.querySelector('#oa-assessment-actions');
  const engineCta = root.querySelector('#oa-cta-living-engine');

  if (disclosure) disclosure.textContent = ASSESSMENT_DISCLOSURE;
  const focusList = root.querySelector('#oa-qualification-focus');
  if (focusList) {
    focusList.innerHTML = QUALIFICATION_FOCUS.map((item) => `<li>${item}</li>`).join('');
  }

  const domainSelect = form.querySelector('#oa-domain');
  EXECUTION_DOMAINS.forEach((domain) => {
    const option = document.createElement('option');
    option.value = domain;
    option.textContent = domain;
    domainSelect.appendChild(option);
  });

  form.querySelector('#oa-outcome').value = DEFAULT_OUTCOME;

  SLIDER_FIELDS.forEach(({ id, label }) => {
    const row = document.createElement('div');
    row.className = 'oa-slider-row';
    row.innerHTML =
      `<label for="oa-${id}">${label}</label>` +
      `<input type="range" id="oa-${id}" name="${id}" min="1" max="5" step="1" value="3">` +
      `<output for="oa-${id}">3</output>`;
    form.querySelector('#oa-sliders').appendChild(row);
    const input = row.querySelector('input');
    const output = row.querySelector('output');
    input.addEventListener('input', () => {
      output.textContent = input.value;
      recompute();
    });
  });

  if (engineCta) {
    engineCta.addEventListener('click', (event) => {
      if (engineCta.classList.contains('is-disabled')) {
        event.preventDefault();
      }
    });
  }

  function readInputs() {
    const selfAssessment = {};
    SLIDER_FIELDS.forEach(({ id }) => {
      selfAssessment[id] = form.elements.namedItem(id)?.value;
    });
    return {
      organization: form.elements.namedItem('organization')?.value,
      contact: form.elements.namedItem('contact')?.value,
      email: form.elements.namedItem('email')?.value,
      executionDomain: form.elements.namedItem('executionDomain')?.value,
      governanceOutcome: form.elements.namedItem('governanceOutcome')?.value,
      selfAssessment,
    };
  }

  const recompute = debounce(() => {
    const calculatorPayload = loadExecutionValue();
    if (!calculatorPayload?.results) {
      gate.hidden = false;
      workspace.hidden = true;
      renderGate(gate, gateActions);
      updateLivingEngineCta(false, ['Execution Value']);
      return;
    }

    gate.hidden = true;
    workspace.hidden = false;
    if (gateActions) gateActions.hidden = false;

    const inputs = readInputs();
    const validation = validateInputs(inputs);
    markInvalidFields(form, inputs);

    const result = calculateOrganizationAssessment(calculatorPayload, inputs);
    if (!result.ok) return;

    renderFlow(flowRoot, result, calculatorPayload);

    if (live) {
      live.textContent =
        `Diagnosis updated. Execution Score ${result.executionScore.value}/100 · ` +
        `${industryLabel(calculatorPayload.inputs?.industry)} · ${result.confidenceLevel.value} confidence.`;
    }

    updateLivingEngineCta(validation.ok, validation.missing);

    if (validation.ok) {
      persistOrganizationAssessment({
        calculatorSnapshot: calculatorPayload,
        inputs: result.inputs,
        results: result,
      });
      notifyFunnelUpdate();
      applyEngineHandoff();
      applyPilotHandoff();
    }
  }, 120);

  form.addEventListener('input', recompute);
  form.addEventListener('change', recompute);

  const stored = loadOrganizationAssessment();
  if (stored?.inputs) {
    Object.entries(stored.inputs).forEach(([key, value]) => {
      if (key === 'selfAssessment') return;
      const field = form.elements.namedItem(key);
      if (field && value != null) field.value = value;
    });
    if (stored.inputs.selfAssessment) {
      Object.entries(stored.inputs.selfAssessment).forEach(([key, value]) => {
        const field = form.elements.namedItem(key);
        if (field) {
          field.value = value;
          const output = field.parentElement?.querySelector('output');
          if (output) output.textContent = value;
        }
      });
    }
  }

  recompute();

  const pilotBtn = root.querySelector('#oa-cta-pilot');
  if (pilotBtn) {
    pilotBtn.addEventListener('click', (event) => {
      if (!loadOrganizationAssessment()?.results?.ok) {
        event.preventDefault();
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('organization-assessment-product');
  if (root) initAssessment(root);
  if (loadOrganizationAssessment()?.results?.ok) {
    applyEngineHandoff();
    applyPilotHandoff();
  }
});
