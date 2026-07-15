/**
 * EXECUTIA global header + primary navigation shell.
 * UI Constitution v1.0 — FROZEN
 */
(function () {
  const NAV = [
    { id: 'entry', label: 'ENTRY', href: '/' },
    { id: 'engine', label: 'ENGINE', href: '/engine' },
    { id: 'pilot', label: 'PILOT', href: '/pilot' },
    { id: 'one', label: 'ONE', href: '/one' },
  ];

  const PAGE_ACTIVE = {
    entry: 'entry',
    engine: 'engine',
    pilot: 'pilot',
    one: 'one',
  };

  function resolveActiveId(page) {
    if (!page) return null;
    if (Object.prototype.hasOwnProperty.call(PAGE_ACTIVE, page)) {
      return PAGE_ACTIVE[page];
    }
    return null;
  }

  function navLinks(activeId) {
    return NAV.map(function (item) {
      const cls = item.id === activeId ? ' active' : '';
      return (
        '<a data-nav="' +
        item.id +
        '" href="' +
        item.href +
        '" class="' +
        cls.trim() +
        '">' +
        item.label +
        '</a>'
      );
    }).join('');
  }

  function engineFooter() {
    return (
      '<section class="engine-footer section soft">' +
      '<div class="wrap" style="text-align:center">' +
      '<h2>Ready to evaluate your organization?</h2>' +
      '<div class="actions" style="justify-content:center">' +
      '<a class="pill-btn primary" href="/request">Request Pilot</a>' +
      '</div></div></section>'
    );
  }

  window.EXECUTIA_PLATFORM = {
    renderHeader: function (activeId) {
      var brand =
        window.EXECUTIA_BRAND && window.EXECUTIA_BRAND.renderBrandIdentity
          ? window.EXECUTIA_BRAND.renderBrandIdentity()
          : '<a class="brand shell-brand" href="/" aria-label="EXECUTIA home"><span class="brand-main">EXECUTIA\u2122</span></a>';
      return (
        '<header class="site-header">' +
        '<div class="wrap header-inner">' +
        brand +
        '<button class="menu-toggle" type="button" aria-label="Open navigation" aria-expanded="false"><span></span><span></span><span></span></button>' +
        '<nav class="nav" aria-label="Primary">' +
        navLinks(activeId) +
        '</nav>' +
        '<div class="header-cta"><a class="pill-btn" href="/request">Request Pilot</a></div>' +
        '</div></header>'
      );
    },
    engineFooter: engineFooter,
    mount: function (pageId) {
      const activeId = resolveActiveId(pageId);
      const mount = document.querySelector('[data-platform-header]');
      if (mount) {
        mount.outerHTML = window.EXECUTIA_PLATFORM.renderHeader(activeId);
      }
      const footerMount = document.querySelector('[data-engine-footer]');
      if (footerMount) {
        footerMount.outerHTML = engineFooter();
      }
      if (window.EXECUTIA_BRAND && window.EXECUTIA_BRAND.mountFooter) {
        window.EXECUTIA_BRAND.mountFooter();
      }
    },
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (document.querySelector('[data-platform-header]')) {
      window.EXECUTIA_PLATFORM.mount(document.body.getAttribute('data-page'));
    }
  });
})();
