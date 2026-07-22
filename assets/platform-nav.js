/**
 * EXECUTIA global header — FINAL NAVIGATION
 * Public: EXECUTIA + Request Pilot only.
 */
(function () {
  function renderHeader() {
    var brand =
      window.EXECUTIA_BRAND && window.EXECUTIA_BRAND.renderBrandIdentity
        ? window.EXECUTIA_BRAND.renderBrandIdentity()
        : '<a class="brand shell-brand" href="/" aria-label="EXECUTIA home"><span class="brand-main">EXECUTIA\u2122</span></a>';
    return (
      '<header class="site-header">' +
      '<div class="wrap header-inner">' +
      brand +
      '<button class="menu-toggle" type="button" aria-label="Open navigation" aria-expanded="false"><span></span><span></span><span></span></button>' +
      '<nav class="nav" aria-label="Primary"></nav>' +
      '<div class="header-cta"><a class="pill-btn" href="/request">Request Pilot</a></div>' +
      '</div></header>'
    );
  }

  window.EXECUTIA_PLATFORM = {
    renderHeader: renderHeader,
    engineFooter: function () {
      return '';
    },
    mount: function () {
      var mount = document.querySelector('[data-platform-header]');
      if (mount && !mount.querySelector('.site-header')) {
        mount.outerHTML = renderHeader();
      }
      if (window.EXECUTIA_BRAND && window.EXECUTIA_BRAND.mountFooter) {
        window.EXECUTIA_BRAND.mountFooter();
      }
    },
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (document.querySelector('[data-platform-header]')) {
      window.EXECUTIA_PLATFORM.mount();
    }
  });
})();
