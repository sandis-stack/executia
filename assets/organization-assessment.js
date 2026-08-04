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

function renderBaseline(container, calculatorPayload) {
  const r = calculatorPayload.results;
  container.hidden = false;
  container.innerHTML =
    `<strong>Calculator baseline consumed (Estimated demonstration values)</strong>` +
    `<dl>` +
    `<dt>Estimated Execution Loss</dt><dd>${formatCurrency(r.estimatedExecutionLoss.value)}</dd>` +
    `<dt>Recoverable Value</dt><dd>${formatCurrency(r.recoverableValue.value)}</dd>` +
    `<dt>Calculator Execution Score</dt><dd>${r.executionScore.value}/100</dd>` +
    `<dt>Industry</dt><dd>${industryLabel(calculatorPayload.inputs?.industry)}</dd>` +
    `<dt>Confidence</dt><dd>${r.confidenceLevel.value}</dd>` +
    `</dl>`;
}

function renderGate(container, gateActions) {
  container.hidden = false;
  container.innerHTML =
    `<p>Organization Assessment requires Execution Value Calculator results.</p>` +
    `<a class="pill-btn primary" href="#execution-value">Complete Execution Value Calculator</a>`;
  gateActions.hidden = true;
}

function renderMetric(root, key, data) {
  const node = root.querySelector(`[data-oa-metric="${key}"]`);
  if (!node || !data) return;
  const kindEl = node.querySelector('.oa-metric-kind');
  const valueEl = node.querySelector('.oa-metric-value');
  if (kindEl) kindEl.textContent = data.kind ?? 'Calculated';

  if (key === 'gapAnalysis') {
    valueEl.innerHTML = '';
    const list = document.createElement('ul');
    list.className = 'oa-gap-list';
    (data.value ?? []).forEach((gap) => {
      const li = document.createElement('li');
      li.textContent = `${gap.area} (${gap.severity} · ${gap.kind})`;
      list.appendChild(li);
    });
    valueEl.appendChild(list);
    return;
  }

  if (key === 'improvementPlan') {
    valueEl.innerHTML = '';
    const list = document.createElement('ol');
    list.className = 'oa-plan-list';
    (data.value ?? []).forEach((item) => {
      const li = document.createElement('li');
      li.textContent = `${item.action} (${item.kind})`;
      list.appendChild(li);
    });
    valueEl.appendChild(list);
    return;
  }

  if (key === 'valueReport') {
    const report = data.value;
    valueEl.innerHTML =
      `<div class="oa-report">` +
      `<p><strong>${report.organization}</strong> · ${report.executionDomain}</p>` +
      `<p>Baseline loss ${formatCurrency(report.calculatorBaseline.estimatedExecutionLoss.value)} · ` +
      `Recoverable ${formatCurrency(report.calculatorBaseline.recoverableValue.value)} · ` +
      `Refined score ${report.assessmentSummary.refinedExecutionScore}/100</p>` +
      `<p><em>${data.kind} — derived from calculator demonstration values.</em></p>` +
      `</div>`;
    return;
  }

  let text = String(data.value ?? '—');
  if (data.unit === '/100') text = `${data.value}${data.unit}`;
  if (data.readiness) text = `${text} (${data.readiness})`;
  valueEl.textContent = text;
}

function initAssessment(root) {
  const disclosure = root.querySelector('.oa-disclosure');
  const gate = root.querySelector('#oa-calculator-gate');
  const workspace = root.querySelector('#oa-assessment-workspace');
  const baseline = root.querySelector('#oa-calculator-baseline');
  const form = root.querySelector('#oa-assessment-form');
  const resultsRoot = root.querySelector('#oa-assessment-results');
  const live = root.querySelector('#oa-assessment-live');
  const gateActions = root.querySelector('#oa-assessment-actions');

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
      return;
    }

    gate.hidden = true;
    workspace.hidden = false;
    gateActions.hidden = false;
    renderBaseline(baseline, calculatorPayload);

    const result = calculateOrganizationAssessment(calculatorPayload, readInputs());
    if (!result.ok) return;

    [
      'executionScore',
      'gapAnalysis',
      'valueReport',
      'improvementPlan',
      'pilotRecommendation',
      'executionRisk',
      'executionQuality',
      'confidenceLevel',
    ].forEach((key) => renderMetric(resultsRoot, key, result[key]));

    live.textContent =
      `Assessment updated. Execution Score ${result.executionScore.value}. ${result.meta.disclosure}`;

    persistOrganizationAssessment({
      calculatorSnapshot: calculatorPayload,
      inputs: result.inputs,
      results: result,
    });
    notifyFunnelUpdate();
    applyEngineHandoff();
    applyPilotHandoff();
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
