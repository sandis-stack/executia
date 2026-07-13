/**
 * EXECUTIA Platform Navigation — PRODUCT-003
 * Golden rule: EXECUTIA logo ALWAYS → https://executia.io/
 */
(function () {
  const ORIGIN = 'https://executia.io';
  const ONE_URL = 'https://one.executia.io/';
  const ENGINE_LIVE = 'https://execution.executia.io/dashboard';

  const NAV = [
    { id: 'entry', label: 'ENTRY', href: ORIGIN + '/' },
    { id: 'engine', label: 'ENGINE', href: ORIGIN + '/engine' },
    { id: 'docs', label: 'DOCS', href: ORIGIN + '/docs' },
    { id: 'support', label: 'SUPPORT', href: ORIGIN + '/support' },
    { id: 'institutional', label: 'INSTITUTIONAL', href: ORIGIN + '/institutional' },
    { id: 'pilot', label: 'PILOT', href: ORIGIN + '/pilot' },
    { id: 'one', label: 'ONE', href: ORIGIN + '/one' },
  ];

  const JOURNEY = [
    { id: 'entry', label: 'ENTRY', href: ORIGIN + '/', purpose: 'Understand' },
    { id: 'engine', label: 'ENGINE', href: ORIGIN + '/engine', purpose: 'Prove' },
    { id: 'pilot', label: 'PILOT', href: ORIGIN + '/pilot', purpose: 'Adopt' },
    { id: 'one', label: 'ONE', href: ORIGIN + '/one', purpose: 'Operate' },
  ];

  function navLinks(activeId) {
    return NAV.map(function (item) {
      const cls = item.id === activeId ? ' active' : '';
      return '<a data-nav="' + item.id + '" href="' + item.href + '" class="' + cls.trim() + '">' + item.label + '</a>';
    }).join('');
  }

  function journeyBar(activeId) {
    return (
      '<div class="journey-bar" aria-label="EXECUTIA journey"><div class="wrap">' +
      JOURNEY.map(function (stage, index) {
        const sep = index > 0 ? '<span class="journey-sep" aria-hidden="true">→</span>' : '';
        const isActive = stage.id === activeId;
        const mark = isActive ? ' ●' : '';
        const cls = isActive ? 'journey-step active' : 'journey-step';
        return (
          sep +
          '<a class="' +
          cls +
          '" href="' +
          stage.href +
          '" title="' +
          stage.purpose +
          '">' +
          stage.label +
          mark +
          '</a>'
        );
      }).join('') +
      '</div></div>'
    );
  }

  function engineFooter() {
    return (
      '<section class="engine-footer section soft">' +
      '<div class="wrap" style="text-align:center">' +
      '<h2>Ready to operate your organization?</h2>' +
      '<p class="lead">Move from proof to adoption to governed daily execution.</p>' +
      '<div class="actions" style="justify-content:center">' +
      '<a class="pill-btn" href="' + ORIGIN + '/pilot">Request Pilot</a>' +
      '<a class="pill-btn primary" href="' + ORIGIN + '/one">Open EXECUTIA ONE</a>' +
      '</div></div></section>'
    );
  }

  window.EXECUTIA_PLATFORM = {
    ORIGIN: ORIGIN,
    ONE_URL: ONE_URL,
    ENGINE_LIVE: ENGINE_LIVE,
    renderHeader: function (activeId) {
      var brandRow =
        window.EXECUTIA_BRAND && window.EXECUTIA_BRAND.renderBrandIdentity
          ? window.EXECUTIA_BRAND.renderBrandIdentity(activeId)
          : '';
      return (
        '<header class="site-header">' +
        (brandRow ? '<div class="wrap brand-row-wrap">' + brandRow + '</div>' : '') +
        '<div class="wrap header-inner">' +
        '<button class="menu-toggle" type="button" aria-label="Open navigation" aria-expanded="false"><span></span><span></span><span></span></button>' +
        '<nav class="nav" aria-label="Primary">' +
        navLinks(activeId) +
        '</nav>' +
        '<div class="header-cta"><a class="pill-btn" href="' +
        ENGINE_LIVE +
        '">Demonstrator ↗</a></div>' +
        '</div>' +
        journeyBar(activeId) +
        '</header>'
      );
    },
    engineFooter: engineFooter,
    mount: function (activeId) {
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
    const page = document.body.getAttribute('data-page');
    if (page) {
      window.EXECUTIA_PLATFORM.mount(page);
    }
  });
})();
