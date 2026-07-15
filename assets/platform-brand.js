/**
 * EXECUTIA global brand + corporate footer shell.
 * UI Constitution v1.0 — FROZEN
 */
(function () {
  function renderBrandIdentity() {
    return (
      '<a class="brand shell-brand" href="/" aria-label="EXECUTIA home">' +
      '<span class="brand-main">EXECUTIA\u2122</span></a>'
    );
  }

  function renderPlatformFooter() {
    return (
      '<footer class="site-footer shell-footer">' +
      '<div class="footer-inner">' +
      '<div class="footer-brand">' +
      '<a class="brand footer-logo" href="/" aria-label="EXECUTIA home">EXECUTIA\u2122</a>' +
      '<p>A New Standard for Organizational Execution</p>' +
      '</div>' +
      '<div class="footer-col"><h4>Platform</h4>' +
      '<a href="/">ENTRY</a>' +
      '<a href="/engine">ENGINE</a>' +
      '<a href="/pilot">PILOT</a>' +
      '<a href="/one">ONE</a>' +
      '</div>' +
      '<div class="footer-col"><h4>Resources</h4>' +
      '<a href="/#architecture">Architecture</a>' +
      '<a href="/standard">Governance</a>' +
      '<a href="/pilot">Pilot Process</a>' +
      '<a href="/support">Support</a>' +
      '<a href="/docs">Documentation</a>' +
      '</div>' +
      '<div class="footer-col"><h4>Company</h4>' +
      '<a href="/support">Support</a>' +
      '<a href="/contact">Contact</a>' +
      '</div>' +
      '</div>' +
      '<div class="footer-bottom"><span>\u00a9 EXECUTIA</span></div>' +
      '</footer>'
    );
  }

  window.EXECUTIA_BRAND = {
    renderBrandIdentity: renderBrandIdentity,
    renderPlatformFooter: renderPlatformFooter,
    mountFooter: function () {
      var mount = document.querySelector('[data-platform-footer]');
      if (mount) {
        mount.outerHTML = renderPlatformFooter();
      }
    },
  };
})();
