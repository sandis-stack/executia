/**
 * EXECUTIA global brand + corporate footer shell.
 */
(function () {
  const FOOTER_LINKS = [
    { label: 'Documentation', href: '/docs' },
    { label: 'Support', href: '/support' },
    { label: 'Contact', href: '/contact' },
  ];

  function renderBrandIdentity() {
    return (
      '<a class="brand shell-brand" href="/" aria-label="EXECUTIA home">' +
      '<span class="brand-main">EXECUTIA\u2122</span></a>'
    );
  }

  function renderPlatformFooter() {
    return (
      '<footer class="site-footer shell-footer">' +
      '<div class="wrap shell-footer-inner">' +
      renderBrandIdentity() +
      '<nav class="shell-footer-nav" aria-label="Footer">' +
      FOOTER_LINKS.map(function (link) {
        return '<a href="' + link.href + '">' + link.label + '</a>';
      }).join('') +
      '</nav></div>' +
      '<div class="shell-footer-bottom"><span>\u00a9 EXECUTIA</span></div></footer>'
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
