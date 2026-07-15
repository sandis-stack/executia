/**
 * MISSION-005 — Unified Executive Journey
 * Single scenario: €250,000 critical infrastructure procurement.
 */
(function () {
  var SCENARIO = {
    missionId: 'MSN-INFRA-2026-0047',
    executionId: 'EXE-PROC-250K-20260715',
    organization: 'National Infrastructure Authority',
    title: 'Critical infrastructure procurement',
    summary: 'Network resilience equipment — Phase 2 procurement',
    amount: '€250,000',
    compliantLabel: 'Appears compliant',
    question: 'Is it actually executable?',
    decision: 'PROCEED',
    decisionOptions: ['PROCEED', 'HOLD', 'REJECT'],
    outcome: 'Procurement authorized under governed execution record.',
    verificationStatus: 'Verified',
    timestamp: '2026-07-15T06:42:18Z',
    timestampDisplay: '15 Jul 2026, 06:42 UTC',
    status: {
      executionState: 'Verified',
      evidence: 'Available',
      decision: 'Governed',
    },
    statusOne: {
      executionState: 'In execution',
      evidence: 'Available',
      decision: 'Governed',
    },
    statusProof: {
      executionState: 'Verified',
      evidence: 'Immutable',
      decision: 'Recorded',
    },
    validations: [
      { id: 'authority', label: 'Authority', result: 'Confirmed', detail: 'Procurement officer holds delegated authority for this threshold.' },
      { id: 'budget', label: 'Budget', result: 'Confirmed', detail: '€250,000 allocated under FY2026 resilience program line 4.2.' },
      { id: 'approvals', label: 'Approvals', result: 'Confirmed', detail: 'Technical review and financial control sign-off recorded.' },
      { id: 'policy', label: 'Policy', result: 'Confirmed', detail: 'Public procurement policy §12.4 satisfied for infrastructure goods.' },
      { id: 'evidence', label: 'Evidence', result: 'Confirmed', detail: 'Required proof artifacts attached before commitment.' },
    ],
    workspace: {
      mission: 'Secure Phase 2 network resilience equipment for critical infrastructure operations.',
      decision: 'PROCEED — all validation gates satisfied.',
      execution: 'Purchase order release authorized under MSN-INFRA-2026-0047.',
      evidence: 'Budget certificate, authority confirmation, policy review — verified.',
      outcome: '€250,000 procurement executable with auditable record.',
    },
    proofRecords: [
      { label: 'Mission ID', value: 'MSN-INFRA-2026-0047' },
      { label: 'Decision', value: 'PROCEED' },
      { label: 'Evidence', value: 'Budget certificate · Authority confirmation · Policy review' },
      { label: 'Timestamp', value: '15 Jul 2026, 06:42 UTC' },
      { label: 'Verification', value: 'Verified' },
    ],
  };

  var STEPS = [
    { id: 'entry', label: 'ENTRY', href: '/' },
    { id: 'engine', label: 'ENGINE', href: '/engine' },
    { id: 'one', label: 'ONE', href: '/one' },
    { id: 'proof', label: 'PROOF', href: '/proof' },
    { id: 'pilot', label: 'PILOT', href: '/pilot' },
  ];

  var NEXT = {
    engine: { label: 'View executive workspace', href: '/one' },
    one: { label: 'View public proof', href: '/proof' },
    proof: { label: 'Request Institutional Pilot', href: '/pilot' },
    pilot: { label: 'Request Pilot', href: '/request' },
  };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderBreadcrumb(activeId) {
    return (
      '<nav class="ej-breadcrumb" aria-label="Executive journey">' +
      STEPS.map(function (step, index) {
        var active = step.id === activeId ? ' ej-breadcrumb-step--active' : '';
        var sep = index < STEPS.length - 1 ? '<span class="ej-breadcrumb-sep" aria-hidden="true">→</span>' : '';
        return (
          '<a class="ej-breadcrumb-step' +
          active +
          '" href="' +
          step.href +
          '">' +
          escapeHtml(step.label) +
          '</a>' +
          sep
        );
      }).join('') +
      '</nav>'
    );
  }

  function renderDemonstrationBanner() {
    return '<p class="ej-demo-banner" role="note">DEMONSTRATION SCENARIO</p>';
  }

  function renderStatus(pageId) {
    var status = SCENARIO.status;
    if (pageId === 'one') status = SCENARIO.statusOne;
    if (pageId === 'proof') status = SCENARIO.statusProof;
    return (
      '<div class="ej-status" aria-label="Execution status">' +
      '<div class="ej-status-item"><span class="ej-status-label">Execution State</span><strong data-ej-status="executionState">' +
      escapeHtml(status.executionState) +
      '</strong></div>' +
      '<div class="ej-status-item"><span class="ej-status-label">Evidence</span><strong data-ej-status="evidence">' +
      escapeHtml(status.evidence) +
      '</strong></div>' +
      '<div class="ej-status-item"><span class="ej-status-label">Decision</span><strong data-ej-status="decision">' +
      escapeHtml(status.decision) +
      '</strong></div>' +
      '</div>'
    );
  }

  function renderChromeExtras(pageId) {
    if (pageId === 'engine') {
      return renderDemonstrationBanner() + renderStatus(pageId);
    }
    if (pageId === 'one' || pageId === 'proof') {
      return renderStatus(pageId);
    }
    return '';
  }

  function renderProcurementCard(extraClass) {
    return (
      '<article class="ej-procurement' +
      (extraClass ? ' ' + extraClass : '') +
      '">' +
      '<p class="ej-procurement-kicker">Executive scenario</p>' +
      '<h2 class="ej-procurement-title">' +
      escapeHtml(SCENARIO.title) +
      '</h2>' +
      '<dl class="ej-procurement-meta">' +
      '<div><dt>Organization</dt><dd>' +
      escapeHtml(SCENARIO.organization) +
      '</dd></div>' +
      '<div><dt>Amount</dt><dd>' +
      escapeHtml(SCENARIO.amount) +
      '</dd></div>' +
      '<div><dt>Mission ID</dt><dd><code>' +
      escapeHtml(SCENARIO.missionId) +
      '</code></dd></div>' +
      '<div><dt>Execution ID</dt><dd><code>' +
      escapeHtml(SCENARIO.executionId) +
      '</code></dd></div>' +
      '</dl>' +
      '<p class="ej-procurement-summary">' +
      escapeHtml(SCENARIO.summary) +
      '</p>' +
      '</article>'
    );
  }

  function renderNextCta(stepId) {
    var next = NEXT[stepId];
    if (!next) return '';
    return (
      '<section class="ej-next" aria-label="Next step">' +
      '<div class="wrap ej-next-inner">' +
      '<a class="pill-btn primary ej-next-btn" href="' +
      next.href +
      '">' +
      escapeHtml(next.label) +
      '</a>' +
      '</div></section>'
    );
  }

  function renderEngine() {
    var checks = SCENARIO.validations
      .map(function (item) {
        return (
          '<tr><th scope="row">' +
          escapeHtml(item.label) +
          '</th><td><span class="ej-check-ok">' +
          escapeHtml(item.result) +
          '</span></td><td>' +
          escapeHtml(item.detail) +
          '</td></tr>'
        );
      })
      .join('');

    var decisions = SCENARIO.decisionOptions
      .map(function (option) {
        var active = option === SCENARIO.decision ? ' ej-decision--active' : ' ej-decision--inactive';
        return '<div class="ej-decision' + active + '">' + escapeHtml(option) + '</div>';
      })
      .join('');

    return (
      '<section class="ej-page ej-page-engine" aria-labelledby="ej-engine-heading">' +
      '<div class="wrap">' +
      '<span class="kicker">ENGINE — VALIDATION</span>' +
      '<h1 id="ej-engine-heading">A procurement appears compliant.</h1>' +
      '<p class="lead">A €250,000 critical infrastructure procurement reaches the executive desk with complete documentation. The question is not whether it looks correct — it is whether it can actually be executed.</p>' +
      renderProcurementCard('ej-procurement--problem') +
      '<div class="ej-question">' +
      '<p class="ej-question-label">Executive question</p>' +
      '<p class="ej-question-text">' +
      escapeHtml(SCENARIO.question) +
      '</p>' +
      '<p class="ej-question-note">' +
      escapeHtml(SCENARIO.compliantLabel) +
      ' on paper. Execution risk remains invisible until validation.</p>' +
      '</div>' +
      '<div class="ej-validation">' +
      '<h2>Validation gates</h2>' +
      '<table class="ej-validation-table"><thead><tr><th scope="col">Gate</th><th scope="col">Result</th><th scope="col">Basis</th></tr></thead><tbody>' +
      checks +
      '</tbody></table>' +
      '</div>' +
      '<div class="ej-decision-panel">' +
      '<h2>Governed decision</h2>' +
      '<div class="ej-decision-row" role="group" aria-label="Decision outcome">' +
      decisions +
      '</div>' +
      '<p class="ej-decision-note">Decision recorded under ' +
      escapeHtml(SCENARIO.executionId) +
      '.</p>' +
      '</div>' +
      '</div></section>'
    );
  }

  function renderOne() {
    var rows = [
      ['Mission', SCENARIO.workspace.mission],
      ['Decision', SCENARIO.workspace.decision],
      ['Execution', SCENARIO.workspace.execution],
      ['Evidence', SCENARIO.workspace.evidence],
      ['Outcome', SCENARIO.workspace.outcome],
    ]
      .map(function (row) {
        return (
          '<div class="ej-workspace-row"><span class="ej-workspace-label">' +
          escapeHtml(row[0]) +
          '</span><p>' +
          escapeHtml(row[1]) +
          '</p></div>'
        );
      })
      .join('');

    return (
      '<section class="ej-page ej-page-one" aria-labelledby="ej-one-heading">' +
      '<div class="wrap">' +
      '<span class="kicker">ONE — OPERATION</span>' +
      '<h1 id="ej-one-heading">Executive workspace</h1>' +
      '<p class="lead">Operational view of the validated execution — mission through outcome.</p>' +
      '<div class="ej-workspace ej-workspace--flow">' +
      rows +
      '</div>' +
      '</div></section>'
    );
  }

  function renderProof() {
    var rows = SCENARIO.proofRecords
      .map(function (record) {
        return (
          '<div class="ej-proof-row"><span class="ej-proof-label">' +
          escapeHtml(record.label) +
          '</span><span class="ej-proof-value">' +
          escapeHtml(record.value) +
          '</span></div>'
        );
      })
      .join('');

    return (
      '<section class="ej-page ej-page-proof" aria-labelledby="ej-proof-heading">' +
      '<div class="wrap">' +
      '<span class="kicker">PROOF — EVIDENCE</span>' +
      '<h1 id="ej-proof-heading">Public execution proof</h1>' +
      '<p class="lead">The same execution — evidence view. Verifiable record. No reconstructed report.</p>' +
      '<div class="ej-proof-panel">' +
      rows +
      '</div>' +
      '<p class="ej-proof-footnote">Completed execution evidence. Demonstration scenario record.</p>' +
      '</div></section>'
    );
  }

  function renderPilot() {
    return (
      '<section class="ej-page ej-page-pilot" aria-labelledby="ej-pilot-heading">' +
      '<div class="wrap">' +
      '<span class="kicker">PILOT — ADOPTION</span>' +
      '<h1 id="ej-pilot-heading">Request an institutional pilot</h1>' +
      '<p class="lead">Move from understanding to governed adoption with a structured institutional pilot.</p>' +
      '<div class="ej-pilot-value">' +
      '<h2>Pilot process</h2>' +
      '<ol class="ej-pilot-list ej-pilot-process">' +
      '<li>Executive assessment and scope definition</li>' +
      '<li>Live scenario validation in ENGINE</li>' +
      '<li>Evidence review and board briefing</li>' +
      '<li>Pilot agreement and deployment planning</li>' +
      '</ol>' +
      '<h2>Expected timeline</h2>' +
      '<p class="ej-pilot-timeline">4–6 weeks from request to governed pilot launch.</p>' +
      '<h2>What you receive</h2>' +
      '<ul class="ej-pilot-list">' +
      '<li>Executive Summary and Execution Score</li>' +
      '<li>Validated pilot scope with evidence record</li>' +
      '<li>Improvement roadmap for mission-critical execution</li>' +
      '<li>Path to operational deployment in EXECUTIA ONE</li>' +
      '</ul>' +
      '</div>' +
      '</div></section>'
    );
  }

  function mountChrome(pageId) {
    var chrome = document.querySelector('[data-ej-chrome]');
    if (!chrome || chrome.getAttribute('data-ej-static') === 'true') return;
    chrome.innerHTML = renderBreadcrumb(pageId) + renderChromeExtras(pageId);
  }

  function mountPageContent(pageId) {
    var mount = document.querySelector('[data-ej-content]');
    if (!mount || mount.getAttribute('data-ej-static') === 'true') return;
    var html = '';
    if (pageId === 'engine') html = renderEngine();
    else if (pageId === 'one') html = renderOne();
    else if (pageId === 'proof') html = renderProof();
    else if (pageId === 'pilot') html = renderPilot();
    mount.innerHTML = html;
  }

  function mountNextCta(pageId) {
    var mount = document.querySelector('[data-ej-next]');
    if (!mount || mount.getAttribute('data-ej-static') === 'true') return;
    mount.outerHTML = renderNextCta(pageId);
  }

  function mountHeroScenario() {
    var mount = document.getElementById('hp-funnel-journey');
    if (!mount || mount.getAttribute('data-ej-static') === 'true') return;
    mount.innerHTML = renderHeroScenario();
    mount.classList.add('ej-hero-scenario-wrap');
  }

  window.EXECUTIA_JOURNEY = {
    SCENARIO: SCENARIO,
    mount: function (pageId) {
      mountChrome(pageId);
      mountPageContent(pageId);
      mountNextCta(pageId);
    },
  };

  document.addEventListener('DOMContentLoaded', function () {
    var pageId = document.body.getAttribute('data-page');
    if (!pageId || !window.EXECUTIA_JOURNEY) return;
    if (['engine', 'one', 'proof', 'pilot'].indexOf(pageId) === -1) return;
    window.EXECUTIA_JOURNEY.mount(pageId);
  });
})();
