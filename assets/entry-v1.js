/**
 * ENTRY v1 — header menu, footer mount, quiet reveal (reduced-motion safe).
 */
(function () {
  'use strict';

  function preferReduced() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function revealAll(nodes) {
    nodes.forEach(function (n) {
      n.classList.add('is-in');
    });
  }

  function mountReveals() {
    var nodes = Array.prototype.slice.call(
      document.querySelectorAll('.ev-reveal, .ev-model li')
    );
    if (!nodes.length) return;

    if (preferReduced() || !('IntersectionObserver' in window)) {
      revealAll(nodes);
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );

    nodes.forEach(function (n, i) {
      n.style.transitionDelay = Math.min(i % 6, 5) * 0.06 + 's';
      io.observe(n);
    });
  }

  function mountMenu() {
    var toggle = document.querySelector('[data-ev-menu]');
    var nav = document.querySelector('[data-ev-nav]');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    });
  }

  function mountFooter() {
    if (window.EXECUTIA_BRAND && typeof window.EXECUTIA_BRAND.mountFooter === 'function') {
      window.EXECUTIA_BRAND.mountFooter();
    }
  }

  function boot() {
    mountMenu();
    mountFooter();
    mountReveals();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
