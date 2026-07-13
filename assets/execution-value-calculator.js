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

function renderMetric(container, key, metric, className = '') {
  const node = container.querySelector(`[data-metric="${key}"]`);
  if (!node) return;
  const valueEl = node.querySelector('.evc-metric-value');
  const kindEl = node.querySelector('.evc-metric-kind');
  if (kindEl) kindEl.textContent = metric.kind;

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

  ui.live.textContent = `Updated. ${results.estimatedExecutionLoss.label}: ${formatCurrency(results.estimatedExecutionLoss.value)}. ${results.confidenceLevel.label}: ${results.confidenceLevel.value}. ${DEMO_DISCLOSURE}`;

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

function buildRiskOptions(container) {
  MAJOR_RISK_OPTIONS.forEach((risk) => {
    const label = document.createElement('label');
    label.className = 'evc-risk';
    label.innerHTML = `<input type="checkbox" name="risk-${risk.id}" value="${risk.id}"> <span>${risk.label}</span>`;
    container.appendChild(label);
  });
}

function initCalculator(root) {
  const form = root.querySelector('#ev-calculator-form');
  const results = root.querySelector('#ev-calculator-results');
  const chart = root.querySelector('#ev-calculator-chart');
  const live = root.querySelector('#ev-calculator-live');

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
    const calculated = calculateExecutionValue(payload);
    renderResults(calculated, { results, chart, live });
  }, 120);

  form.addEventListener('input', recompute);
  form.addEventListener('change', recompute);
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

function initAssessmentCta() {
  const btn = document.getElementById('ev-cta-assessment');
  if (!btn) return;
  btn.addEventListener('click', (event) => {
    if (!loadExecutionValue()?.results) event.preventDefault();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('execution-value-calculator');
  if (root) initCalculator(root);
  initAssessmentCta();
  const stored = loadExecutionValue();
  if (stored?.results) {
    applyEngineHandoff();
    applyPilotHandoff();
  }
});
