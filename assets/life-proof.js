/**
 * LIFE Proof v0.1 — Hypothesis #001
 * One fuel purchase. One human decision. Everything else completes.
 */
(function () {
  var app = document.getElementById('lp-app');
  if (!app) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var timers = [];
  var context = null; // 'business' | 'personal'

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

  function screenPayment() {
    var node = el(
      '<section class="lp-screen" data-screen="payment">' +
        '<p class="lp-kicker">Payment completed</p>' +
        '<h1 class="lp-title">Fuel purchase.</h1>' +
        '<p class="lp-lead">The payment is done. Ordinary. Already behind you.</p>' +
        '<div class="lp-meta">' +
          '<div class="lp-meta-row"><span>Merchant</span><span>City Fuel Station</span></div>' +
          '<div class="lp-meta-row"><span>Amount</span><span>€68.40</span></div>' +
          '<div class="lp-meta-row"><span>When</span><span>Just now</span></div>' +
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
        '<h1 class="lp-title">Proof is already held.</h1>' +
        '<p class="lp-lead">You did not file anything. Evidence of the payment is captured and bound to this execution.</p>' +
        '<div class="lp-evidence">' +
          '<p class="lp-evidence-status"><span class="lp-check" aria-hidden="true">✓</span> Evidence captured</p>' +
          '<p class="lp-evidence-detail">Payment confirmation · €68.40 · City Fuel Station</p>' +
        '</div>' +
        '<div class="lp-actions">' +
          '<button type="button" class="lp-btn" data-next>Continue</button>' +
        '</div>' +
      '</section>'
    );
    node.querySelector('[data-next]').addEventListener('click', screenClarify);
    mount(node);
    later(screenClarify, 1600);
  }

  function screenClarify() {
    var node = el(
      '<section class="lp-screen" data-screen="clarify">' +
        '<p class="lp-kicker">One clarification</p>' +
        '<h1 class="lp-title">Business or personal?</h1>' +
        '<p class="lp-lead">Only this needs your judgement. Everything else will complete from your answer.</p>' +
        '<div class="lp-actions lp-choice">' +
          '<button type="button" class="lp-btn" data-choice="business">Business</button>' +
          '<button type="button" class="lp-btn lp-btn-secondary" data-choice="personal">Personal</button>' +
        '</div>' +
      '</section>'
    );
    node.querySelectorAll('[data-choice]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        context = btn.getAttribute('data-choice');
        screenEngine();
      });
    });
    mount(node);
  }

  function screenEngine() {
    var steps = [
      'Evidence verified',
      'Classification complete',
      'Tax impact calculated',
      'Cashflow updated',
      'Forecast updated',
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

    var contextLine =
      context === 'business'
        ? 'Classified as business.'
        : 'Classified as personal.';

    var node = el(
      '<section class="lp-screen" data-screen="engine">' +
        '<p class="lp-kicker">Engine</p>' +
        '<h1 class="lp-title">Execution in progress.</h1>' +
        '<p class="lp-lead">' +
        contextLine +
        ' Consequences are completing now.</p>' +
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
          later(screenComplete, 700);
        }
      }, 480 + index * 520);
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
          '<li><span class="lp-check" aria-hidden="true">✓</span> Forecast updated</li>' +
        '</ul>' +
        '<p class="lp-still">Nothing left to do.</p>' +
        '<p class="lp-footnote">One decision. Everything else happened automatically.</p>' +
        '<button type="button" class="lp-restart" data-restart>Begin again</button>' +
      '</section>'
    );
    node.querySelector('[data-restart]').addEventListener('click', function () {
      context = null;
      screenPayment();
    });
    mount(node);
  }

  screenPayment();
})();
