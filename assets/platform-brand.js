/**
 * EXECUTIA global brand + corporate footer shell.
 * UI Constitution v1.0 — FROZEN (platform pages)
 * ENTRY uses institutional authority footer (Block 6).
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
      '<a href="/proof">PROOF</a>' +
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

  function renderEntryFooter() {
    return (
      '<footer class="site-footer entry-footer" role="contentinfo">' +
      '<div class="entry-footer-inner">' +
      '<p class="entry-footer-brand">EXECUTIA\u2122</p>' +
      '<p class="entry-footer-standard">Execution Integrity Standard</p>' +
      '<hr class="entry-footer-rule" />' +
      '<p class="entry-footer-model">Built around the Execution Integrity Model\u2122.</p>' +
      '<p class="entry-footer-ip">Patent pending.</p>' +
      '<hr class="entry-footer-rule" />' +
      '<nav class="entry-footer-nav" aria-label="Legal and contact">' +
      '<a href="/contact">Contact</a>' +
      '<a href="https://www.linkedin.com/in/sandis-boiko-189405281" target="_blank" rel="noopener noreferrer">LinkedIn</a>' +
      '<a href="/privacy">Privacy</a>' +
      '<a href="/terms">Terms</a>' +
      '</nav>' +
      '<hr class="entry-footer-rule" />' +
      '<p class="entry-footer-copy">\u00a9 EXECUTIA. All rights reserved.</p>' +
      '</div>' +
      '</footer>'
    );
  }

  window.EXECUTIA_BRAND = {
    renderBrandIdentity: renderBrandIdentity,
    renderPlatformFooter: renderPlatformFooter,
    renderEntryFooter: renderEntryFooter,
    mountFooter: function () {
      var mount = document.querySelector('[data-platform-footer]');
      if (!mount) return;
      var isEntry = document.body && document.body.getAttribute('data-page') === 'entry';
      mount.outerHTML = isEntry ? renderEntryFooter() : renderPlatformFooter();
    },
  };

  // ENTRY has no [data-platform-header], so platform-nav.js never calls mountFooter.
  // This script is placed immediately after [data-platform-footer] — mount here.
  function bootFooter() {
    window.EXECUTIA_BRAND.mountFooter();
  }
  if (document.querySelector('[data-platform-footer]')) {
    bootFooter();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootFooter);
  } else {
    bootFooter();
  }
})();
