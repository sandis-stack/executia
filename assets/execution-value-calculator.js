import {
  INDUSTRIES,
  MAJOR_RISK_OPTIONS,
  DEMO_DISCLOSURE,
  calculateExecutionValue,
  persistExecutionValue,
  formatCurrency,
  validateOrganizationInputs,
} from './execution-value-engine.js';
import { applyEngineHandoff, applyPilotHandoff, notifyFunnelUpdate } from './public-funnel.js';
import {
  CURRENCIES,
  CURRENCY_CODES,
  FX_AS_OF,
  formatMoney,
  loadSessionCurrency,
  resolveCurrency,
  saveSessionCurrency,
} from './calculator-currency.js';
import {
  HEADCOUNT_BANDS,
  bandForId,
  calculateSmallBusinessLoss,
} from './small-business-loss.js';

const SCORE_EXPLAIN =
  'Execution Score estimates how much friction sits between decisions and results (higher is healthier). Missing optional fields do not raise the score.';

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function buildRiskOptions(container) {
  container.innerHTML = '';
  MAJOR_RISK_OPTIONS.forEach((risk) => {
    const label = document.createElement('label');
    label.className = 'evc-risk';
    label.innerHTML =
      `<input type="checkbox" name="risk-${risk.id}" value="${risk.id}">` +
      `<span class="evc-risk-copy"><span class="evc-risk-label">${risk.label}</span></span>`;
    container.appendChild(label);
  });
}

function buildIndustryOptions(select) {
  select.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Select industry';
  placeholder.disabled = true;
  placeholder.selected = true;
  select.appendChild(placeholder);
  INDUSTRIES.forEach((industry) => {
    const option = document.createElement('option');
    option.value = industry.id;
    option.textContent = industry.label;
    select.appendChild(option);
  });
}

