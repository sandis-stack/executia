/* ═══════════════════════════════════════════════════════════
   EXECUTIA — executia.js  ·  EIF V6
   HTML = structure  ·  CSS = visual  ·  JS = behaviour

   ── Architecture ────────────────────────────────────────────
   STATE / TRANSITIONS  — frozen legal transition graph
   Rules                — composable validation primitives
                          each Rule is a typed object:
                          { id, label, validate(ctx), error(ctx) }
   ExecutionTrace       — immutable audit record per check
   ExecutionResult      — typed, frozen engine output
   Engine               — PURE: no UI hooks, no DOM knowledge
                          Engine.run(checks, ctx) → Promise<ExecutionResult>
                          Engine.cinematic(sequence) → Timeline
   EventBus             — publish/subscribe, decouples Engine from UI
   Executia.sim         — UI subscriber: reads state, calls _render()
   Executia.demo        — scroll-triggered cinematic runner
   Executia.reveal      — IntersectionObserver scroll reveal

   ── State graph (sim) ───────────────────────────────────────
     idle → running → blocked → fixed → running → success
                    ↘ success
                    success → idle  ("Run Again")

   ── Data flow ───────────────────────────────────────────────
     [User action]
       → sim.transition(STATE.RUNNING)
       → sim._execute()   builds ctx from SCENARIOS + DOM
       → Engine.run()     pure validation, emits events
       → EventBus         carries ExecutionTrace + ExecutionResult
       → sim._onTick()    updates DOM via _render() only
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────────────────
     STATE CONSTANTS
     ───────────────────────────────────────────────────────── */
  const STATE = Object.freeze({
    IDLE:    'idle',
    RUNNING: 'running',
    BLOCKED: 'blocked',
    FIXED:   'fixed',
    SUCCESS: 'success',
  });

  const TRANSITIONS = Object.freeze({
    [STATE.IDLE]:    [STATE.RUNNING],
    [STATE.RUNNING]: [STATE.BLOCKED, STATE.SUCCESS],
    [STATE.BLOCKED]: [STATE.FIXED],
    [STATE.FIXED]:   [STATE.RUNNING],
    [STATE.SUCCESS]: [STATE.IDLE],
  });

  /* ─────────────────────────────────────────────────────────
     UTILITIES
     ───────────────────────────────────────────────────────── */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  function Timeline() {
    const ids = [];
    return {
      at(ms, fn) { ids.push(setTimeout(fn, ms)); return this; },
      cancel()   { ids.forEach(clearTimeout); ids.length = 0; },
    };
  }

  /* ─────────────────────────────────────────────────────────
     EVENTBUS — pub/sub, zero DOM knowledge
     Engine emits. UI subscribes. They never meet directly.
     ───────────────────────────────────────────────────────── */
  const EventBus = (function () {
    const listeners = {};
    return {
      on(event, fn)   { (listeners[event] = listeners[event] || []).push(fn); },
      off(event, fn)  { if (listeners[event]) listeners[event] = listeners[event].filter(f => f !== fn); },
      emit(event, data) { (listeners[event] || []).forEach(fn => fn(data)); },
    };
  }());

  /* ─────────────────────────────────────────────────────────
     RULES — composable, typed validation primitives
     Each Rule: { id, label, validate(ctx) → bool, error(ctx) → string }
     ───────────────────────────────────────────────────────── */
  const Rule = ({ id, label, validate, error }) =>
    Object.freeze({ id, label, validate, error: error || (() => `${label} check failed`) });

  const Rules = {
    withinBudget: Rule({
      id:       'budget',
      label:    'Budget threshold',
      validate: ctx => ctx.amount <= ctx.limit,
      error:    ctx => `Exceeded by ${(ctx.amount - ctx.limit).toFixed(2)}M \u2014 ${((ctx.amount / ctx.limit - 1) * 100).toFixed(0)}% over limit`,
    }),

    isAuthorized: Rule({
      id:       'authorization',
      label:    'Authorization confirmed',
      validate: ctx => ctx.authorized === true,
      error:    ()  => 'Requesting entity lacks authorization for this action',
    }),

    hasResponsibility: Rule({
      id:       'responsibility',
      label:    'Responsibility assigned',
      validate: ctx => ctx.actorLevel >= ctx.requiredLevel,
      error:    ctx => `Actor level ${ctx.actorLevel} below required level ${ctx.requiredLevel}`,
    }),

    supplierRegistered: Rule({
      id:       'supplier',
      label:    'Supplier registry',
      validate: ctx => ctx.supplierRegistered === true,
      error:    ()  => 'Supplier not found in active procurement registry',
    }),

    alwaysPass: Rule({
      id:       'pass',
      label:    'Check',
      validate: () => true,
      error:    () => '',
    }),

    /* Composers — return a new Rule */
    all(...rules) {
      return Rule({
        id:       rules.map(r => r.id).join('+'),
        label:    rules.map(r => r.label).join(' + '),
        validate: ctx => rules.every(r => r.validate(ctx)),
        error:    ctx => rules.find(r => !r.validate(ctx))?.error(ctx) || '',
      });
    },
    any(...rules) {
      return Rule({
        id:       rules.map(r => r.id).join('|'),
        label:    rules.map(r => r.label).join(' or '),
        validate: ctx => rules.some(r => r.validate(ctx)),
        error:    ctx => rules.map(r => r.error(ctx)).join('; '),
      });
    },
    not(rule) {
      return Rule({
        id:       `not-${rule.id}`,
        label:    `Not: ${rule.label}`,
        validate: ctx => !rule.validate(ctx),
        error:    ()  => `Condition should not hold: ${rule.label}`,
      });
    },
  };

  /* ─────────────────────────────────────────────────────────
     EXECUTION TRACE — immutable audit record
     One per check. Collected into ExecutionResult.trace[].
     ───────────────────────────────────────────────────────── */
  function ExecutionTrace({ index, ruleId, ruleLabel, passed, errorMsg, ctx, timestamp }) {
    return Object.freeze({ index, ruleId, ruleLabel, passed, errorMsg, ctx: Object.freeze({ ...ctx }), timestamp });
  }

  /* ─────────────────────────────────────────────────────────
     EXECUTION RESULT — typed, frozen engine output
     ───────────────────────────────────────────────────────── */
  function ExecutionResult({ status, failedIndex, trace, meta }) {
    return Object.freeze({
      status,         /* 'blocked' | 'success' */
      failedIndex,    /* index of first failing check, -1 on success */
      trace,          /* ExecutionTrace[] — full audit log */
      meta,           /* scenario result strings for display */
    });
  }

  /* ─────────────────────────────────────────────────────────
     ENGINE — PURE (no UI, no DOM, no side effects)
     Emits events via EventBus for UI to consume.
     ───────────────────────────────────────────────────────── */
  const Engine = {
    _tl: null,

    cancel() {
      if (this._tl) { this._tl.cancel(); this._tl = null; }
    },

    /**
     * Cinematic mode — timed animation sequence.
     * Purely timeline, no validation.
     * @param {Array<{id: string, ms: number, fade?: boolean}>} sequence
     */
    cinematic(sequence) {
      this.cancel();
      const tl = this._tl = new Timeline();
      sequence.forEach(({ id, ms, fade }) => {
        tl.at(ms, () => {
          EventBus.emit('engine:cinematic:tick', { id, fade: !!fade });
        });
      });
    },

    /**
     * Simulation mode — pure validation loop.
     * Emits events. Returns Promise<ExecutionResult>.
     * No UI callbacks. No DOM knowledge.
     *
     * @param {Rule[]}   checks   — array of Rule objects
     * @param {Object}   ctx      — scenario data context
     * @param {Object}   meta     — result strings (blockedSub, validSub, etc.)
     * @param {number}   interval — ms between check evaluations
     * @returns {Promise<ExecutionResult>}
     */
    run(checks, ctx, meta, interval = 600) {
      this.cancel();
      const tl = this._tl = new Timeline();
      const trace = [];

      return new Promise(resolve => {
        let settled = false;

        checks.forEach((rule, i) => {
          tl.at(i * interval, () => {
            if (settled) return;

            const passed    = rule.validate(ctx);
            const errorMsg  = passed ? '' : rule.error(ctx);
            const entry     = ExecutionTrace({
              index: i, ruleId: rule.id, ruleLabel: rule.label,
              passed, errorMsg, ctx, timestamp: Date.now(),
            });
            trace.push(entry);
            EventBus.emit('engine:check', { index: i, entry });

            if (!passed) {
              settled = true;
              const result = ExecutionResult({ status: 'blocked', failedIndex: i, trace: Object.freeze([...trace]), meta });
              EventBus.emit('engine:result', result);
              resolve(result);
            } else if (i === checks.length - 1) {
              settled = true;
              const result = ExecutionResult({ status: 'success', failedIndex: -1, trace: Object.freeze([...trace]), meta });
              EventBus.emit('engine:result', result);
              resolve(result);
            }
          });
        });
      });
    },
  };

  /* ─────────────────────────────────────────────────────────
     SCENARIO DEFINITIONS
     ───────────────────────────────────────────────────────── */
  const SCENARIOS = {
    budget: {
      display: {
        ctx: [
          { label: 'Settlement decision', val: 'Board approves fuel distribution contract' },
          { label: 'Payment request',     val: '\u20ac2.4M <span class="rs-tag rs-tag-bad mono">22% over approved limit</span>' },
          { label: 'Responsible officer', val: 'Regional Distribution Director' },
        ],
        fixCtxVal: '\u20ac1.96M <span class="rs-tag rs-tag-good mono">Within approved limit</span>',
      },
      ctxBase:  { amount: 2.4,  limit: 2.0, authorized: true,  actorLevel: 2, requiredLevel: 2, supplierRegistered: true },
      ctxFixed: { amount: 1.96, limit: 2.0, authorized: true,  actorLevel: 2, requiredLevel: 2, supplierRegistered: true },
      checks:   [
        Rules.isAuthorized,
        Rules.alwaysPass,
        Rules.alwaysPass,
        Rules.withinBudget,
      ],
      meta: {
        fixLabel:   'Restructure payment',
        blockedSub: 'Payment exceeds approved limit by 22% \u2014 settlement cannot proceed',
        impact:     '\u20ac440K risk prevented before execution',
        validSub:   '\u20ac1.96M settlement approved \u00b7 Immutable ledger written \u00b7 Responsibility confirmed',
        validImpact:'Execution verified before funds released',
      },
    },

    actor: {
      display: {
        ctx: [
          { label: 'Decision',           val: 'Ministry approves infrastructure contract' },
          { label: 'Executing officer',  val: 'J. Kowalski <span class="rs-tag rs-tag-bad mono">Not authorized</span>' },
          { label: 'Required authority', val: 'Deputy Minister level or above' },
        ],
        fixCtxVal: 'A. Nowak <span class="rs-tag rs-tag-good mono">Deputy Minister \u2014 Authorized</span>',
      },
      ctxBase:  { amount: 0, limit: 999, authorized: false, actorLevel: 1, requiredLevel: 3, supplierRegistered: true },
      ctxFixed: { amount: 0, limit: 999, authorized: true,  actorLevel: 3, requiredLevel: 3, supplierRegistered: true },
      checks:   [
        Rules.alwaysPass,
        Rules.alwaysPass,
        Rules.alwaysPass,
        Rules.all(Rules.isAuthorized, Rules.hasResponsibility),
      ],
      meta: {
        fixLabel:   'Assign authorized officer',
        blockedSub: 'Executing officer lacks required authority level \u2014 action blocked',
        impact:     'Unauthorized actor stopped before contract execution',
        validSub:   'Authorized officer confirmed \u00b7 Contract proceeds \u00b7 Full chain recorded',
        validImpact:'Verified authority linked to execution permanently',
      },
    },

    fraud: {
      display: {
        ctx: [
          { label: 'Decision',             val: 'Ministry approves \u20ac4.2M vendor contract' },
          { label: 'Supplier',             val: 'TechBuild Ltd. <span class="rs-tag rs-tag-bad mono">Registry mismatch</span>' },
          { label: 'Procurement registry', val: 'No active registration found' },
        ],
        fixCtxVal: 'BuildTech Solutions <span class="rs-tag rs-tag-good mono">Registry verified</span>',
      },
      ctxBase:  { amount: 4.2, limit: 5.0, authorized: true, actorLevel: 3, requiredLevel: 2, supplierRegistered: false },
      ctxFixed: { amount: 4.2, limit: 5.0, authorized: true, actorLevel: 3, requiredLevel: 2, supplierRegistered: true },
      checks:   [
        Rules.isAuthorized,
        Rules.hasResponsibility,
        Rules.alwaysPass,
        Rules.supplierRegistered,
      ],
      meta: {
        fixLabel:   'Submit valid supplier',
        blockedSub: 'Supplier not found in procurement registry \u2014 possible fraudulent entity',
        impact:     '\u20ac4.2M fraud prevented before payment',
        validSub:   'Verified supplier confirmed \u00b7 Payment authorised \u00b7 Ledger written',
        validImpact:'Corrupt execution chain structurally blocked',
      },
    },
  };

  /* ─────────────────────────────────────────────────────────
     EXECUTIA NAMESPACE
     ───────────────────────────────────────────────────────── */
  const Executia = {

    /* 1. Scroll reveal ───────────────────────────────────── */
    reveal: {
      init() {
        const els = $$('.reveal');
        if (!els.length) return;
        const obs = new IntersectionObserver(
          entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('is-visible'); }),
          { threshold: 0.1 }
        );
        els.forEach(el => obs.observe(el));
      },
    },

    /* 2. Cinematic demo — subscribes to engine:cinematic:tick */
    demo: {
      init() {
        const section = $('.execution-demo');
        if (!section) return;

        /* Subscribe once */
        EventBus.on('engine:cinematic:tick', ({ id, fade }) => {
          const el = $(`#${id}`);
          if (!el) return;
          if (fade) el.classList.add('fade-out');
          else      el.classList.add('is-active');
        });

        const obs = new IntersectionObserver(entries => {
          if (entries[0].isIntersecting) { this.run(); obs.disconnect(); }
        }, { threshold: 0.3 });
        obs.observe(section);
      },

      run() {
        Engine.cinematic([
          { id: 'nodeDecision1', ms:    0 },
          { id: 'nodeExecBad',   ms:  700 },
          { id: 'nodeError',     ms: 1400 },
          { id: 'nodeError',     ms: 2200, fade: true },
          { id: 'nodeDecision2', ms: 2400 },
          { id: 'nodeExecutia',  ms: 3100 },
          { id: 'check1',        ms: 3600 },
          { id: 'check2',        ms: 3880 },
          { id: 'check3',        ms: 4160 },
          { id: 'check4',        ms: 4440 },
          { id: 'nodeSuccess',   ms: 4800 },
        ]);
      },
    },

    /* 3. Simulation controller — subscribes to engine events  */
    sim: {
      state:     STATE.IDLE,
      activeKey: 'budget',
      _ctx:      null,
      _dom:      null,

      /* Guarded transition */
      transition(next) {
        const allowed = TRANSITIONS[this.state] || [];
        if (!allowed.includes(next)) { Engine.cancel(); return false; }
        this.state = next;
        this._render();
        return true;
      },

      /* Central renderer — UI = f(state). Only place that writes UI from state. */
      _render() {
        const d = this._q();
        if (!d.resultBox) return;
        d.resultBox.dataset.state = this.state;
        d.runBtn.disabled         = this.state === STATE.RUNNING;
        d.fixBtn.hidden           = this.state !== STATE.BLOCKED;
        const labels = {
          [STATE.IDLE]:    'Run Scenario',
          [STATE.RUNNING]: 'Verifying\u2026',
          [STATE.BLOCKED]: 'Run Scenario',
          [STATE.FIXED]:   'Run Scenario',
          [STATE.SUCCESS]: 'Run Again',
        };
        if (labels[this.state]) d.runBtn.textContent = labels[this.state];
      },

      /* UI reset — does NOT change state */
      _resetUI() {
        const d = this._q();
        d.resultText.textContent    = '\u2014';
        d.resultSub.textContent     = '';
        d.resultImpact.textContent  = '';
        d.checkRows.forEach(row => row.classList.remove('rs-pass', 'rs-fail', 'is-active'));
        d.checkResults.forEach(res => { res.textContent = ''; res.className = 'rs-check-res mono'; });
      },

      /* Load scenario display data into DOM */
      _load(key) {
        const s = SCENARIOS[key || this.activeKey];
        const d = this._q();
        s.display.ctx.forEach((row, i) => {
          if (d.ctxLabels[i]) d.ctxLabels[i].textContent = row.label;
          if (d.ctxValues[i]) d.ctxValues[i].innerHTML   = row.val;
        });
        s.checks.forEach((rule, i) => {
          if (d.checkLabels[i]) d.checkLabels[i].textContent = rule.label;
        });
        d.hint.textContent = 'Select a scenario and run';
        this._ctx = { ...s.ctxBase };
      },

      /* DOM reference cache — resolved via data-role, never by id */
      _q() {
        if (this._dom) return this._dom;
        this._dom = {
          tabs:         $$('[data-role="scenario-tab"]'),
          ctxLabels:    $$('[data-role="ctx-label"]'),
          ctxValues:    $$('[data-role="ctx-value"]'),
          checkRows:    $$('[data-role="check-row"]'),
          checkLabels:  $$('[data-role="check-label"]'),
          checkResults: $$('[data-role="check-result"]'),
          resultBox:    $('[data-role="result-box"]'),
          resultText:   $('[data-role="result-text"]'),
          resultSub:    $('[data-role="result-sub"]'),
          resultImpact: $('[data-role="result-impact"]'),
          hint:         $('[data-role="sim-hint"]'),
          runBtn:       $('[data-role="run-btn"]'),
          fixBtn:       $('[data-role="fix-btn"]'),
        };
        return this._dom;
      },

      /* Wire EventBus → UI. Called once on init. */
      _subscribe() {
        /* Per-check tick: Engine emits, UI reacts */
        EventBus.on('engine:check', ({ index, entry }) => {
          const d = this._q();
          const row = d.checkRows[index];
          const res = d.checkResults[index];
          if (!row || !res) return;

          row.classList.add('is-active');
          if (entry.passed) {
            row.classList.add('rs-pass');
            res.textContent = '\u2713';
            res.classList.add('is-success');
          } else {
            row.classList.add('rs-fail');
            /* Use rule's error() message for richer feedback */
            const s = SCENARIOS[this.activeKey];
            res.textContent = s.meta.failMsg || '\u2715 FAILED';
            res.classList.add('is-error');
            d.hint.textContent   = 'Press Fix & Re-run to resolve';
            d.fixBtn.textContent = (s.meta.fixLabel || 'Fix') + ' \u2192';
          }
        });

        /* Final result: update result box, transition state */
        EventBus.on('engine:result', (result) => {
          const d = this._q();
          if (result.status === 'blocked') {
            d.resultText.textContent    = '\u2715 EXECUTION BLOCKED';
            d.resultSub.textContent     = result.meta.blockedSub;
            d.resultImpact.textContent  = result.meta.impact;
            this.transition(STATE.BLOCKED);
          } else {
            d.resultText.textContent    = '\u2713 VALID EXECUTION';
            d.resultSub.textContent     = result.meta.validSub;
            d.resultImpact.textContent  = result.meta.validImpact;
            d.hint.textContent          = 'Complete chain recorded \u00b7 decision \u00b7 verification \u00b7 execution \u00b7 ledger';
            this.transition(STATE.SUCCESS);
          }
        });
      },

      init() {
        const d = this._q();
        if (!d.runBtn) return;

        this._subscribe();

        /* Tab switching */
        d.tabs.forEach(tab => {
          tab.addEventListener('click', () => {
            d.tabs.forEach(t => t.classList.remove('rs-tab-active'));
            tab.classList.add('rs-tab-active');
            this.activeKey = tab.dataset.scenario;
            Engine.cancel();
            this.state = STATE.IDLE;
            this._resetUI();
            this._load(this.activeKey);
            this._render();
          });
        });

        /* Run */
        d.runBtn.addEventListener('click', () => {
          if (this.state === STATE.SUCCESS) {
            this.transition(STATE.IDLE);
            this._resetUI();
            this._load(this.activeKey);
          }
          if (this.transition(STATE.RUNNING)) {
            this._resetUI();
            this._execute();
          }
        });

        /* Fix */
        d.fixBtn.addEventListener('click', () => {
          if (!this.transition(STATE.FIXED)) return;
          const s = SCENARIOS[this.activeKey];
          const valEl = d.ctxValues[1];
          if (valEl) valEl.innerHTML = s.display.fixCtxVal;
          this._ctx = { ...s.ctxFixed };
          if (this.transition(STATE.RUNNING)) {
            this._resetUI();
            this._execute();
          }
        });

        this._load(this.activeKey);
        this._render();
      },

      _execute() {
        const s = SCENARIOS[this.activeKey];
        Engine.run(s.checks, this._ctx || { ...s.ctxBase }, s.meta);
        /* Result arrives via EventBus — no .then() needed here */
      },
    },

    /* Boot */
    init() {
      Executia.reveal.init();
      Executia.demo.init();
      Executia.sim.init();
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Executia.init());
  } else {
    Executia.init();
  }

}());
