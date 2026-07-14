import {
  INDUSTRIES,
  MAJOR_RISK_OPTIONS,
  DEMO_DISCLOSURE,
  calculateExecutionValue,
  persistExecutionValue,
  loadExecutionValue,
  formatCurrency,
} from './execution-value-engine.js';
import { applyEngineHandoff, applyPilotHandoff, notifyFunnelUpdate } from './public-funnel.js';

const DEFAULTS = {
  industry: 'technology',
  annualRevenue: 120_000_000,
  employees: 850,
  countries: 3,
  activeProjects: 24,
  averageProjectValue: 2_500_000,
  ebitMargin: '',
  majorRisks: ['project-delivery', 'multi-site'],
};

const REQUIRED_FIELDS = [
  { key: 'industry', label: 'Industry', test: (raw) => Boolean(raw.industry) },
  {
    key: 'annualRevenue',
    label: 'Annual Revenue',
    test: (raw) => {
      const n = Number(raw.annualRevenue);
      return raw.annualRevenue !== '' && Number.isFinite(n) && n >= 1_000_000;
    },
  },
  {
    key: 'employees',
    label: 'Employees',
    test: (raw) => {
      const n = Number(raw.employees);
      return raw.employees !== '' && Number.isFinite(n) && n >= 10;
    },
  },
  {
    key: 'countries',
    label: 'Countries',
    test: (raw) => {
      const n = Number(raw.countries);
      return raw.countries !== '' && Number.isFinite(n) && n >= 1 && n <= 120;
    },
  },
  {
    key: 'activeProjects',
    label: 'Active Projects',
    test: (raw) => {
      const n = Number(raw.activeProjects);
      return raw.activeProjects !== '' && Number.isFinite(n) && n >= 1;
    },
  },
  {
    key: 'averageProjectValue',
    label: 'Average Project Value',
    test: (raw) => {
      const n = Number(raw.averageProjectValue);
      return raw.averageProjectValue !== '' && Number.isFinite(n) && n >= 10_000;
    },
  },
];

function buildRiskOptions(container) {
  MAJOR_RISK_OPTIONS.forEach((risk) => {
    const label = document.createElement('label');
    label.className = 'evc-risk';
    label.innerHTML =
      `<input type="checkbox" name="risk-${risk.id}" value="${risk.id}">` +
      `<span class="evc-risk-copy"><span class="evc-risk-label">${risk.label}</span></span>`;
    container.appendChild(label);
  });
}

const METRIC_KEYS = [
  'estimatedExecutionLoss',
  'recoverableValue',
  'executionScore',
];

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function readForm(form) {
  const data = new FormData(form);
  const majorRisks = MAJOR_RISK_OPTIONS.filter((risk) =>
    form.querySelector(`[name="risk-${risk.id}"]`)?.checked,
  ).map((risk) => risk.id);

  return {
    industry: data.get('industry'),
    annualRevenue: data.get('annualRevenue'),
    employees: data.get('employees'),
    countries: data.get('countries'),
    activeProjects: data.get('activeProjects'),
    averageProjectValue: data.get('averageProjectValue'),
    ebitMargin: data.get('ebitMargin'),
    majorRisks,
  };
}

function validateInputs(raw) {
  const missing = REQUIRED_FIELDS.filter((field) => !field.test(raw)).map((field) => field.label);
  return { ok: missing.length === 0, missing };
}

function applyKindClass(kindEl, kind) {
  if (!kindEl) return;
  const slug = String(kind ?? 'Demo').toLowerCase();
  kindEl.className = `evc-metric-kind evc-kind--${slug}`;
  kindEl.textContent = kind ?? 'Demo';
}

function renderMetric(container, key, metric, className = '') {
  const node = container.querySelector(`[data-metric="${key}"]`);
  if (!node) return;
  const valueEl = node.querySelector('.evc-metric-value');
  const kindEl = node.querySelector('.evc-metric-kind');
  applyKindClass(kindEl, metric.kind);

  if (Array.isArray(metric.value)) {
    valueEl.innerHTML = '';
    const list = document.createElement('ul');
    list.className = 'evc-priority-list';
    metric.value.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      list.appendChild(li);
    });
    valueEl.appendChild(list);
    return;
  }

  let display = String(metric.value);
  if (display === '—') {
    valueEl.textContent = display;
    valueEl.className = `evc-metric-value ${className}`.trim();
    return;
  }
  if (key.includes('Loss') || key.includes('recoverable') || key.includes('enterprise')) {
    display = formatCurrency(metric.value);
  } else if (metric.unit === '%') {
    display = `${metric.value}%`;
  } else if (metric.unit === 'months') {
    display = `${metric.value} months`;
  } else if (metric.unit === '/100') {
    display = `${metric.value}${metric.unit}`;
  }

  valueEl.textContent = display;
  valueEl.className = `evc-metric-value ${className}`.trim();
}

function renderChart(results, chartRoot) {
  const max = Math.max(results.visualization.executionLoss, 1);
  const rows = [
    { key: 'loss', label: 'Execution Loss', value: results.visualization.executionLoss, className: 'loss' },
    { key: 'recovered', label: 'Recovered Value', value: results.visualization.recoverableValue, className: 'recovered' },
    { key: 'enterprise', label: 'Enterprise Value', value: results.visualization.enterpriseValueCreated, className: 'enterprise' },
  ];

  rows.forEach((row) => {
    const bar = chartRoot.querySelector(`[data-bar="${row.key}"]`);
    const pct = chartRoot.querySelector(`[data-pct="${row.key}"]`);
    if (!bar || !pct) return;
    const width = Math.max(4, Math.round((row.value / max) * 100));
    bar.style.width = `${width}%`;
    pct.textContent = `${Math.round((row.value / results.inputs.annualRevenue) * 1000) / 10}% rev`;
  });
}