function readOrgForm(form) {
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

function readSmallForm(form) {
  const data = new FormData(form);
  return {
    people: Number(data.get('people')),
    hourlyCost: Number(data.get('hourlyCost')),
    hoursPerWeek: Number(data.get('hoursPerWeek')),
    stuckPerMonth: Number(data.get('stuckPerMonth')),
    delayWeekCost: Number(data.get('delayWeekCost')),
  };
}

function setFieldMessage(form, key, message) {
  const control = form.elements.namedItem(key);
  const wrap = control?.closest('.evc-field');
  if (!wrap) return;
  wrap.classList.toggle('is-invalid', Boolean(message));
  if (control) control.setAttribute('aria-invalid', message ? 'true' : 'false');
  let hint = wrap.querySelector('.evc-inline-msg');
  if (!hint) {
    hint = document.createElement('p');
    hint.className = 'evc-inline-msg';
    wrap.appendChild(hint);
  }
  hint.textContent = message || '';
  hint.hidden = !message;
}

function clearFieldMessages(form) {
  form.querySelectorAll('.evc-inline-msg').forEach((el) => {
    el.textContent = '';
    el.hidden = true;
  });
  form.querySelectorAll('.evc-field.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
}

function money(value, currency) {
  return formatMoney(value, currency);
}

function buildSmallRequestUrl(state) {
  const params = new URLSearchParams({
    source: 'calculator',
    mode: 'small',
    people: String(state.people),
    currency: state.currency,
    annualLoss: String(state.annualLoss),
    hours: String(state.hoursPerYear),
  });
  return `/request?${params.toString()}`;
}

function buildOrgRequestUrl(results, currency) {
  const params = new URLSearchParams({
    source: 'calculator',
    mode: 'org',
    currency,
    annualLoss: String(results.estimatedExecutionLoss.value),
    recoverable: String(results.recoverableValue.value),
    executionScore: String(results.executionScore.value),
  });
  return `/request?${params.toString()}`;
}

function initCalculator(root) {
  const modeHint = root.querySelector('#ev-mode-hint');
  const bandGroup = root.querySelector('#ev-headcount-band');
  const smallPanel = root.querySelector('[data-mode-panel="small"]');
  const orgPanel = root.querySelector('[data-mode-panel="org"]');
  const smallForm = root.querySelector('#ev-small-form');
  const orgForm = root.querySelector('#ev-calculator-form');
  const resultsRoot = root.querySelector('#ev-calculator-results');
  const chart = root.querySelector('#ev-calculator-chart');
  const smallResults = root.querySelector('#ev-small-results');
  const orgResultsWrap = root.querySelector('#ev-org-results-wrap');
  const currencySelect = root.querySelector('#ev-currency');
  const cta = root.querySelector('#ev-cta-assessment');
  const ctaHint = root.querySelector('#ev-cta-assessment-hint');
  const scoreExplain = root.querySelector('#ev-score-explain');
  const fxNote = root.querySelector('#ev-fx-note');

  const geoCountry =
    document.querySelector('meta[name="executia-geo-country"]')?.content ||
    root.dataset.geoCountry ||
    '';

  let currency = resolveCurrency({
    country: geoCountry || null,
    stored: loadSessionCurrency(),
  });
  let bandId = '1-9';
  let mode = 'small';
  let lastSmall = null;
  let lastOrg = null;

  function fillCurrencySelect() {
    if (!currencySelect) return;
    currencySelect.innerHTML = '';
    CURRENCY_CODES.forEach((code) => {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = CURRENCIES[code].label;
      if (code === currency) opt.selected = true;
      currencySelect.appendChild(opt);
    });
  }

  function applySmallDefaults(preserveTyped) {
    const band = bandForId(bandId);
    const c = CURRENCIES[currency] || CURRENCIES.USD;
    const people = smallForm.elements.namedItem('people');
    const hourly = smallForm.elements.namedItem('hourlyCost');
    const hours = smallForm.elements.namedItem('hoursPerWeek');
    const stuck = smallForm.elements.namedItem('stuckPerMonth');
    const delay = smallForm.elements.namedItem('delayWeekCost');
    if (!preserveTyped || !people.value) people.value = String(band.peopleDefault);
    if (!preserveTyped || !hourly.value) hourly.value = String(c.hourlyDefault);
    if (!preserveTyped || !hours.value) hours.value = '4';
    if (!preserveTyped || !stuck.value) stuck.value = '3';
    if (!preserveTyped || !delay.value) delay.value = String(c.delayWeekDefault);
    // Always refresh currency-linked defaults when currency changes
    if (preserveTyped === 'currency') {
      hourly.value = String(c.hourlyDefault);
      delay.value = String(c.delayWeekDefault);
    }
  }

  function setMode(nextMode, nextBandId) {
    if (nextBandId) bandId = nextBandId;
    mode = nextMode;
    const band = bandForId(bandId);
    if (modeHint) {
      modeHint.textContent =
        band.mode === 'small'
          ? 'Under 50 people, we use a simpler calculation based on time.'
          : 'For larger organizations, we use the full portfolio model.';
    }
    if (smallPanel) smallPanel.hidden = mode !== 'small';
    if (orgPanel) orgPanel.hidden = mode !== 'org';
    if (smallResults) smallResults.hidden = mode !== 'small';
    if (orgResultsWrap) orgResultsWrap.hidden = mode !== 'org';
    if (chart) chart.hidden = mode !== 'org';
    if (scoreExplain) scoreExplain.hidden = mode !== 'org';
    bandGroup?.querySelectorAll('[data-band]').forEach((btn) => {
      const active = btn.getAttribute('data-band') === bandId;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    if (mode === 'small') {
      applySmallDefaults(true);
      renderSmall();
    } else {
      recomputeOrg();
    }
  }

  function renderSmall() {
    const payload = readSmallForm(smallForm);
    const result = calculateSmallBusinessLoss(payload);
    lastSmall = { ...result, currency };
    const big = smallResults.querySelector('[data-small="annualLoss"]');
    const hoursLine = smallResults.querySelector('[data-small="hoursLine"]');
    const dupBar = smallResults.querySelector('[data-bar="duplicate"]');
    const delayBar = smallResults.querySelector('[data-bar="delays"]');
    const dupAmt = smallResults.querySelector('[data-small="duplicateAmt"]');
    const delayAmt = smallResults.querySelector('[data-small="delaysAmt"]');
    const formulas = smallResults.querySelector('[data-small="formulas"]');
    if (big) big.textContent = money(result.annualLoss, currency);
    if (hoursLine) {
      hoursLine.textContent = `${result.hoursPerYear.toLocaleString('en-US')} hours per year ≈ ${result.workingDays} working days`;
    }
    if (dupBar) dupBar.style.width = `${Math.max(4, result.breakdown.duplicateWorkPct)}%`;
    if (delayBar) delayBar.style.width = `${Math.max(4, result.breakdown.delaysPct)}%`;
    if (dupAmt) {
      dupAmt.textContent = `${money(result.duplicateWork, currency)} · ${result.breakdown.duplicateWorkPct}%`;
    }
    if (delayAmt) {
      delayAmt.textContent = `${money(result.delays, currency)} · ${result.breakdown.delaysPct}%`;
    }
    if (formulas) {
      formulas.innerHTML =
        `<p>Duplicate work and checking = ${result.formulas.duplicateWork}</p>` +
        `<p>Delays = ${result.formulas.delays}</p>`;
    }
    if (cta) {
      cta.href = buildSmallRequestUrl({
        people: result.inputs.people,
        currency,
        annualLoss: result.annualLoss,
        hoursPerYear: result.hoursPerYear,
      });
      cta.textContent = 'Send one decision';
      cta.classList.remove('is-disabled');
      cta.setAttribute('aria-disabled', 'false');
    }
    if (ctaHint) {
      ctaHint.innerHTML =
        '<strong>Want to see where it’s coming from?</strong> Send us one decision. We’ll map where it got stuck and what it costs. Free, in writing.';
    }
    persistExecutionValue({
      mode: 'small',
      currency,
      inputs: result.inputs,
      results: result,
    });
    notifyFunnelUpdate();
  }

  function renderOrgMetric(key, metric, className = '') {
    const node = resultsRoot.querySelector(`[data-metric="${key}"]`);
    if (!node) return;
    const valueEl = node.querySelector('.evc-metric-value');
    const kindEl = node.querySelector('.evc-metric-kind');
    if (kindEl) {
      kindEl.className = 'evc-metric-kind';
      kindEl.textContent = '';
    }
    if (!metric || metric.value === '—' || metric.value == null) {
      valueEl.textContent = '—';
      valueEl.className = `evc-metric-value ${className}`.trim();
      return;
    }
    let display = String(metric.value);
    if (key.includes('Loss') || key.includes('recoverable') || key.includes('enterprise')) {
      // Org model stores USD internally; convert for display.
      const usd = Number(metric.value);
      display = money(usd, currency); // approximate: treat stored number as currency units once visitor currency applied via inputs
      // Inputs are entered in visitor currency; engine treats numbers as-is (no FX on org path).
      display = formatCurrency(usd, currency);
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

  function renderOrgChart(results) {
    const max = Math.max(results.visualization.executionLoss, 1);
    const rows = [
      { key: 'loss', value: results.visualization.executionLoss },
      { key: 'recovered', value: results.visualization.recoverableValue },
      { key: 'enterprise', value: results.visualization.enterpriseValueCreated },
    ];
    rows.forEach((row) => {
      const bar = chart.querySelector(`[data-bar="${row.key}"]`);
      const pct = chart.querySelector(`[data-pct="${row.key}"]`);
      if (!bar || !pct) return;
      const width = Math.max(4, Math.round((row.value / max) * 100));
      bar.style.width = `${width}%`;
      pct.textContent = `${Math.round((row.value / results.inputs.annualRevenue) * 1000) / 10}% rev`;
    });
  }

  function renderOrgPlaceholder() {
    ['estimatedExecutionLoss', 'recoverableValue', 'enterpriseValueCreated', 'executionScore'].forEach(
      (key) => renderOrgMetric(key, { value: '—' }),
    );
    ['loss', 'recovered', 'enterprise'].forEach((key) => {
      const bar = chart?.querySelector(`[data-bar="${key}"]`);
      const pct = chart?.querySelector(`[data-pct="${key}"]`);
      if (bar) bar.style.width = '0';
      if (pct) pct.textContent = '—';
    });
    if (cta) {
      cta.classList.add('is-disabled');
      cta.setAttribute('aria-disabled', 'true');
      cta.textContent = 'Send one decision';
      cta.removeAttribute('href');
    }
    if (ctaHint) ctaHint.textContent = 'Enter your organization profile.';
    if (scoreExplain) scoreExplain.textContent = '';
  }

  function recomputeOrg() {
    const payload = readOrgForm(orgForm);
    const validation = validateOrganizationInputs(payload);
    clearFieldMessages(orgForm);
    Object.entries(validation.messages).forEach(([key, message]) => setFieldMessage(orgForm, key, message));

    if (!validation.ok) {
      lastOrg = null;
      renderOrgPlaceholder();
      if (validation.suggestSmall && ctaHint) {
        ctaHint.textContent =
          'Some numbers sit outside this model. Switch to Small business above, or adjust the fields.';
      }
      return;
    }

    const calculated = calculateExecutionValue(payload);
    lastOrg = calculated;
    renderOrgMetric('estimatedExecutionLoss', calculated.estimatedExecutionLoss, 'loss');
    renderOrgMetric('recoverableValue', calculated.recoverableValue, 'gain');
    renderOrgMetric('enterpriseValueCreated', calculated.enterpriseValueCreated, 'gain');
    renderOrgMetric('executionScore', calculated.executionScore);
    renderOrgChart(calculated);
    if (scoreExplain) scoreExplain.textContent = SCORE_EXPLAIN;
    if (cta) {
      cta.href = buildOrgRequestUrl(calculated, currency);
      cta.textContent = 'Send one decision';
      cta.classList.remove('is-disabled');
      cta.setAttribute('aria-disabled', 'false');
    }
    if (ctaHint) {
      ctaHint.innerHTML =
        '<strong>Want to see where it’s coming from?</strong> Send us one decision. We’ll map where it got stuck and what it costs. Free, in writing.';
    }
    persistExecutionValue({ mode: 'org', currency, inputs: calculated.inputs, results: calculated });
    notifyFunnelUpdate();
    applyEngineHandoff();
    applyPilotHandoff();
  }

  // Headcount band control
  bandGroup?.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-band]');
    if (!btn) return;
    const id = btn.getAttribute('data-band');
    const band = bandForId(id);
    setMode(band.mode, id);
  });

  currencySelect?.addEventListener('change', () => {
    currency = currencySelect.value;
    saveSessionCurrency(currency);
    if (fxNote) {
      fxNote.textContent = `Defaults use approximate FX as of ${FX_AS_OF}. Change any number to your own.`;
    }
    if (mode === 'small') {
      applySmallDefaults('currency');
      renderSmall();
    } else {
      recomputeOrg();
    }
  });

  smallForm?.addEventListener('input', debounce(renderSmall, 80));
  smallForm?.addEventListener('change', renderSmall);
  orgForm?.addEventListener('input', debounce(recomputeOrg, 120));
  orgForm?.addEventListener('change', recomputeOrg);

  if (cta) {
    cta.addEventListener('click', (event) => {
      if (cta.classList.contains('is-disabled')) event.preventDefault();
    });
  }

  const disclosure = root.querySelector('.evc-disclosure');
  if (disclosure) disclosure.textContent = DEMO_DISCLOSURE;

  buildIndustryOptions(orgForm.querySelector('#ev-industry'));
  buildRiskOptions(orgForm.querySelector('#ev-risks'));
  fillCurrencySelect();
  if (fxNote) {
    fxNote.textContent = `Defaults use approximate FX as of ${FX_AS_OF}. Change any number to your own.`;
  }

  // Fetch geo when meta empty (Vercel header via /api/geo)
  if (!geoCountry) {
    fetch('/api/geo')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.country) return;
        if (loadSessionCurrency()) return;
        const next = resolveCurrency({ country: data.country });
        if (next !== currency) {
          currency = next;
          fillCurrencySelect();
          if (mode === 'small') {
            applySmallDefaults('currency');
            renderSmall();
          } else {
            recomputeOrg();
          }
        }
      })
      .catch(() => {});
  }

  setMode('small', '1-9');
}

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('execution-value-calculator');
  if (root) initCalculator(root);
});
