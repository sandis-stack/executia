/**
 * EXECUTIA global brand + footers.
 * Canonical: ENTRY institutional footer (all public pages except Contact/legal destinations).
 * Legal destination pages: compact legal footer.
 *
 * TASK-37: footers are also inlined in HTML for crawlers (SSR). mountFooter is a no-op when
 * the static footer is already present (no [data-platform-footer] mount left).
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
    '<a href="/contact">Contact</a>' +
    '<span class="legal-footer-sep" aria-hidden="true">\u00b7</span>' +
    '<a href="/about">About</a>';

  var LEGAL_COPY =
    '\u00a9 2026 EXECUTIA AS \u00b7 Org. no. 838 230 962';

  var COMPANY_LINES =
    '<p class="entry-footer-copy">' +
    LEGAL_COPY +
    '</p>' +
    '<p class="entry-footer-copy">Lerkeveien 6B, 4314 Sandnes, Norway</p>' +
    '<p class="entry-footer-copy"><a href="mailto:contact@executia.io">contact@executia.io</a></p>';

  function renderBrandIdentity() {
    return (
      '<a class="brand shell-brand" href="/" aria-label="EXECUTIA home">' +
      '<svg class="brand-mark" viewBox="3 4 56 56" aria-hidden="true" focusable="false"><circle cx="10" cy="32" r="4" fill="#008C9C"/><path fill="currentColor" d="M24 8h32v8H32v12h20v8H32v12h24v8H24V36h-6v-8h6z"/></svg><span class="brand-main">EXECUTIA<span class="brand-tm">\u00ae</span></span></a>'
    );
  }

  /** Canonical platform footer — identical on every public page except legal destinations. */
  function renderInstitutionalFooter() {
    return (
      '<footer class="site-footer entry-footer" role="contentinfo" data-footer-ssr="true">' +
      '<div class="entry-footer-inner">' +
      '<svg class="entry-footer-mark" viewBox="3 4 56 56" aria-hidden="true" focusable="false"><circle cx="10" cy="32" r="4" fill="#008C9C"/><path fill="currentColor" d="M24 8h32v8H32v12h20v8H32v12h24v8H24V36h-6v-8h6z"/></svg>' +
      '<p class="entry-footer-brand">EXECUTIA<span class="brand-tm">\u00ae</span></p>' +
      '<p class="entry-footer-standard">EXECUTIA validates execution before it happens.</p>' +
      '<hr class="entry-footer-rule" />' +
      '<p class="entry-footer-model">Built around the Execution Integrity Model\u00ae.</p>' +
      '<hr class="entry-footer-rule" />' +
      '<nav class="entry-footer-nav entry-footer-nav--legal" aria-label="Legal and contact">' +
      '<a href="/privacy">Privacy</a>' +
      '<a href="/terms">Terms</a>' +
      '<a href="/cookies">Cookies</a>' +
      '<a href="/gdpr">Data Protection</a>' +
      '<a href="/contact">Contact</a>' +
      '<a href="/about">About</a>' +
      '<a href="https://www.linkedin.com/in/sandis-boiko-189405281" target="_blank" rel="noopener noreferrer">Sandis Boiko \u00b7 LinkedIn</a>' +
      '</nav>' +
      '<hr class="entry-footer-rule" />' +
      COMPANY_LINES +
      '</div>' +
      '</footer>'
    );
  }

  /** Minimal legal footer — Contact and legal destination pages. */
  function renderLegalFooter() {
    return (
      '<footer class="site-footer legal-footer" role="contentinfo" data-footer-ssr="true">' +
      '<div class="legal-footer-inner">' +
      '<p class="legal-footer-copy">' +
      LEGAL_COPY +
      '</p>' +
      '<p class="legal-footer-copy">Lerkeveien 6B, 4314 Sandnes, Norway</p>' +
      '<p class="legal-footer-copy"><a href="mailto:contact@executia.io">contact@executia.io</a></p>' +
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
      // Already server-rendered — leave alone (TASK-37 crawler SSR).
      if (document.querySelector('footer[data-footer-ssr="true"]')) return;
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
  if (document.querySelector('[data-platform-footer]') || document.querySelector('footer[data-footer-ssr="true"]')) {
    bootFooter();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootFooter);
  } else {
    bootFooter();
  }
})();