function renderPlaceholderResults(ui) {
  METRIC_KEYS.forEach((key) => {
    renderMetric(ui.results, key, { kind: 'Demo', value: '—' });
  });

  ['loss', 'recovered', 'enterprise'].forEach((key) => {
    const bar = ui.chart.querySelector(`[data-bar="${key}"]`);
    const pct = ui.chart.querySelector(`[data-pct="${key}"]`);
    if (bar) bar.style.width = '0';
    if (pct) pct.textContent = '—';
  });

  ui.live.textContent = '';
}

function markInvalidFields(form, raw) {
  REQUIRED_FIELDS.forEach((field) => {
    const control = form.elements.namedItem(field.key);
    const wrap = control?.closest('.evc-field');
    if (!wrap) return;
    const invalid = !field.test(raw);
    wrap.classList.toggle('is-invalid', invalid);
    if (control) control.setAttribute('aria-invalid', invalid ? 'true' : 'false');
  });
}

function updateAssessmentCta(ui, validation, hasResults) {
  const { cta, ctaHint } = ui;
  if (!cta || !ctaHint) return;

  const ready = validation.ok && hasResults;
  cta.classList.toggle('is-disabled', !ready);
  cta.setAttribute('aria-disabled', ready ? 'false' : 'true');

  if (!validation.ok) {
    ctaHint.textContent = 'Complete required fields.';
    return;
  }

  if (!hasResults) {
    ctaHint.textContent = 'Enter your organization profile.';
    return;
  }

  ctaHint.textContent = 'Continue to the Living Engine.';
}

function renderResults(results, ui) {
  renderMetric(ui.results, 'estimatedExecutionLoss', results.estimatedExecutionLoss, 'loss');
  renderMetric(ui.results, 'recoverableValue', results.recoverableValue, 'gain');
  renderMetric(ui.results, 'enterpriseValueCreated', results.enterpriseValueCreated, 'gain');
  renderMetric(ui.results, 'executionScore', results.executionScore);
  renderMetric(ui.results, 'executionRisk', results.executionRisk);
  renderMetric(ui.results, 'executionQuality', results.executionQuality);
  renderMetric(ui.results, 'estimatedRoi', results.estimatedRoi);
  renderMetric(ui.results, 'estimatedPayback', results.estimatedPayback);
  renderMetric(ui.results, 'priorityImprovementAreas', results.priorityImprovementAreas);
  renderMetric(ui.results, 'confidenceLevel', results.confidenceLevel);
  renderChart(results, ui.chart);

  ui.live.textContent = '';

  persistExecutionValue({ inputs: results.inputs, results });
  notifyFunnelUpdate();
  applyEngineHandoff();
  applyPilotHandoff();
}

function buildIndustryOptions(select) {
  INDUSTRIES.forEach((industry) => {
    const option = document.createElement('option');
    option.value = industry.id;
    option.textContent = industry.label;
    select.appendChild(option);
  });
}

function initCalculator(root) {
  const form = root.querySelector('#ev-calculator-form');
  const results = root.querySelector('#ev-calculator-results');
  const chart = root.querySelector('#ev-calculator-chart');
  const live = root.querySelector('#ev-calculator-live');
  const cta = root.querySelector('#ev-cta-assessment');
  const ctaHint = root.querySelector('#ev-cta-assessment-hint');

  const ui = { results, chart, live, cta, ctaHint };

  const disclosure = root.querySelector('.evc-disclosure');
  if (disclosure) disclosure.textContent = DEMO_DISCLOSURE;

  buildIndustryOptions(form.querySelector('#ev-industry'));
  buildRiskOptions(form.querySelector('#ev-risks'));

  Object.entries(DEFAULTS).forEach(([key, value]) => {
    if (key === 'majorRisks') {
      value.forEach((id) => {
        const input = form.querySelector(`[name="risk-${id}"]`);
        if (input) input.checked = true;
      });
      return;
    }
    const field = form.elements.namedItem(key);
    if (field) field.value = value;
  });

  const recompute = debounce(() => {
    const payload = readForm(form);
    const validation = validateInputs(payload);
    markInvalidFields(form, payload);

    if (!validation.ok) {
      renderPlaceholderResults(ui);
      updateAssessmentCta(ui, validation, false);
      return;
    }

    const calculated = calculateExecutionValue(payload);
    renderResults(calculated, ui);
    updateAssessmentCta(ui, validation, true);
  }, 120);

  form.addEventListener('input', recompute);
  form.addEventListener('change', recompute);

  if (cta) {
    cta.addEventListener('click', (event) => {
      if (cta.classList.contains('is-disabled')) event.preventDefault();
    });
  }

  recompute();

  const stored = loadExecutionValue();
  if (stored?.inputs) {
    Object.entries(stored.inputs).forEach(([key, value]) => {
      if (key === 'majorRisks') {
        MAJOR_RISK_OPTIONS.forEach((risk) => {
          const input = form.querySelector(`[name="risk-${risk.id}"]`);
          if (input) input.checked = value.includes(risk.id);
        });
        return;
      }
      const field = form.elements.namedItem(key);
      if (field && value != null) field.value = value;
    });
    recompute();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('execution-value-calculator');
  if (root) initCalculator(root);
  const stored = loadExecutionValue();
  if (stored?.results) {
    applyEngineHandoff();
    applyPilotHandoff();
  }
});
