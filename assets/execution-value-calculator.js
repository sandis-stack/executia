/**
 * BACKLOG-556 / TASK-47 — homepage calculator.
 * Small + Organization share one transparent two-formula model.
 * Unsourced org outputs removed from the public calculator UI.
 */
import { persistExecutionValue } from './execution-value-engine.js';
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
  bandForId,
  calculateSmallBusinessLoss,
} from './small-business-loss.js';

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function readOptionalNumber(form, name) {
  const el = form.elements.namedItem(name);
  if (!el || el.value === '' || el.value == null) return null;
  const n = Number(el.value);
  return Number.isFinite(n) ? n : null;
}

function readLossForm(form) {
  const data = new FormData(form);
  return {
    people: Number(data.get('people')),
    hourlyCost: Number(data.get('hourlyCost')),
    hoursPerWeek: Number(data.get('hoursPerWeek')),
    stuckPerMonth: readOptionalNumber(form, 'stuckPerMonth'),
    delayWeekCost: readOptionalNumber(form, 'delayWeekCost'),
  };
}

function moneyDisplay(value, currency) {
  return formatMoney(value, currency);
}

function buildRequestUrl(state) {
  const params = new URLSearchParams({
    source: 'calculator',
    mode: state.mode,
    people: String(state.people),
    currency: state.currency,
    annualLoss: String(state.annualLoss),
    hours: String(state.hoursPerYear),
  });
  return `/request?${params.toString()}`;
}

