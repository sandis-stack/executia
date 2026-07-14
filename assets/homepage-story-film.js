(function () {
  'use strict';

  /** LOCK CANDIDATE — ENTRY story film v1 (14s CEO narrative) */

  var STORY_SCENES = [
    { id: 'healthy', durationMs: 3000 },
    { id: 'hidden', durationMs: 3000 },
    { id: 'loss', durationMs: 4000 },
    { id: 'visible', durationMs: 4000 },
  ];

  var STORY_TOTAL_MS = STORY_SCENES.reduce(function (sum, s) {
    return sum + s.durationMs;
  }, 0);
  var STORY_FADE_MS = 280;

  var GAP_SIGNALS = [
    'Dependencies',
    'Missing approvals',
    'Unknown ownership',
    'Invisible handoffs',
  ];

  var LOSS_SIGNALS = ['Delay', 'Rework', 'Cost', 'Risk'];

  var CHAIN_NODES = ['Mission', 'Decision', 'Project', 'Task', 'Evidence', 'Outcome'];

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function segment(progress, start, end) {
    return clamp01((progress - start) / (end - start));
  }

  function motionEnter(progress, delay, span) {
    return segment(progress, delay, delay + (span || 0.2));
  }

  var SCENE_HTML = {
    healthy:
      '<div class="hp-film-scene sf-scene-healthy" data-scene="healthy">' +
      '<p class="sf-idea">Everything looks healthy.</p>' +
      '<div class="sf-green-row" aria-hidden="true">' +
      '<span class="sf-green-bar" data-anim="0"></span>' +
      '<span class="sf-green-bar" data-anim="1"></span>' +
      '<span class="sf-green-bar" data-anim="2"></span>' +
      '</div>' +
      '<p class="sf-line sf-line-sub" data-anim="sub">Under control.</p>' +
      '</div>',

    hidden:
      '<div class="hp-film-scene sf-scene-hidden" data-scene="hidden">' +
      '<p class="sf-idea">Hidden execution appears.</p>' +
      '<p class="sf-line sf-gap-line" data-anim="gap"></p>' +
      '</div>',

    loss:
      '<div class="hp-film-scene sf-scene-loss" data-scene="loss">' +
      '<p class="sf-idea">Visible losses emerge.</p>' +
      '<div class="sf-loss-row">' +
      LOSS_SIGNALS.map(function (label, i) {
        return '<span class="sf-loss-signal" data-anim="' + i + '">' + label + '</span>';
      }).join('') +
      '</div></div>',

    visible:
      '<div class="hp-film-scene sf-scene-visible" data-scene="visible">' +
      '<p class="sf-idea sf-idea-intro" data-anim="intro">EXECUTIA reveals execution.</p>' +
      '<div class="sf-visible-chain" data-anim="chain"></div>' +
      '<p class="sf-line sf-payoff" data-anim="payoff">Execution becomes visible before failure.</p>' +
      '</div>',
  };

  function sceneStarts() {
    var starts = [];
    var cursor = 0;
    STORY_SCENES.forEach(function (scene) {
      starts.push(cursor);
      cursor += scene.durationMs;
    });
    return starts;
  }

  function sceneOpacity(index, elapsedMs, starts, fadeMs) {
    fadeMs = fadeMs || STORY_FADE_MS;
    var start = starts[index];
    var end = start + STORY_SCENES[index].durationMs;
    if (elapsedMs <= start - fadeMs) return 0;
    if (elapsedMs < start) return (elapsedMs - (start - fadeMs)) / fadeMs;
    if (elapsedMs < end - fadeMs) return 1;
    if (elapsedMs < end) return 1 - (elapsedMs - (end - fadeMs)) / fadeMs;
    return 0;
  }

  function sceneLocalProgress(index, elapsedMs, starts) {
    var start = starts[index];
    var duration = STORY_SCENES[index].durationMs;
    if (elapsedMs < start) return 0;
    if (elapsedMs >= start + duration) return 1;
    return (elapsedMs - start) / duration;
  }

  function buildChainMarkup() {
    return CHAIN_NODES.map(function (node, i) {
      return (
        (i > 0 ? '<span class="sf-chain-link" data-anim="' + i + '" aria-hidden="true"></span>' : '') +
        '<div class="sf-chain-node" data-anim="' + i + '"><span>' + node + '</span></div>'
      );
    }).join('');
  }

  function applySceneMotion(sceneEl, sceneId, progress) {
    if (!sceneEl) return;

    if (sceneId === 'healthy') {
      sceneEl.querySelectorAll('.sf-green-bar').forEach(function (bar) {
        var i = Number(bar.getAttribute('data-anim') || 0);
        var p = motionEnter(progress, 0.12 + i * 0.12, 0.18);
        bar.style.opacity = String(p);
        bar.style.transform = 'scaleX(' + (0.2 + p * 0.8) + ')';
      });
      var sub = sceneEl.querySelector('[data-anim="sub"]');
      if (sub) {
        var subP = segment(progress, 0.58, 0.82);
        sub.style.opacity = String(subP);
      }
      return;
    }

    if (sceneId === 'hidden') {
      var gapLine = sceneEl.querySelector('.sf-gap-line');
      if (gapLine) {
        if (progress < 0.18) {
          gapLine.style.opacity = '0';
          gapLine.textContent = '';
          return;
        }
        var slot = Math.min(
          GAP_SIGNALS.length - 1,
          Math.floor((progress - 0.18) / 0.2),
        );
        var local = segment(progress, 0.18 + slot * 0.2, 0.34 + slot * 0.2);
        gapLine.textContent = GAP_SIGNALS[slot];
        gapLine.style.opacity = String(local);
      }
      return;
    }

    if (sceneId === 'loss') {
      sceneEl.querySelectorAll('.sf-loss-signal').forEach(function (signal, i) {
        var start = 0.14 + i * 0.16;
        var p = motionEnter(progress, start, 0.18);
        signal.style.opacity = String(p);
        signal.style.transform = 'translateY(' + (1 - p) * 12 + 'px)';
      });
      return;
    }

    if (sceneId === 'visible') {
      var intro = sceneEl.querySelector('[data-anim="intro"]');
      var chain = sceneEl.querySelector('[data-anim="chain"]');
      var payoff = sceneEl.querySelector('[data-anim="payoff"]');

      if (!chain.dataset.built) {
        chain.innerHTML = buildChainMarkup();
        chain.dataset.built = '1';
      }

      var payoffP = segment(progress, 0.72, 0.92);
      if (intro) intro.style.opacity = String(1 - payoffP * 0.85);
      if (chain) chain.style.opacity = String(1 - payoffP * 0.9);

      if (payoffP < 0.05) {
        if (chain) {
          chain.querySelectorAll('.sf-chain-node, .sf-chain-link').forEach(function (node) {
            var i = Number(node.getAttribute('data-anim') || 0);
            var p = motionEnter(progress, 0.08 + i * 0.09, 0.14);
            node.style.opacity = String(p);
            if (node.classList.contains('sf-chain-link')) {
              node.style.transform = 'scaleY(' + p + ')';
            } else {
              node.style.transform = 'translateY(' + (1 - p) * 10 + 'px)';
            }
          });
        }
        if (payoff) payoff.style.opacity = '0';
      } else if (payoff) {
        payoff.style.opacity = String(payoffP);
        payoff.style.transform = 'translateY(' + (1 - payoffP) * 8 + 'px)';
      }
    }
  }

  function setPlayIcon(playBtn, playing) {
    playBtn.innerHTML = playing
      ? '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="2" y="1.5" width="3" height="11" rx="0.75" fill="currentColor"/><rect x="9" y="1.5" width="3" height="11" rx="0.75" fill="currentColor"/></svg>'
      : '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.8 11.5 7 3 12.2V1.8Z" fill="currentColor"/></svg>';
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }

  function mount(player) {
    var starts = sceneStarts();
    var stage = player.querySelector('.hp-film-stage');
    var progressFill = player.querySelector('.hp-film-progress-fill');
    var playBtn = player.querySelector('[data-action="play"]');
    var replayBtn = player.querySelector('[data-action="replay"]');

    STORY_SCENES.forEach(function (scene) {
      stage.insertAdjacentHTML('beforeend', SCENE_HTML[scene.id]);
    });

    var sceneEls = stage.querySelectorAll('.hp-film-scene');
    sceneEls.forEach(function (el) {
      el.style.opacity = '0';
    });

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
      var overall = Math.min(1, elapsedMs / STORY_TOTAL_MS);
      progressFill.style.width = overall * 100 + '%';

      if (finished) {
        sceneEls.forEach(function (el, i) {
          el.style.opacity = i === STORY_SCENES.length - 1 ? '1' : '0';
        });
        applySceneMotion(sceneEls[STORY_SCENES.length - 1], 'visible', 1);
        updateControls();
        return;
      }

      sceneEls.forEach(function (el, i) {
        var opacity = sceneOpacity(i, elapsedMs, starts);
        el.style.opacity = opacity < 0.01 ? '0' : String(opacity);
        el.style.pointerEvents = opacity < 0.2 ? 'none' : 'auto';
        if (opacity > 0.05) {
          applySceneMotion(el, STORY_SCENES[i].id, sceneLocalProgress(i, elapsedMs, starts));
        }
      });
      updateControls();
    }

    function tick(now) {
      if (!effectivePlaying()) return;
      if (lastTick === null) lastTick = now;
      var delta = now - lastTick;
      lastTick = now;
      elapsedMs += delta;
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

    if (replayBtn) {
      replayBtn.addEventListener('click', restart);
    }

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
