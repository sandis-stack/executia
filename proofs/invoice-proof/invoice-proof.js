/**
 * Invoice Execution Proof v0.1
 * Invoice received → one approval → Execution Complete.
 */
(function () {
  var app = document.getElementById('ip-app');
  if (!app) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var timers = [];

  function clearTimers() {
    timers.forEach(function (id) {
      clearTimeout(id);
    });
    timers = [];
  }

  function later(fn, ms) {
    var id = setTimeout(fn, reduceMotion ? 0 : ms);
    timers.push(id);
  }

  function el(html) {
    var wrap = document.createElement('div');
    wrap.innerHTML = html.trim();
    return wrap.firstElementChild;
  }

  function mount(node) {
    clearTimers();
    app.innerHTML = '';
    app.appendChild(node);
  }

  function screenReceived() {
    var node = el(
      '<section class="lp-screen" data-screen="received">' +
        '<p class="lp-kicker">Invoice received</p>' +
        '<h1 class="lp-title">A supplier invoice has arrived.</h1>' +
        '<p class="lp-lead">You do not enter it. You do not file it. You only decide what requires judgement.</p>' +
        '<div class="ip-invoice-card">' +
          '<p class="ip-invoice-id">Invoice INV-4821</p>' +
          '<p class="ip-amount">€2,480.00</p>' +
          '<p class="ip-vendor">Nordic Workspace Supplies</p>' +
          '<div class="lp-meta">' +
            '<div class="lp-meta-row"><span>Issued</span><span>8 Aug 2026</span></div>' +
            '<div class="lp-meta-row"><span>Due</span><span>22 Aug 2026</span></div>' +
            '<div class="lp-meta-row"><span>VAT</span><span>€413.33 included</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="lp-actions">' +
          '<button type="button" class="lp-btn" data-next>Continue</button>' +
        '</div>' +
      '</section>'
    );
    node.querySelector('[data-next]').addEventListener('click', screenEvidence);
    mount(node);
  }

  function screenEvidence() {
    var node = el(
      '<section class="lp-screen" data-screen="evidence">' +
        '<p class="lp-kicker">Evidence</p>' +
        '<h1 class="lp-title">The invoice is already held.</h1>' +
        '<p class="lp-lead">Evidence is captured and bound to this execution. No download. No folder. No re-upload.</p>' +
        '<div class="lp-evidence">' +
          '<p class="lp-evidence-status"><span class="lp-check" aria-hidden="true">✓</span> Evidence captured</p>' +
          '<p class="lp-evidence-detail">INV-4821 · Nordic Workspace Supplies · €2,480.00</p>' +
        '</div>' +
        '<div class="lp-actions">' +
          '<button type="button" class="lp-btn" data-next>Continue</button>' +
        '</div>' +
      '</section>'
    );
    node.querySelector('[data-next]').addEventListener('click', screenApprove);
    mount(node);
    later(screenApprove, 1500);
  }

  function screenApprove() {
    var node = el(
      '<section class="lp-screen" data-screen="approve">' +
        '<p class="lp-kicker">Human judgement</p>' +
        '<h1 class="lp-title">Approve this invoice?</h1>' +
        '<p class="lp-lead">This is the only decision that requires you. Amount, vendor, and due date are already understood.</p>' +
        '<div class="ip-invoice-card">' +
          '<p class="ip-invoice-id">Invoice INV-4821</p>' +
          '<p class="ip-amount">€2,480.00</p>' +
          '<p class="ip-vendor">Nordic Workspace Supplies · Due 22 Aug 2026</p>' +
        '</div>' +
        '<div class="lp-actions lp-choice">' +
          '<button type="button" class="lp-btn" data-approve>Approve</button>' +
          '<button type="button" class="lp-btn lp-btn-secondary" data-hold>Hold for review</button>' +
        '</div>' +
      '</section>'
    );

    node.querySelector('[data-approve]').addEventListener('click', screenEngine);

    node.querySelector('[data-hold]').addEventListener('click', function () {
      var hold = el(
        '<section class="lp-screen" data-screen="hold">' +
          '<p class="lp-kicker">Held</p>' +
          '<h1 class="lp-title">Waiting for your judgement.</h1>' +
          '<p class="lp-lead">Nothing else proceeds until you decide. That is correct — not unfinished administration.</p>' +
          '<div class="lp-actions">' +
            '<button type="button" class="lp-btn" data-approve>Approve now</button>' +
          '</div>' +
        '</section>'
      );
      hold.querySelector('[data-approve]').addEventListener('click', screenEngine);
      mount(hold);
    });

    mount(node);
  }

  function screenEngine() {
    var steps = [
      'Evidence verified',
      'Classification complete',
      'Tax impact calculated',
      'Payment scheduled for due date',
      'Cashflow updated',
      'Forecast updated',
      'Archive complete',
    ];

    var list = steps
      .map(function (label, i) {
        return (
          '<li class="lp-engine-item" data-step="' +
          i +
          '">' +
          '<span class="lp-check" aria-hidden="true">✓</span>' +
          '<span>' +
          label +
          '</span>' +
          '</li>'
        );
      })
      .join('');

    var node = el(
      '<section class="lp-screen" data-screen="engine">' +
        '<p class="lp-kicker">Engine</p>' +
        '<h1 class="lp-title">Execution in progress.</h1>' +
        '<p class="lp-lead">Approved. Administrative consequences are completing now.</p>' +
        '<ul class="lp-engine-list">' +
        list +
        '</ul>' +
      '</section>'
    );

    mount(node);

    var items = node.querySelectorAll('.lp-engine-item');
    items.forEach(function (item, index) {
      later(function () {
        item.classList.add('is-done');
        if (index === items.length - 1) {
          later(screenComplete, 650);
        }
      }, 420 + index * 480);
    });
  }

  function screenComplete() {
    var node = el(
      '<section class="lp-screen" data-screen="complete">' +
        '<p class="lp-kicker">Complete</p>' +
        '<h1 class="lp-title">Execution Complete</h1>' +
        '<ul class="lp-complete-list">' +
          '<li><span class="lp-check" aria-hidden="true">✓</span> Evidence stored</li>' +
          '<li><span class="lp-check" aria-hidden="true">✓</span> Classification complete</li>' +
          '<li><span class="lp-check" aria-hidden="true">✓</span> Tax impact updated</li>' +
          '<li><span class="lp-check" aria-hidden="true">✓</span> Payment scheduled</li>' +
          '<li><span class="lp-check" aria-hidden="true">✓</span> Forecast updated</li>' +
        '</ul>' +
        '<p class="lp-still">Nothing left to do.</p>' +
        '<p class="ip-time-note">What often takes about an hour is finished in a few minutes — because you only decided, and the Engine executed.</p>' +
        '<button type="button" class="lp-restart" data-restart>Begin again</button>' +
      '</section>'
    );
    node.querySelector('[data-restart]').addEventListener('click', screenReceived);
    mount(node);
  }

  screenReceived();
})();
