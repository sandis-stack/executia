/**
 * EXECUTIA global brand + footer — FINAL NAVIGATION
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
