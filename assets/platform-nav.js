/**
 * EXECUTIA global header + primary navigation shell.
 * ENTRY nav: Approach · Engine · LIFE · ONE · GOV · Vision · Pilot + Request Pilot
 */
(function () {
  var NAV = [
    { id: 'platform', label: 'Approach', href: '/#model' },
    { id: 'engine', label: 'Engine', href: '/engine' },
    { id: 'life', label: 'LIFE', href: 'https://life.executia.io' },
    { id: 'one', label: 'ONE', href: '/one' },
    { id: 'gov', label: 'GOV', href: '/#gov' },
    { id: 'vision', label: 'Vision', href: '/#vision' },
    { id: 'pilot', label: 'Pilot', href: '/pilot' },
  ];

  var PAGE_ACTIVE = {
    entry: null,
    engine: 'engine',
    pilot: 'pilot',
    one: 'one',
    proof: 'engine',
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
      var cls = item.id === activeId ? ' active' : '';
      var external =
        item.href.indexOf('http') === 0
          ? ' target="_blank" rel="noopener noreferrer"'
          : '';
      return (
        '<a data-nav="' +
        item.id +
        '" href="' +
        item.href +
        '" class="' +
        cls.trim() +
        '"' +
        external +
        '>' +
        item.label +
        '</a>'
      );
    }).join('');
  }

  function bindMenuToggle(header) {
    var toggle = header.querySelector('.menu-toggle');
    var nav = header.querySelector('.nav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    });
  }

  function engineFooter() {
    return '';
  }

  window.EXECUTIA_PLATFORM = {
    renderHeader: function (activeId) {
      var brand =
        window.EXECUTIA_BRAND && window.EXECUTIA_BRAND.renderBrandIdentity
          ? window.EXECUTIA_BRAND.renderBrandIdentity()
          : '<a class="brand shell-brand" href="/" aria-label="EXECUTIA home"><span class="brand-main">EXECUTIA\u2122</span></a>';
      return (
        '<header class="site-header site-header--entry">' +
        '<div class="wrap header-inner">' +
        brand +
        '<button class="menu-toggle" type="button" aria-label="Open navigation" aria-expanded="false"><span></span><span></span><span></span></button>' +
        '<nav class="nav" aria-label="Primary">' +
        navLinks(activeId) +
        '</nav>' +
        '<div class="header-cta"><a class="pill-btn" href="/request" data-funnel-request>Request Pilot</a></div>' +
        '</div></header>'
      );
    },
    engineFooter: engineFooter,
    mount: function (pageId) {
      var activeId = resolveActiveId(pageId);
      var mount = document.querySelector('[data-platform-header]');
      if (mount && !mount.querySelector('.site-header')) {
        mount.outerHTML = window.EXECUTIA_PLATFORM.renderHeader(activeId);
      }
      var header = document.querySelector('.site-header');
      if (header) bindMenuToggle(header);
      var footerMount = document.querySelector('[data-engine-footer]');
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
