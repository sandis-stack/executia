/**
 * HOW IT WORKS → EXECUTIA Engine
 * Continuous narrative: flow completes, then architecture assembles with guided focus.
 */
(function () {
  'use strict';

  var FOCUS_CLASSES = [
    'is-focus-business',
    'is-focus-integrity',
    'is-focus-execution',
    'is-focus-connections',
    'is-focus-complete',
  ];

  var GUIDE_COPY = {
    business: 'Business defines intent.',
    integrity: 'Integrity governs execution.',
    execution: 'Execution creates evidence.',
    connections: 'Governance connects every layer.',
    complete: 'This is the EXECUTIA Engine.',
  };

  function preferReduced() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function after(ms, fn) {
    return window.setTimeout(fn, preferReduced() ? 0 : ms);
  }

  function setFocus(section, name) {
    if (!section) return;
    FOCUS_CLASSES.forEach(function (cls) {
      section.classList.remove(cls);
    });
    if (name) section.classList.add('is-focus-' + name);
    var guide = section.querySelector('[data-engine-guide]');
    if (guide) {
      guide.textContent = GUIDE_COPY[name] || '';
      guide.classList.toggle('is-on', Boolean(GUIDE_COPY[name]));
    }
  }

  function mountFlow(flow, onComplete) {
    var steps = flow.querySelectorAll('[data-how-step]');
    var how = flow.closest('.hp-how');
    if (!steps.length) {
      if (onComplete) onComplete();
      return;
    }

    if (preferReduced()) {
      for (var i = 0; i < steps.length; i += 1) steps[i].classList.add('is-on');
      if (how) how.classList.add('is-flow-complete');
      if (onComplete) onComplete();
      return;
    }

    var revealed = false;
    function reveal() {
      if (revealed) return;
      revealed = true;
      for (var s = 0; s < steps.length; s += 1) {
        (function (el, delay) {
          after(delay, function () {
            el.classList.add('is-on');
            if (delay === (steps.length - 1) * 380) {
              after(520, function () {
                if (how) how.classList.add('is-flow-complete');
                if (onComplete) onComplete();
              });
            }
          });
        })(steps[s], s * 380);
      }
    }

    if (!('IntersectionObserver' in window)) {
      reveal();
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        if (entries[0] && entries[0].isIntersecting) {
          reveal();
          io.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(flow);
  }

  function assembleEngine(section) {
    if (!section || section.getAttribute('data-assembled') === '1') return;
    section.setAttribute('data-assembled', '1');
    section.classList.add('is-assembling');

    var bridge = section.querySelector('[data-engine-bridge]');
    var axis = section.querySelector('.ea-execution-axis');
    var business = section.querySelector('.ea-slab--business');
    var boundaryUpper = section.querySelector('[data-spec-node="governance-boundary-upper"]');
    var integrity = section.querySelector('.ea-slab--integrity');
    var boundaryLower = section.querySelector('[data-spec-node="governance-boundary-lower"]');
    var execution = section.querySelector('.ea-slab--execution');
    var title = section.querySelector('[data-engine-title]');
    var footer = section.querySelector('.plate-iso-footer');
    var download = section.querySelector('.spec-download-dock');
    var next = section.querySelector('[data-engine-next]');
    var apps = document.getElementById('applications');

    function on(el) {
      if (el) el.classList.add('is-on');
    }

    if (preferReduced()) {
      [bridge, axis, business, boundaryUpper, integrity, boundaryLower, execution, title, footer, download, next].forEach(on);
      setFocus(section, 'complete');
      section.classList.remove('is-assembling');
      section.classList.add('is-assembled');
      if (apps) apps.classList.add('is-engine-ready');
      return;
    }

    /* Guided reveal: logic first, then layers, then connections, then title. */
    after(0, function () {
      on(bridge);
      setFocus(section, 'business');
    });

    after(650, function () {
      on(business);
      setFocus(section, 'business');
    });

    after(1750, function () {
      on(integrity);
      setFocus(section, 'integrity');
    });

    after(2900, function () {
      on(execution);
      setFocus(section, 'execution');
    });

    after(3900, function () {
      on(boundaryUpper);
      on(boundaryLower);
      on(axis);
      setFocus(section, 'connections');
    });

    after(4800, function () {
      setFocus(section, 'complete');
    });

    after(5400, function () {
      on(title);
    });

    after(6000, function () {
      on(footer);
      on(download);
    });

    after(6600, function () {
      on(next);
      if (apps) apps.classList.add('is-engine-ready');
      section.classList.remove('is-assembling');
      section.classList.add('is-assembled');
    });
  }

  function watchEngine(section, ready) {
    if (!section) return;

    if (!('IntersectionObserver' in window)) {
      if (ready.flowDone) assembleEngine(section);
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        if (entries[0] && entries[0].isIntersecting) {
          ready.engineInView = true;
          if (ready.flowDone) {
            after(200, function () {
              assembleEngine(section);
            });
            io.disconnect();
          }
        }
      },
      { threshold: 0.2 }
    );
    io.observe(section);
    ready.engineIo = io;
  }

  function mountApplications() {
    var cards = document.querySelectorAll('[data-app-card]');
    if (!cards.length) return;

    if (preferReduced()) {
      for (var i = 0; i < cards.length; i += 1) cards[i].classList.add('is-on');
      return;
    }

    if (!('IntersectionObserver' in window)) {
      for (var j = 0; j < cards.length; j += 1) cards[j].classList.add('is-on');
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var card = entry.target;
          var index = Number(card.getAttribute('data-app-index') || 0);
          after(index * 140, function () {
            card.classList.add('is-on');
          });
          io.unobserve(card);
        });
      },
      { threshold: 0.35 }
    );

    for (var k = 0; k < cards.length; k += 1) {
      cards[k].setAttribute('data-app-index', String(k));
      io.observe(cards[k]);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var flow = document.querySelector('[data-how-flow]');
    var engine = document.querySelector('[data-engine-emerge]');
    var ready = { flowDone: false, engineInView: false };

    watchEngine(engine, ready);
    mountApplications();

    if (flow) {
      mountFlow(flow, function () {
        ready.flowDone = true;
        after(700, function () {
          if (ready.engineInView || (engine && engine.getBoundingClientRect().top < window.innerHeight * 0.92)) {
            assembleEngine(engine);
            if (ready.engineIo) ready.engineIo.disconnect();
          }
        });
      });
    } else if (engine) {
      ready.flowDone = true;
      assembleEngine(engine);
    }
  });
})();
