/**
 * ENTRY v1 — quiet reveal motion (reduced-motion safe).
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

  function mount() {
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
