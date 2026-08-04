/**
 * EXECUTIA ENTRY — quiet in-view reveals + mobile nav hygiene.
 */
(function () {
  if (!document.body || document.body.getAttribute('data-page') !== 'entry') return;

  var reduce =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function revealAll() {
    document.querySelectorAll('.el-reveal, .el-frag, .el-chain').forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  function initReveals() {
    if (reduce || !('IntersectionObserver' in window)) {
      revealAll();
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );

    document.querySelectorAll('.el-reveal, .el-frag, .el-chain').forEach(function (el) {
      var rect = el.getBoundingClientRect();
      var inView = rect.bottom > 0 && rect.top < (window.innerHeight || 0) * 0.95;
      if (inView) {
        el.classList.add('is-visible');
        return;
      }
      observer.observe(el);
    });
  }

  function bindMobileNavClose() {
    var header = document.querySelector('.site-header');
    if (!header) return;
    var nav = header.querySelector('.nav');
    var toggle = header.querySelector('.menu-toggle');
    if (!nav || !toggle || nav.getAttribute('data-el-nav-bound') === '1') return;
    nav.setAttribute('data-el-nav-bound', '1');

    nav.addEventListener('click', function (e) {
      var link = e.target.closest('a');
      if (!link || !nav.classList.contains('open')) return;
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open navigation');
    });
  }

  function boot() {
    initReveals();
    bindMobileNavClose();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      // Header mounts on the same event; defer one tick so it exists.
      setTimeout(boot, 0);
    });
  } else {
    setTimeout(boot, 0);
  }
})();
