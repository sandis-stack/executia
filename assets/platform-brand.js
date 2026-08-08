/**
 * EXECUTIA global brand + canonical institutional footer.
 * Design-system source of truth: ENTRY institutional footer (platform-wide).
 */
(function () {
  function renderBrandIdentity() {
    return (
      '<a class="brand shell-brand" href="/" aria-label="EXECUTIA home">' +
      '<span class="brand-main">EXECUTIA\u2122</span></a>'
    );
  }

  /** Canonical platform footer — identical on every public page. */
  function renderInstitutionalFooter() {
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
    renderInstitutionalFooter: renderInstitutionalFooter,
    /** @deprecated Use renderInstitutionalFooter — kept as alias for callers. */
    renderEntryFooter: renderInstitutionalFooter,
    /** @deprecated Legacy multi-column footer removed; alias to institutional. */
    renderPlatformFooter: renderInstitutionalFooter,
    mountFooter: function () {
      var mount = document.querySelector('[data-platform-footer]');
      if (!mount) return;
      mount.outerHTML = renderInstitutionalFooter();
    },
  };

  // Mount whenever [data-platform-footer] is present (ENTRY has no platform header).
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