function initCalculator(root) {
  const modeHint = root.querySelector('#ev-mode-hint');
  const bandGroup = root.querySelector('#ev-headcount-band');
  const smallPanel = root.querySelector('[data-mode-panel="small"]');
  const orgPanel = root.querySelector('[data-mode-panel="org"]');
  const smallForm = root.querySelector('#ev-small-form');
  const smallResults = root.querySelector('#ev-small-results');
  const currencySelect = root.querySelector('#ev-currency');
  const cta = root.querySelector('#ev-cta-assessment');
  const ctaHint = root.querySelector('#ev-cta-assessment-hint');
  const fxNote = root.querySelector('#ev-fx-note');
  const stuckLabel = root.querySelector('label[for="ev-stuck"]');
  const hoursLabel = root.querySelector('label[for="ev-hours"]');

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
  let lastResult = null;

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

  function applyDefaults(preserveTyped) {
    const band = bandForId(bandId);
    const c = CURRENCIES[currency] || CURRENCIES.USD;
    const people = smallForm.elements.namedItem('people');
    const hourly = smallForm.elements.namedItem('hourlyCost');
    const hours = smallForm.elements.namedItem('hoursPerWeek');
    const stuck = smallForm.elements.namedItem('stuckPerMonth');
    const delay = smallForm.elements.namedItem('delayWeekCost');
    // People / hourly / hours may be prefilled (labelled estimates).
    // PO 15:27 — never prefill stuck or delay week cost.
    if (!preserveTyped || !people.value) people.value = String(band.peopleDefault);
    if (!preserveTyped || !hourly.value) hourly.value = String(c.hourlyDefault);
    if (!preserveTyped || !hours.value) hours.value = String(band.hoursDefault);
    if (!preserveTyped) {
      stuck.value = '';
      delay.value = '';
    }
    if (preserveTyped === 'currency') {
      hourly.value = String(c.hourlyDefault);
    }
    if (preserveTyped === 'band') {
      people.value = String(band.peopleDefault);
      hours.value = String(band.hoursDefault);
      stuck.value = '';
      delay.value = '';
    }
  }

  function updateOrgCopy() {
    const band = bandForId(bandId);
    if (modeHint) {
      modeHint.textContent =
        band.mode === 'small'
          ? 'Under 50 people, we use a simpler calculation based on time.'
          : 'Same transparent formulas for larger organizations — your numbers, visible math.';
    }
    if (stuckLabel) {
      stuckLabel.textContent =
        band.mode === 'org'
          ? 'Decisions, orders or project steps per month that get stuck or delayed'
          : 'Decisions or orders per month that get stuck or delayed';
    }
    if (hoursLabel) {
      hoursLabel.textContent =
        band.mode === 'org'
          ? 'Hours per person per week lost to re-entering data, chasing status, double-checking'
          : 'Hours per person per week spent retyping, chasing status, and double-checking';
    }
  }

  function setMode(nextMode, nextBandId, opts = {}) {
    if (nextBandId) bandId = nextBandId;
    mode = nextMode;
    const band = bandForId(bandId);
    // Always use the transparent form panel.
    if (smallPanel) smallPanel.hidden = false;
    if (orgPanel) {
      orgPanel.hidden = true;
      orgPanel.setAttribute('aria-hidden', 'true');
    }
    if (smallResults) smallResults.hidden = false;
    bandGroup?.querySelectorAll('[data-band]').forEach((btn) => {
      const active = btn.getAttribute('data-band') === bandId;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    updateOrgCopy();
    applyDefaults(opts.preserveTyped === false ? false : opts.bandChange ? 'band' : true);
    render();
  }

  function updateHoursLive() {
    const live = root.querySelector('#ev-hours-value');
    const hours = smallForm?.elements.namedItem('hoursPerWeek');
    if (!live || !hours) return;
    const n = Number(hours.value);
    live.textContent = `${Number.isFinite(n) ? n : 0} h`;
  }

  function render() {
    const payload = readLossForm(smallForm);
    const result = calculateSmallBusinessLoss(payload);
    lastResult = { ...result, currency, mode };
    const big = smallResults.querySelector('[data-small="annualLoss"]');
    const hoursLine = smallResults.querySelector('[data-small="hoursLine"]');
    const dupBar = smallResults.querySelector('[data-bar="duplicate"]');
    const delayBar = smallResults.querySelector('[data-bar="delays"]');
    const dupAmt = smallResults.querySelector('[data-small="duplicateAmt"]');
    const delayAmt = smallResults.querySelector('[data-small="delaysAmt"]');
    const formulas = smallResults.querySelector('[data-small="formulas"]');

    if (big) big.textContent = moneyDisplay(result.display.annualLoss, currency);
    if (hoursLine) {
      hoursLine.textContent = `${result.hoursPerYear.toLocaleString('en-US')} hours per year ≈ ${result.workingDays} working days`;
    }
    if (dupBar) {
      dupBar.style.width = `${Math.max(4, result.breakdown.duplicateWorkPct || (result.duplicateWork > 0 ? 100 : 0))}%`;
    }
    if (delayBar) {
      delayBar.style.width = result.delaysKnown
        ? `${Math.max(4, result.breakdown.delaysPct)}%`
        : '0%';
    }
    if (dupAmt) {
      dupAmt.textContent = `${moneyDisplay(result.display.duplicateWork, currency)} · ${result.breakdown.duplicateWorkPct}%`;
    }
    if (delayAmt) {
      delayAmt.textContent = result.delaysKnown
        ? `${moneyDisplay(result.display.delays, currency)} · ${result.breakdown.delaysPct}%`
        : 'Not known — enter both to include delays';
    }
    if (formulas) {
      formulas.innerHTML =
        `<p>Duplicate work and checking = ${result.formulas.duplicateWork}</p>` +
        `<p>Delays = ${result.formulas.delays}</p>` +
        `<p>Display figures are rounded to 2 significant figures; formulas show exact totals.</p>`;
    }
    if (cta) {
      cta.href = buildRequestUrl({
        mode,
        people: result.inputs.people,
        currency,
        annualLoss: result.display.annualLoss,
        hoursPerYear: result.hoursPerYear,
      });
      cta.textContent = 'Send one decision';
      cta.classList.remove('is-disabled');
      cta.setAttribute('aria-disabled', 'false');
    }
    if (ctaHint) ctaHint.textContent = '';
    updateHoursLive();
    persistExecutionValue({
      mode,
      currency,
      inputs: result.inputs,
      results: {
        annualLoss: result.display.annualLoss,
        exactAnnualLoss: result.annualLoss,
        hoursPerYear: result.hoursPerYear,
        workingDays: result.workingDays,
        breakdown: result.breakdown,
      },
    });
    notifyFunnelUpdate();
  }

  bandGroup?.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-band]');
    if (!btn) return;
    const id = btn.getAttribute('data-band');
    const band = bandForId(id);
    setMode(band.mode, id, { bandChange: true });
  });

  currencySelect?.addEventListener('change', () => {
    currency = currencySelect.value;
    saveSessionCurrency(currency);
    if (fxNote) {
      fxNote.textContent = `Defaults use approximate FX as of ${FX_AS_OF}. Change any number to your own.`;
    }
    applyDefaults('currency');
    render();
  });

  const renderDebounced = debounce(render, 80);
  smallForm?.addEventListener('input', (event) => {
    if (event.target && event.target.name === 'hoursPerWeek') updateHoursLive();
    renderDebounced();
  });
  smallForm?.addEventListener('change', render);
  updateHoursLive();

  if (cta) {
    cta.addEventListener('click', (event) => {
      if (cta.classList.contains('is-disabled')) event.preventDefault();
    });
  }

  fillCurrencySelect();
  if (fxNote) {
    fxNote.textContent = `Defaults use approximate FX as of ${FX_AS_OF}. Change any number to your own.`;
  }

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
          applyDefaults('currency');
          render();
        }
      })
      .catch(() => {});
  }

  applyEngineHandoff();
  applyPilotHandoff();
  setMode('small', '1-9', { preserveTyped: false });
  void lastResult;
}

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('execution-value-calculator');
  if (root) initCalculator(root);
});
