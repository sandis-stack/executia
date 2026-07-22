/**
 * EXECUTIA global header — approved Platform Navigation.
 * Platform · Products · Standard · Proof · Developers · Pricing · About · Sign in
 * Journey stages (ENTRY · ENGINE · PILOT · ONE) are not navigation.
 */
(function () {
  const LIFE = 'https://life.executia.io';

  const NAV = [
    { id: 'platform', label: 'Platform', href: '/platform' },
    { id: 'products', label: 'Products', href: '/products' },
    { id: 'standard', label: 'Standard', href: '/standard' },
    { id: 'proof', label: 'Proof', href: '/proof' },
    { id: 'developers', label: 'Developers', href: '/developers' },
    { id: 'pricing', label: 'Pricing', href: '/pricing' },
    { id: 'about', label: 'About', href: '/about' },
  ];

  const PAGE_ACTIVE = {
    entry: 'platform',
    platform: 'platform',
    engine: 'platform',
    pilot: 'products',
    one: 'products',
    products: 'products',
    standard: 'standard',
    proof: 'proof',
    docs: 'developers',
    developers: 'developers',
    pricing: 'pricing',
    about: 'about',
    institutional: 'about',
    support: 'about',
    contact: 'about',
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
    return '';
  }

  window.EXECUTIA_PLATFORM = {
    renderHeader: function (activeId) {
      var brand =
        window.EXECUTIA_BRAND && window.EXECUTIA_BRAND.renderBrandIdentity
          ? window.EXECUTIA_BRAND.renderBrandIdentity()
          : '<a class="brand shell-brand" href="/" aria-label="EXECUTIA home"><span class="brand-dot" aria-hidden="true"></span><span class="brand-main">EXECUTIA\u2122</span></a>';
      return (
        '<header class="site-header">' +
        '<div class="wrap header-inner">' +
        brand +
        '<button class="menu-toggle" type="button" aria-label="Open navigation" aria-expanded="false"><span></span><span></span><span></span></button>' +
        '<nav class="nav" aria-label="Primary">' +
        navLinks(activeId) +
        '<a data-nav="signin" class="nav-signin" href="' +
        LIFE +
        '/login">Sign in</a>' +
        '</nav>' +
        '<div class="header-cta"><a class="pill-btn" href="' +
        LIFE +
        '/login">Sign in</a></div>' +
        '</div></header>'
      );
    },
    engineFooter: engineFooter,
    mount: function (pageId) {
      const activeId = resolveActiveId(pageId);
      const mount = document.querySelector('[data-platform-header]');
      if (mount && !mount.querySelector('.site-header')) {
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
