/**
 * Public funnel — non-module bootstrap for static pages (engine demo, request prefill).
 * Module consumers import ./public-funnel.js directly.
 */
(function () {
  'use strict';

  var ENGINE_RUN_KEY = 'executia.publicFunnel.engine.v1';
  var CALC_KEY = 'executia.executionValue.v1';
  var ASSESS_KEY = 'executia.organizationAssessment.v1';

  function readJson(key) {
    try {
      var raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_e) {
      return null;
    }
  }

  function loadCtx() {
    return {
      calculator: readJson(CALC_KEY),
      assessment: readJson(ASSESS_KEY),
      engine: readJson(ENGINE_RUN_KEY),
    };
  }

  function fmtMoney(n) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  }

  function buildSummary(ctx) {
    var lines = [];
    var calc = ctx.calculator && ctx.calculator.results;
    var assessment = ctx.assessment && ctx.assessment.results;
    var engine = ctx.engine;
    if (calc) {
      lines.push('Estimated execution loss: ' + fmtMoney(calc.estimatedExecutionLoss.value));
      lines.push('Recoverable value (estimated): ' + fmtMoney(calc.recoverableValue.value));
      lines.push('Calculator Execution Score: ' + calc.executionScore.value + '/100');
    }
    if (assessment && assessment.ok) {
      lines.push('Refined Execution Score: ' + assessment.executionScore.value + '/100');
      lines.push('Pilot readiness: ' + assessment.pilotRecommendation.readiness);
      lines.push('Pilot recommendation: ' + assessment.pilotRecommendation.value);
      if (assessment.gapAnalysis && assessment.gapAnalysis.value) {
        lines.push('Gap analysis areas: ' + assessment.gapAnalysis.value.length);
      }
    }
    if (engine && engine.completed) {
      lines.push('Living Engine: ' + (engine.decision || 'EXECUTION_READY'));
      lines.push('Engine mission: ' + engine.missionText);
      if (engine.outputs && engine.outputs.executionScore) {
        lines.push('Engine Execution Score: ' + engine.outputs.executionScore.value + '/100');
      }
      if (engine.outputs && engine.outputs.estimatedTimeline) {
        lines.push('Estimated timeline: ' + engine.outputs.estimatedTimeline.months + ' months');
      }
    }
    lines.push('Note: Estimated demonstration values — verify in formal assessment.');
    return lines.join('\n');
  }

  function buildRequestUrl() {
    var ctx = loadCtx();
    var params = new URLSearchParams({ source: 'public-funnel' });
    var score = (ctx.assessment && ctx.assessment.results && ctx.assessment.results.executionScore && ctx.assessment.results.executionScore.value)
      || (ctx.calculator && ctx.calculator.results && ctx.calculator.results.executionScore && ctx.calculator.results.executionScore.value);
    if (score != null) params.set('executionScore', String(score));
    if (ctx.calculator && ctx.calculator.results && ctx.calculator.results.recoverableValue) {
      params.set('recoverableValue', String(ctx.calculator.results.recoverableValue.value));
    }
    if (ctx.assessment && ctx.assessment.results && ctx.assessment.results.pilotRecommendation) {
      params.set('pilotReadiness', ctx.assessment.results.pilotRecommendation.readiness);
    }
    if (ctx.calculator && ctx.calculator.results && ctx.calculator.results.estimatedExecutionLoss) {
      params.set('estimatedLoss', String(ctx.calculator.results.estimatedExecutionLoss.value));
    }
    if (ctx.engine && ctx.engine.completed) params.set('engineDemo', '1');
    if (ctx.engine && ctx.engine.missionText) params.set('mission', ctx.engine.missionText.slice(0, 120));
    return '/request?' + params.toString();
  }

  function buildOneUrl() {
    var ctx = loadCtx();
    var params = new URLSearchParams({ source: 'executia-entry-funnel' });
    var score = (ctx.assessment && ctx.assessment.results && ctx.assessment.results.executionScore && ctx.assessment.results.executionScore.value)
      || (ctx.calculator && ctx.calculator.results && ctx.calculator.results.executionScore && ctx.calculator.results.executionScore.value);
    if (score != null) params.set('executionScore', String(score));
    if (ctx.assessment && ctx.assessment.inputs && ctx.assessment.inputs.organization) {
      params.set('organization', ctx.assessment.inputs.organization);
    }
    if (ctx.engine && ctx.engine.missionText) params.set('mission', ctx.engine.missionText.slice(0, 120));
    return 'https://one.executia.io/?' + params.toString();
  }

  function prefillRequest(form) {
    if (!form) return;
    var ctx = loadCtx();
    var org = form.querySelector('#organization');
    var operator = form.querySelector('#operator');
    var email = form.querySelector('#email');
    var sector = form.querySelector('#sector');
    var context = form.querySelector('#context');
    if (ctx.assessment && ctx.assessment.inputs) {
      if (org && ctx.assessment.inputs.organization) org.value = ctx.assessment.inputs.organization;
      if (operator && ctx.assessment.inputs.contact) operator.value = ctx.assessment.inputs.contact;
      if (email && ctx.assessment.inputs.email) email.value = ctx.assessment.inputs.email;
      if (sector && ctx.assessment.inputs.executionDomain) {
        for (var i = 0; i < sector.options.length; i += 1) {
          if (sector.options[i].value === ctx.assessment.inputs.executionDomain) {
            sector.value = ctx.assessment.inputs.executionDomain;
            break;
          }
        }
      }
    }
    if (context && (ctx.assessment || ctx.calculator)) context.value = buildSummary(ctx);
  }

  function wirePilotLinks() {
    var cta = document.getElementById('ev-cta-pilot-request');
    if (cta && ctxHasAssessment()) cta.href = buildRequestUrl();
    document.querySelectorAll('[data-funnel-request]').forEach(function (el) {
      if (ctxHasAssessment()) el.href = buildRequestUrl();
    });
  }

  function wireOneLinks() {
    if (!ctxHasAssessment()) return;
    var url = buildOneUrl();
    document.querySelectorAll('[data-funnel-one]').forEach(function (el) {
      el.href = url;
    });
  }

  function ctxHasAssessment() {
    var ctx = loadCtx();
    return ctx.assessment && ctx.assessment.results && ctx.assessment.results.ok;
  }

  function refreshEngineHandoff() {
    var banner = document.getElementById('ev-engine-handoff');
    if (banner) {
      banner.hidden = true;
      banner.innerHTML = '';
    }
  }

  window.EXECUTIA_PUBLIC_FUNNEL = {
    loadCtx: loadCtx,
    buildRequestUrl: buildRequestUrl,
    buildOneUrl: buildOneUrl,
    prefillRequest: prefillRequest,
    wirePilotLinks: wirePilotLinks,
    wireOneLinks: wireOneLinks,
    wirePilotBanner: wirePilotBanner,
    wireOneBanner: wireOneBanner,
    refreshEngineHandoff: refreshEngineHandoff,
    ENGINE_RUN_KEY: ENGINE_RUN_KEY,
  };

  function wirePilotBanner() {
    var host = document.getElementById('ev-pilot-handoff');
    if (host) {
      host.hidden = true;
      host.innerHTML = '';
    }
  }

  function wireOneBanner() {
    var banner = document.getElementById('ev-one-handoff');
    if (!banner || !ctxHasAssessment()) return;
    var ctx = loadCtx();
    var score = ctx.assessment.results.executionScore.value;
    var mission = (ctx.engine && ctx.engine.missionText) || 'Assessment mission context preserved';
    banner.hidden = false;
    banner.className = 'evc-handoff';
    banner.innerHTML = '<strong>Funnel context preserved:</strong> Execution Score ' + score + '/100 · Mission: ' + mission.slice(0, 80) + '… · Sign in without re-entering assessment data.';
  }

  document.addEventListener('DOMContentLoaded', function () {
    prefillRequest(document.getElementById('request-form'));
    wirePilotLinks();
    wireOneLinks();
    wirePilotBanner();
    wireOneBanner();
    refreshEngineHandoff();
  });
})();
