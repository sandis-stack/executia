(function () {
  'use strict';

  var STORY_TOTAL_MS = 9000;

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function segment(progress, start, end) {
    return clamp01((progress - start) / (end - start));
  }

  function enter(progress, start, span) {
    return segment(progress, start, start + (span || 0.12));
  }

  var STORY_HTML =
    '<div class="sf-continuous" data-story-root>' +
    '<div class="sf-layer sf-layer-healthy">' +
    '<div class="sf-pill sf-pill-green" data-i="0"><span>Project</span><strong>Green</strong></div>' +
    '<div class="sf-pill sf-pill-green" data-i="1"><span>Budget</span><strong>Green</strong></div>' +
    '<div class="sf-pill sf-pill-green" data-i="2"><span>Timeline</span><strong>Green</strong></div>' +
    '</div>' +
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
    '<div class="sf-chain-track">' +
    ['Mission', 'Decision', 'Execution', 'Evidence', 'Outcome']
      .map(function (node, i) {
        return (
          (i > 0 ? '<span class="sf-chain-arrow" data-i="' + i + '" aria-hidden="true">→</span>' : '') +
          '<div class="sf-chain-step" data-i="' + i + '"><span>' + node + '</span></div>'
        );
      })
      .join('') +
    '</div></div>' +
    '<p class="sf-payoff">Execution becomes visible before failure.</p>' +
    '</div>';

  function applyProgress(root, progress) {
    var healthy = root.querySelector('.sf-layer-healthy');
    var gaps = root.querySelector('.sf-layer-gaps');
    var effects = root.querySelector('.sf-layer-effects');
    var chain = root.querySelector('.sf-layer-chain');
    var payoff = root.querySelector('.sf-payoff');

    var healthyOpacity = 1 - segment(progress, 0.52, 0.68) * 0.75;
    if (healthy) healthy.style.opacity = String(healthyOpacity);

    healthy &&
      healthy.querySelectorAll('.sf-pill-green').forEach(function (pill, i) {
        var p = enter(progress, 0.02 + i * 0.04, 0.1);
        pill.style.opacity = String(p * healthyOpacity);
        pill.style.transform = 'translateY(' + (1 - p) * 14 + 'px)';
      });

    var gapsP = segment(progress, 0.22, 0.48);
    if (gaps) {
      gaps.style.opacity = String(gapsP);
      gaps.querySelectorAll('.sf-pill-gap').forEach(function (pill, i) {
        var p = enter(gapsP, 0.08 + i * 0.22, 0.28);
        pill.style.opacity = String(p);
        pill.style.transform = 'translateX(' + (1 - p) * -16 + 'px)';
      });
    }

    var effectsP = segment(progress, 0.48, 0.72);
    if (effects) {
      effects.style.opacity = String(effectsP);
      effects.querySelectorAll('.sf-pill-loss').forEach(function (pill, i) {
        var p = enter(effectsP, 0.06 + i * 0.18, 0.22);
        pill.style.opacity = String(p);
        pill.style.transform = 'scale(' + (0.88 + p * 0.12) + ')';
      });
    }

    var chainP = segment(progress, 0.62, 0.88);
    if (gaps) gaps.style.opacity = String(Math.max(0, gapsP * (1 - chainP * 0.85)));
    if (effects) effects.style.opacity = String(Math.max(0, effectsP * (1 - chainP * 0.9)));
    if (healthy) healthy.style.opacity = String(Math.max(0.12, healthyOpacity * (1 - chainP * 0.5)));

    if (chain) {
      chain.style.opacity = String(chainP);
      chain.querySelectorAll('.sf-chain-step, .sf-chain-arrow').forEach(function (el) {
        var i = Number(el.getAttribute('data-i') || 0);
        var p = enter(chainP, 0.05 + i * 0.16, 0.2);
        el.style.opacity = String(p);
        el.style.transform = el.classList.contains('sf-chain-arrow')
          ? 'translateX(' + (1 - p) * -8 + 'px)'
          : 'translateY(' + (1 - p) * 10 + 'px)';
      });
    }

    var payoffP = segment(progress, 0.84, 0.98);
    if (payoff) {
      payoff.style.opacity = String(payoffP);
      payoff.style.transform = 'translateY(' + (1 - payoffP) * 6 + 'px)';
    }
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
