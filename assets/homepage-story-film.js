(function () {
  'use strict';

  var STORY_TOTAL_MS = 10000;

  var FRAMES = [
    { start: 0, end: 0.2, text: 'Everything looks under control.' },
    { start: 0.2, end: 0.4, text: 'Execution failures stay invisible.' },
    { start: 0.4, end: 0.6, text: 'Invisible execution becomes visible loss.' },
    { start: 0.6, end: 0.8, text: 'EXECUTIA makes execution visible before failure.' },
    { start: 0.8, end: 1, text: 'How much is invisible execution costing your organization?' },
  ];

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function segment(progress, start, end) {
    return clamp01((progress - start) / (end - start));
  }

  function enter(progress, start, span) {
    return segment(progress, start, start + (span || 0.12));
  }

  function frameAt(progress) {
    for (var i = 0; i < FRAMES.length; i += 1) {
      if (progress < FRAMES[i].end || i === FRAMES.length - 1) return i;
    }
    return FRAMES.length - 1;
  }

  var STORY_HTML =
    '<div class="sf-continuous" data-story-root>' +
    '<div class="sf-org" aria-hidden="true">Organization</div>' +
    '<div class="sf-layer sf-layer-healthy">' +
    '<div class="sf-pill sf-pill-green" data-i="0"><span>Project</span></div>' +
    '<div class="sf-pill sf-pill-green" data-i="1"><span>Budget</span></div>' +
    '<div class="sf-pill sf-pill-green" data-i="2"><span>Timeline</span></div>' +
    '</div>' +
    '<div class="sf-surface" aria-hidden="true"></div>' +
    '<div class="sf-layer sf-layer-gaps">' +
    '<div class="sf-pill sf-pill-gap" data-i="0"><span>Missing approval</span></div>' +
    '<div class="sf-pill sf-pill-gap" data-i="1"><span>Unknown owner</span></div>' +
    '<div class="sf-pill sf-pill-gap" data-i="2"><span>Broken handoff</span></div>' +
    '</div>' +
    '<div class="sf-layer sf-layer-effects">' +
    '<div class="sf-pill sf-pill-loss" data-i="0"><span>Delay</span></div>' +
    '<div class="sf-pill sf-pill-loss" data-i="1"><span>Rework</span></div>' +
    '<div class="sf-pill sf-pill-loss" data-i="2"><span>Cost</span></div>' +
    '<div class="sf-pill sf-pill-loss" data-i="3"><span>Risk</span></div>' +
    '</div>' +
    '<div class="sf-layer sf-layer-chain">' +
    '<div class="sf-chain-vertical">' +
    ['Mission', 'Decision', 'Execution', 'Evidence', 'Outcome']
      .map(function (node, i) {
        return (
          (i > 0 ? '<span class="sf-chain-down" data-i="' + i + '" aria-hidden="true">↓</span>' : '') +
          '<div class="sf-chain-step" data-i="' + i + '"><span>' + node + '</span></div>'
        );
      })
      .join('') +
    '</div></div>' +
    '<p class="sf-narrative"></p>' +
    '</div>';

  function applyProgress(root, progress) {
    var org = root.querySelector('.sf-org');
    var healthy = root.querySelector('.sf-layer-healthy');
    var surface = root.querySelector('.sf-surface');
    var gaps = root.querySelector('.sf-layer-gaps');
    var effects = root.querySelector('.sf-layer-effects');
    var chain = root.querySelector('.sf-layer-chain');
    var narrative = root.querySelector('.sf-narrative');
    var frameIndex = frameAt(progress);
    var frame = FRAMES[frameIndex];
    var frameLocal = segment(progress, frame.start, frame.end);
    var frameBlend = segment(progress, frame.start, frame.start + 0.04);

    if (narrative) {
      narrative.textContent = frame.text;
      narrative.style.opacity = String(0.35 + frameBlend * 0.65);
      narrative.classList.toggle('sf-narrative-question', frameIndex === 4);
    }

    var orgOpacity = frameIndex === 4 ? Math.max(0, 1 - frameLocal * 2.5) : 1;
    if (org) org.style.opacity = String(orgOpacity);

    var healthyP =
      frameIndex === 0
        ? enter(progress, 0.02, 0.14)
        : frameIndex === 1
          ? 1
          : frameIndex === 2
            ? Math.max(0, 1 - frameLocal * 2.2)
            : 0;

    if (healthy) {
      healthy.style.opacity = String(healthyP);
      healthy.querySelectorAll('.sf-pill-green').forEach(function (pill, i) {
        var p = frameIndex === 0 ? enter(progress, 0.04 + i * 0.05, 0.1) : healthyP;
        pill.style.opacity = String(p);
        pill.style.transform = 'translateY(' + (1 - p) * 12 + 'px)';
      });
    }

    var surfaceP = frameIndex === 1 ? enter(frameLocal, 0.05, 0.2) : frameIndex === 2 ? 1 - frameLocal : 0;
    if (surface) surface.style.opacity = String(Math.max(0, surfaceP));

    var gapsP =
      frameIndex === 1
        ? enter(frameLocal, 0.08, 0.22)
        : frameIndex === 2
          ? Math.max(0, 1 - frameLocal * 2)
          : 0;

    if (gaps) {
      gaps.style.opacity = String(gapsP);
      gaps.querySelectorAll('.sf-pill-gap').forEach(function (pill, i) {
        var p = frameIndex === 1 ? enter(gapsP, 0.1 + i * 0.2, 0.25) : gapsP;
        pill.style.opacity = String(p);
        pill.style.transform = 'translateY(' + (1 - p) * 10 + 'px)';
      });
    }

    var effectsP =
      frameIndex === 2
        ? enter(frameLocal, 0.06, 0.18)
        : frameIndex === 3
          ? Math.max(0, 1 - frameLocal * 2.5)
          : 0;

    if (effects) {
      effects.style.opacity = String(effectsP);
      effects.querySelectorAll('.sf-pill-loss').forEach(function (pill, i) {
        var p = frameIndex === 2 ? enter(effectsP, 0.08 + i * 0.16, 0.2) : effectsP;
        pill.style.opacity = String(p);
        pill.style.transform = 'scale(' + (0.9 + p * 0.1) + ')';
      });
    }

    var chainP = frameIndex === 3 ? enter(frameLocal, 0.08, 0.2) : frameIndex === 4 ? Math.max(0, 1 - frameLocal * 2.5) : 0;

    if (chain) {
      chain.style.opacity = String(chainP);
      chain.querySelectorAll('.sf-chain-step, .sf-chain-down').forEach(function (el) {
        var i = Number(el.getAttribute('data-i') || 0);
        var p = frameIndex === 3 ? enter(chainP, 0.06 + i * 0.14, 0.18) : chainP;
        el.style.opacity = String(p);
        el.style.transform = 'translateY(' + (1 - p) * 8 + 'px)';
      });
    }
  }

  function scrollToCalculator() {
    var target = document.getElementById('execution-value');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function setPlayIcon(playBtn, playing) {
    playBtn.innerHTML = playing
      ? '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="2" y="1.5" width="3" height="11" rx="0.75" fill="currentColor"/><rect x="9" y="1.5" width="3" height="11" rx="0.75" fill="currentColor"/></svg>'
      : '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.8 11.5 7 3 12.2V1.8Z" fill="currentColor"/></svg>';
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }

  function mount(player) {
    var stage = player.querySelector('.hp-film-stage');
    var progressFill = player.querySelector('.hp-film-progress-fill');
    var playBtn = player.querySelector('[data-action="play"]');
    var replayBtn = player.querySelector('[data-action="replay"]');

    stage.insertAdjacentHTML('beforeend', STORY_HTML);
    var root = stage.querySelector('[data-story-root]');

    var playing = true;
    var hoverPaused = false;
    var finished = false;
    var scrolled = false;
    var elapsedMs = 0;
    var rafId = null;
    var lastTick = null;

    function effectivePlaying() {
      return playing && !hoverPaused && !finished;
    }

    function updateControls() {
      setPlayIcon(playBtn, effectivePlaying());
      playBtn.hidden = finished;
      if (replayBtn) replayBtn.hidden = !finished;
    }

    function render() {
      var progress = Math.min(1, elapsedMs / STORY_TOTAL_MS);
      progressFill.style.width = progress * 100 + '%';
      applyProgress(root, finished ? 1 : progress);
      updateControls();
    }

    function tick(now) {
      if (!effectivePlaying()) return;
      if (lastTick === null) lastTick = now;
      elapsedMs += now - lastTick;
      lastTick = now;

      if (elapsedMs >= STORY_TOTAL_MS * 0.88 && !scrolled) {
        scrolled = true;
        scrollToCalculator();
      }

      if (elapsedMs >= STORY_TOTAL_MS) {
        elapsedMs = STORY_TOTAL_MS;
        finished = true;
        playing = false;
      }
      render();
      if (effectivePlaying()) rafId = requestAnimationFrame(tick);
    }

    function startLoop() {
      lastTick = null;
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (effectivePlaying()) rafId = requestAnimationFrame(tick);
    }

    function restart() {
      elapsedMs = 0;
      finished = false;
      playing = true;
      scrolled = false;
      startLoop();
    }

    playBtn.addEventListener('click', function () {
      if (finished) return;
      playing = !playing;
      if (playing) startLoop();
      else render();
    });

    if (replayBtn) replayBtn.addEventListener('click', restart);

    player.addEventListener('mouseenter', function () {
      hoverPaused = true;
      render();
    });
    player.addEventListener('mouseleave', function () {
      hoverPaused = false;
      if (effectivePlaying()) startLoop();
      else render();
    });

    setPlayIcon(playBtn, true);
    if (replayBtn) replayBtn.hidden = true;
    render();
    startLoop();
  }

  document.addEventListener('DOMContentLoaded', function () {
    var player = document.getElementById('story-film-player');
    if (player) mount(player);
  });
})();
