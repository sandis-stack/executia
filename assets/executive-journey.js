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
      executionStateEntry: 'Pending validation',
      executionState: 'Verified',
      evidence: 'Available',
      decision: 'Governed',
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
      { label: 'Execution ID', value: 'EXE-PROC-250K-20260715' },
      { label: 'Decision', value: 'PROCEED' },
      { label: 'Evidence', value: 'Budget certificate · Authority confirmation · Policy review' },
      { label: 'Outcome', value: 'Procurement authorized under governed execution record.' },
      { label: 'Verification status', value: 'Verified' },
      { label: 'Timestamp', value: '15 Jul 2026, 06:42 UTC' },
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
    entry: { label: 'Validate this execution', href: '/engine' },
    engine: { label: 'View executive workspace', href: '/one' },
    one: { label: 'View public proof', href: '/proof' },
    proof: { label: 'Request Institutional Pilot', href: '/pilot' },
    pilot: { label: 'Request Institutional Pilot', href: '/request' },
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
    var state =
      pageId === 'entry'
        ? SCENARIO.status.executionStateEntry
        : SCENARIO.status.executionState;
    return (
      renderDemonstrationBanner() +
      '<div class="ej-status" aria-label="Demonstration scenario status">' +
      '<div class="ej-status-item"><span class="ej-status-label">Execution State</span><strong data-ej-status="executionState">' +
      escapeHtml(state) +
      '</strong></div>' +
      '<div class="ej-status-item"><span class="ej-status-label">Evidence</span><strong data-ej-status="evidence">' +
      escapeHtml(SCENARIO.status.evidence) +
      '</strong></div>' +
      '<div class="ej-status-item"><span class="ej-status-label">Decision</span><strong data-ej-status="decision">' +
      escapeHtml(SCENARIO.status.decision) +
      '</strong></div>' +
      '</div>'
    );
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

  function renderEntry() {
    return (
      '<section class="ej-page ej-page-entry" aria-labelledby="ej-entry-heading">' +
      '<div class="wrap">' +
      '<span class="kicker">ENTRY — RECOGNITION</span>' +
      '<h1 id="ej-entry-heading">A procurement appears compliant.</h1>' +
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
      '<h1 id="ej-engine-heading">Validate execution before commitment.</h1>' +
      '<p class="lead">The same procurement is evaluated against authority, budget, approvals, policy, and evidence — before any action proceeds.</p>' +
      renderProcurementCard() +
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
      '<p class="lead">The same execution — operational view. Mission, decision, execution, evidence, and outcome in one governed record.</p>' +
      renderProcurementCard('ej-procurement--compact') +
      '<div class="ej-workspace">' +
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
      '<p class="ej-proof-footnote">Demonstration scenario record. Deterministic validation outcome — not a live production execution.</p>' +
      '</div></section>'
    );
  }

  function renderPilot() {
    return (
      '<section class="ej-page ej-page-pilot" aria-labelledby="ej-pilot-heading">' +
      '<div class="wrap">' +
      '<span class="kicker">PILOT — ADOPTION</span>' +
      '<h1 id="ej-pilot-heading">Request an institutional pilot</h1>' +
      '<p class="lead">Apply governed execution to your organization. Start with the same discipline: validate before commitment, record evidence at execution time.</p>' +
      renderProcurementCard('ej-procurement--compact') +
      '<div class="ej-pilot-value">' +
      '<h2>What the pilot delivers</h2>' +
      '<ul class="ej-pilot-list">' +
      '<li>Executive assessment against your mission-critical execution gaps</li>' +
      '<li>Governed validation for one live procurement or operational decision</li>' +
      '<li>Evidence record your board and auditors can verify</li>' +
      '<li>Path to operational deployment in EXECUTIA ONE</li>' +
      '</ul>' +
      '</div>' +
      '</div></section>'
    );
  }

  function renderHeroScenario() {
    return (
      '<div class="ej-hero-scenario">' +
      '<p class="ej-hero-scenario-label">Current execution</p>' +
      '<p class="ej-hero-scenario-title">' +
      escapeHtml(SCENARIO.title) +
      '</p>' +
      '<p class="ej-hero-scenario-amount">' +
      escapeHtml(SCENARIO.amount) +
      '</p>' +
      '<p class="ej-hero-scenario-org">' +
      escapeHtml(SCENARIO.organization) +
      '</p>' +
      '<dl class="ej-hero-scenario-ids">' +
      '<div><dt>Mission</dt><dd><code>' +
      escapeHtml(SCENARIO.missionId) +
      '</code></dd></div>' +
      '<div><dt>Status</dt><dd>' +
      escapeHtml(SCENARIO.compliantLabel) +
      '</dd></div>' +
      '</dl>' +
      '<p class="ej-hero-scenario-question">' +
      escapeHtml(SCENARIO.question) +
      '</p>' +
      '</div>'
    );
  }

  function mountChrome(pageId) {
    var chrome = document.querySelector('[data-ej-chrome]');
    if (!chrome || chrome.getAttribute('data-ej-static') === 'true') return;
    chrome.innerHTML = renderBreadcrumb(pageId) + renderStatus(pageId);
  }

  function mountPageContent(pageId) {
    var mount = document.querySelector('[data-ej-content]');
    if (!mount || mount.getAttribute('data-ej-static') === 'true') return;
    var html = '';
    if (pageId === 'entry') html = renderEntry();
    else if (pageId === 'engine') html = renderEngine();
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
      if (pageId === 'entry') mountHeroScenario();
    },
  };

  document.addEventListener('DOMContentLoaded', function () {
    var pageId = document.body.getAttribute('data-page');
    if (!pageId || !window.EXECUTIA_JOURNEY) return;
    if (['entry', 'engine', 'one', 'proof', 'pilot'].indexOf(pageId) === -1) return;
    window.EXECUTIA_JOURNEY.mount(pageId);
  });
})();
