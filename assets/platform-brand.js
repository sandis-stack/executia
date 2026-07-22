/**
 * EXECUTIA global brand + corporate footer shell.
 * Platform Navigation — EXECUTIA owns chrome; products are not nav items.
 */
(function () {
  const LIFE = 'https://life.executia.io';

  function renderBrandIdentity() {
    return (
      '<a class="brand shell-brand" href="/" aria-label="EXECUTIA home">' +
      '<span class="brand-dot" aria-hidden="true"></span>' +
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
      '<a href="/platform">Platform</a>' +
      '<a href="/products">Products</a>' +
      '<a href="/standard">Standard</a>' +
      '<a href="/proof">Proof</a>' +
      '<a href="/developers">Developers</a>' +
      '</div>' +
      '<div class="footer-col"><h4>Resources</h4>' +
      '<a href="/pricing">Pricing</a>' +
      '<a href="/about">About</a>' +
      '<a href="/support">Support</a>' +
      '<a href="/docs">Documentation</a>' +
      '<a href="' +
      LIFE +
      '/login">Sign in</a>' +
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
