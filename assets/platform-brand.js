/**
 * EXECUTIA global brand + footers.
 * Canonical: ENTRY institutional footer (all public pages except Contact/legal destinations).
 * Legal destination pages: compact legal footer.
 */
(function () {
  var LEGAL_NAV =
    '<a href="/privacy">Privacy</a>' +
    '<span class="legal-footer-sep" aria-hidden="true">\u00b7</span>' +
    '<a href="/terms">Terms</a>' +
    '<span class="legal-footer-sep" aria-hidden="true">\u00b7</span>' +
    '<a href="/cookies">Cookies</a>' +
    '<span class="legal-footer-sep" aria-hidden="true">\u00b7</span>' +
    '<a href="/gdpr">Data Protection</a>' +
    '<span class="legal-footer-sep" aria-hidden="true">\u00b7</span>' +
    '<a href="/contact">Contact</a>';

  var LEGAL_COPY =
    '\u00a9 2026 EXECUTIA AS \u00b7 Org. no. 838 230 962';

  function renderBrandIdentity() {
    return (
      '<a class="brand shell-brand" href="/" aria-label="EXECUTIA home">' +
      '<span class="brand-main">EXECUTIA\u2122</span></a>'
    );
  }

  /** Canonical platform footer — identical on every public page except legal destinations. */
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
      '<nav class="entry-footer-nav entry-footer-nav--legal" aria-label="Legal and contact">' +
      '<a href="/privacy">Privacy</a>' +
      '<a href="/terms">Terms</a>' +
      '<a href="/cookies">Cookies</a>' +
      '<a href="/gdpr">Data Protection</a>' +
      '<a href="/contact">Contact</a>' +
      '<a href="https://www.linkedin.com/in/sandis-boiko-189405281" target="_blank" rel="noopener noreferrer">LinkedIn</a>' +
      '</nav>' +
      '<hr class="entry-footer-rule" />' +
      '<p class="entry-footer-copy">' +
      LEGAL_COPY +
      '</p>' +
      '</div>' +
      '</footer>'
    );
  }

  /** Minimal legal footer — Contact and legal destination pages. */
  function renderLegalFooter() {
    return (
      '<footer class="site-footer legal-footer" role="contentinfo">' +
      '<div class="legal-footer-inner">' +
      '<p class="legal-footer-copy">' +
      LEGAL_COPY +
      '</p>' +
      '<nav class="legal-footer-nav" aria-label="Legal">' +
      LEGAL_NAV +
      '</nav>' +
      '</div>' +
      '</footer>'
    );
  }

  function resolveFooterVariant(mount) {
    var attr = (mount.getAttribute('data-platform-footer') || '').trim().toLowerCase();
    if (attr === 'legal') return 'legal';
    if (document.body) {
      var page = document.body.getAttribute('data-page') || '';
      if (page === 'contact' || page === 'legal') return 'legal';
    }
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
