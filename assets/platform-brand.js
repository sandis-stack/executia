/**
 * EXECUTIA global brand + footers.
 * Canonical: ENTRY institutional footer (all public pages except Contact).
 * Contact: minimal legal footer (destination-page ending).
 */
(function () {
  function renderBrandIdentity() {
    return (
      '<a class="brand shell-brand" href="/" aria-label="EXECUTIA home">' +
      '<span class="brand-main">EXECUTIA\u2122</span></a>'
    );
  }

  /** Canonical platform footer — identical on every public page except Contact. */
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

  /** Minimal legal footer — Contact destination page only. */
  function renderLegalFooter() {
    return (
      '<footer class="site-footer legal-footer" role="contentinfo">' +
      '<div class="legal-footer-inner">' +
      '<p class="legal-footer-copy">\u00a9 EXECUTIA. All rights reserved.</p>' +
      '<nav class="legal-footer-nav" aria-label="Legal">' +
      '<a href="/privacy">Privacy</a>' +
      '<span class="legal-footer-sep" aria-hidden="true">\u00b7</span>' +
      '<a href="/terms">Terms</a>' +
      '</nav>' +
      '</div>' +
      '</footer>'
    );
  }

  function resolveFooterVariant(mount) {
    var attr = (mount.getAttribute('data-platform-footer') || '').trim().toLowerCase();
    if (attr === 'legal') return 'legal';
    if (document.body && document.body.getAttribute('data-page') === 'contact') return 'legal';
    return 'institutional';
  }

  window.EXECUTIA_BRAND = {
    renderBrandIdentity: renderBrandIdentity,
    renderInstitutionalFooter: renderInstitutionalFooter,
    renderLegalFooter: renderLegalFooter,
    /** @deprecated Use renderInstitutionalFooter — kept as alias for callers. */
    renderEntryFooter: renderInstitutionalFooter,
    /** @deprecated Legacy multi-column footer removed; alias to institutional. */
    renderPlatformFooter: renderInstitutionalFooter,
    mountFooter: function () {
      var mount = document.querySelector('[data-platform-footer]');
      if (!mount) return;
      var variant = resolveFooterVariant(mount);
      mount.outerHTML =
        variant === 'legal' ? renderLegalFooter() : renderInstitutionalFooter();
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
