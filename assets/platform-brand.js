/**
 * BRAND-001 — Unified EXECUTIA brand architecture (executia.io)
 * EXECUTIA is the platform. Entry, Engine, Pilot, ONE are environments.
 */
(function () {
  const ORIGIN = 'https://executia.io';

  const ENVIRONMENTS = {
    entry: {
      id: 'entry',
      name: 'ENTRY',
      description: 'Execution Standard',
      badgeClass: 'env-badge env-entry',
      pageTitle: 'EXECUTIA\u2122 \u2014 Execution Standard',
    },
    engine: {
      id: 'engine',
      name: 'ENGINE',
      description: 'Interactive Proof',
      badgeClass: 'env-badge env-engine',
      pageTitle: 'EXECUTIA\u2122 ENGINE \u2014 Interactive Proof',
    },
    pilot: {
      id: 'pilot',
      name: 'PILOT',
      description: 'Enterprise Adoption',
      badgeClass: 'env-badge env-pilot',
      pageTitle: 'EXECUTIA\u2122 PILOT \u2014 Enterprise Adoption',
    },
    one: {
      id: 'one',
      name: 'ONE',
      description: 'Business Operating System',
      badgeClass: 'env-badge env-one',
      pageTitle: 'EXECUTIA\u2122 ONE \u2014 Business Operating System',
    },
    docs: {
      id: 'docs',
      name: 'DOCS',
      description: 'Platform Documentation',
      badgeClass: 'env-badge env-neutral',
      pageTitle: 'EXECUTIA\u2122 \u2014 Documentation',
    },
    support: {
      id: 'support',
      name: 'SUPPORT',
      description: 'Platform Support',
      badgeClass: 'env-badge env-neutral',
      pageTitle: 'EXECUTIA\u2122 \u2014 Support',
    },
    institutional: {
      id: 'institutional',
      name: 'INSTITUTIONAL',
      description: 'Government & Enterprise',
      badgeClass: 'env-badge env-neutral',
      pageTitle: 'EXECUTIA\u2122 \u2014 Institutional',
    },
  };

  const FOOTER_LINKS = [
    { label: 'Entry', href: ORIGIN + '/' },
    { label: 'Engine', href: ORIGIN + '/engine' },
    { label: 'Pilot', href: ORIGIN + '/pilot' },
    { label: 'ONE', href: ORIGIN + '/one' },
    { label: 'Documentation', href: ORIGIN + '/docs' },
    { label: 'Support', href: ORIGIN + '/support' },
  ];

  function renderBrandIdentity(envId) {
    const env = ENVIRONMENTS[envId] || ENVIRONMENTS.entry;
    return (
      '<div class="brand-identity" aria-label="EXECUTIA platform identity">' +
      '<a class="brand" href="' +
      ORIGIN +
      '/" aria-label="Return to EXECUTIA Entry">' +
      '<span class="brand-main">EXECUTIA\u2122</span></a>' +
      '<span class="brand-sep" aria-hidden="true">/</span>' +
      '<span class="' +
      env.badgeClass +
      '">' +
      env.name +
      '</span>' +
      '<span class="brand-desc">' +
      env.description +
      '</span>' +
      '</div>'
    );
  }

  function renderPlatformFooter() {
    return (
      '<footer class="site-footer platform-footer">' +
      '<div class="footer-inner">' +
      '<div class="footer-brand">' +
      '<p class="footer-platform-label">EXECUTIA Platform</p>' +
      '<p>One platform \u2014 Understand \u2192 Prove \u2192 Adopt \u2192 Operate</p>' +
      '<a class="brand footer-logo" href="' +
      ORIGIN +
      '/" aria-label="Return to EXECUTIA Entry">EXECUTIA\u2122</a>' +
      '</div>' +
      '<nav class="footer-col" aria-label="Platform footer navigation">' +
      FOOTER_LINKS.map(function (link) {
        return '<a href="' + link.href + '">' + link.label + '</a>';
      }).join('') +
      '</nav></div>' +
      '<div class="footer-bottom"><span>\u00a9 EXECUTIA</span></div></footer>'
    );
  }

  window.EXECUTIA_BRAND = {
    ENVIRONMENTS: ENVIRONMENTS,
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
