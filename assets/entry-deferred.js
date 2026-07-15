/**
 * MISSION-005A — Defer below-fold ENTRY widgets until near viewport.
 */
(function () {
  'use strict';

  var bundles = [
    {
      sel: '#execution-value',
      css: '/assets/execution-value-calculator.css',
      js: '/assets/execution-value-calculator.js',
      module: true,
    },
  ];

  var loaded = {};

  function loadStylesheet(href) {
    if (loaded['css:' + href]) return;
    loaded['css:' + href] = true;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function loadScript(src, isModule) {
    if (loaded['js:' + src]) return;
    loaded['js:' + src] = true;
    var script = document.createElement('script');
    script.src = src;
    if (isModule) script.type = 'module';
    script.defer = true;
    document.body.appendChild(script);
  }

  function loadBundle(bundle) {
    if (bundle.css) loadStylesheet(bundle.css);
    if (bundle.js) loadScript(bundle.js, bundle.module);
  }

  function observe(bundle) {
    var target = document.querySelector(bundle.sel);
    if (!target) return;

    if (!('IntersectionObserver' in window)) {
      loadBundle(bundle);
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        if (!entries[0].isIntersecting) return;
        loadBundle(bundle);
        observer.disconnect();
      },
      { rootMargin: '240px 0px' }
    );

    observer.observe(target);
  }

  bundles.forEach(observe);
})();
