/**
 * ENTRY — header menu, protocol engine shell, quiet reveal helpers.
 */
(function () {
  function preferReduced() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function mountHeaderMenu() {
    var toggle = document.querySelector('[data-ev-menu]');
    var nav = document.querySelector('[data-ev-nav]');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    });
  }

  function buildProtocolVisual() {
    var reduced = preferReduced();
    var anim = reduced ? '' : ' class="ev-pulse-node"';
    var ring = reduced ? '' : ' class="ev-pulse-ring"';

    return (
      '<svg class="ev-protocol-canvas" viewBox="0 0 960 540" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Execution engine system visual">' +
      '<defs>' +
      '<radialGradient id="evProtoGlow" cx="50%" cy="45%" r="55%">' +
      '<stop offset="0%" stop-color="#0F1E2B" stop-opacity="0.9"/>' +
      '<stop offset="100%" stop-color="#070b12" stop-opacity="1"/>' +
      '</radialGradient>' +
      '<style>' +
      '.ev-pulse-node{animation:evNodePulse 2.4s ease-in-out infinite}' +
      '.ev-pulse-ring{animation:evRingPulse 2.8s ease-out infinite;transform-origin:center}' +
      '@keyframes evNodePulse{0%,100%{opacity:.55}50%{opacity:1}}' +
      '@keyframes evRingPulse{0%{opacity:.45;transform:scale(.92)}70%{opacity:0;transform:scale(1.28)}100%{opacity:0;transform:scale(1.28)}}' +
      '@media (prefers-reduced-motion:reduce){.ev-pulse-node,.ev-pulse-ring{animation:none!important}}' +
      '</style>' +
      '</defs>' +
      '<rect width="960" height="540" fill="url(#evProtoGlow)"/>' +
      '<g stroke="rgba(142,202,230,0.18)" stroke-width="1" fill="none">' +
      '<path d="M180 270 C280 180, 360 180, 480 270 C600 360, 680 360, 780 270"/>' +
      '<path d="M180 270 C280 360, 360 360, 480 270 C600 180, 680 180, 780 270"/>' +
      '<path d="M180 270 H780"/>' +
      '<path d="M480 120 V420"/>' +
      '</g>' +
      '<g fill="rgba(142,202,230,0.75)">' +
      '<circle' + anim + ' cx="180" cy="270" r="7"/>' +
      '<circle' + anim + ' cx="330" cy="210" r="5" style="animation-delay:.3s"/>' +
      '<circle' + anim + ' cx="480" cy="270" r="9" style="animation-delay:.15s"/>' +
      '<circle' + anim + ' cx="630" cy="330" r="5" style="animation-delay:.45s"/>' +
      '<circle' + anim + ' cx="780" cy="270" r="7" style="animation-delay:.6s"/>' +
      '<circle' + anim + ' cx="480" cy="140" r="4" style="animation-delay:.2s"/>' +
      '<circle' + anim + ' cx="480" cy="400" r="4" style="animation-delay:.5s"/>' +
      '</g>' +
      '<circle' + ring + ' cx="480" cy="270" r="28" fill="none" stroke="rgba(142,202,230,0.35)" stroke-width="1.5"/>' +
      '<text x="480" y="268" text-anchor="middle" fill="rgba(226,232,240,0.92)" font-family="JetBrains Mono, ui-monospace, monospace" font-size="13" letter-spacing="2">EXECUTION ENGINE</text>' +
      '<text x="480" y="290" text-anchor="middle" fill="rgba(142,202,230,0.7)" font-family="JetBrains Mono, ui-monospace, monospace" font-size="10" letter-spacing="2.5">GRAPH ONLINE</text>' +
      '</svg>' +
      '<p class="ev-protocol-status">[SYSTEM: EXECUTION ENGINE INITIALIZED] // AWAITING ASSET OVERLAY</p>'
    );
  }

  function mountProtocolVideo() {
    var root = document.querySelector('[data-protocol-video]');
    if (!root) return;

    var playBtn = root.querySelector('[data-protocol-play]');
    var cover = root.querySelector('[data-protocol-cover]');
    var player = root.querySelector('[data-protocol-player]');
    var visualHost = root.querySelector('[data-protocol-visual]');
    if (!playBtn || !cover || !player || !visualHost) return;

    /* Only branded briefing at this exact path may replace the SVG shell. */
    var VIDEO_SRC = '/videos/executia-briefing.mp4';
    var mediaReady = false;

    function showEngineVisual() {
      Array.prototype.slice.call(player.querySelectorAll('video')).forEach(function (el) {
        el.remove();
      });
      visualHost.innerHTML = buildProtocolVisual();
      visualHost.dataset.ready = '1';
      player.hidden = false;
    }

    function mountPlayback() {
      Array.prototype.slice.call(player.querySelectorAll('video')).forEach(function (el) {
        el.remove();
      });
      visualHost.innerHTML = '';
      visualHost.removeAttribute('data-ready');

      var video = document.createElement('video');
      video.controls = true;
      video.autoplay = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.setAttribute('preload', 'auto');
      video.setAttribute('aria-label', 'Protocol briefing video');
      video.src = VIDEO_SRC;
      video.addEventListener('error', function onErr() {
        video.removeEventListener('error', onErr);
        mediaReady = false;
        cover.hidden = false;
        showEngineVisual();
      });
      cover.hidden = true;
      player.hidden = false;
      player.insertBefore(video, visualHost);
      var playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(function () {});
      }
    }

    function probeBrandedAsset() {
      if (!VIDEO_SRC) {
        mediaReady = false;
        return;
      }
      var probe = document.createElement('video');
      probe.preload = 'metadata';
      probe.muted = true;
      var settled = false;
      function finish(ok) {
        if (settled) return;
        settled = true;
        mediaReady = !!ok;
        probe.removeAttribute('src');
        try { probe.load(); } catch (e) {}
      }
      probe.addEventListener('loadedmetadata', function () { finish(true); });
      probe.addEventListener('error', function () { finish(false); });
      probe.src = VIDEO_SRC;
      probe.load();
      setTimeout(function () {
        if (!settled) finish(probe.readyState >= 1);
      }, 2000);
    }

    /* Always mount the SVG shell immediately — never leave an empty stage. */
    showEngineVisual();
    probeBrandedAsset();

    playBtn.addEventListener('click', function () {
      if (mediaReady && VIDEO_SRC) {
        mountPlayback();
        return;
      }
      cover.hidden = true;
      showEngineVisual();
    });
  }

  function mountFooter() {
    if (window.EXECUTIA_BRAND && typeof window.EXECUTIA_BRAND.mountFooter === 'function') {
      window.EXECUTIA_BRAND.mountFooter();
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    mountHeaderMenu();
    mountProtocolVideo();
    mountFooter();
  });
})();
