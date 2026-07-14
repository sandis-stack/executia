(function () {
  'use strict';

  var STORY_SCENES = [
    { id: 'healthy', durationMs: 3500 },
    { id: 'gaps', durationMs: 3500 },
    { id: 'loss', durationMs: 3500 },
    { id: 'visible', durationMs: 3500 },
  ];

  var STORY_TOTAL_MS = STORY_SCENES.reduce(function (sum, s) {
    return sum + s.durationMs;
  }, 0);
  var STORY_FADE_MS = 320;

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function segment(progress, start, end) {
    return clamp01((progress - start) / (end - start));
  }

  var SCENE_HTML = {
    healthy:
      '<div class="hp-film-scene sf-scene-healthy" data-scene="healthy">' +
      '<p class="sf-idea">Execution looks healthy</p>' +
      '<div class="sf-healthy-row">' +
      ['Project', 'Budget', 'Tasks']
        .map(function (label, i) {
          return (
            '<div class="sf-status-card" data-anim="' +
            i +
            '"><span class="sf-status-label">' +
            label +
            '</span><span class="sf-status-value">Green</span><span class="sf-status-dot" aria-hidden="true"></span></div>'
          );
        })
        .join('') +
      '</div></div>',

    gaps:
      '<div class="hp-film-scene sf-scene-gaps" data-scene="gaps">' +
      '<p class="sf-idea">Hidden gaps appear</p>' +
      '<div class="sf-gap-stage">' +
      '<div class="sf-surface-card" data-anim="surface"><span>Surface</span><strong>All green</strong></div>' +
      '<svg class="sf-connector" viewBox="0 0 320 72" aria-hidden="true">' +
      '<line class="sf-connector-line" x1="160" y1="8" x2="160" y2="64" />' +
      '</svg>' +
      '<ul class="sf-gap-list">' +
      ['Approval waiting', 'Owner missing', 'Evidence gap']
        .map(function (label, i) {
          return (
            '<li class="sf-gap-item" data-anim="' +
            i +
            '"><span class="sf-risk-dot" aria-hidden="true"></span><span>' +
            label +
            '</span></li>'
          );
        })
        .join('') +
      '</ul></div></div>',

    loss:
      '<div class="hp-film-scene sf-scene-loss" data-scene="loss">' +
      '<p class="sf-idea">Value is lost</p>' +
      '<div class="sf-loss-grid">' +
      [
        { label: 'Time', level: 0.82 },
        { label: 'Cost', level: 0.74 },
        { label: 'Trust', level: 0.68 },
        { label: 'Delivery', level: 0.79 },
      ]
        .map(function (item, i) {
          return (
            '<div class="sf-loss-card" data-anim="' +
            i +
            '"><span class="sf-loss-label">' +
            item.label +
            '</span><div class="sf-leak-track"><div class="sf-leak-fill" data-level="' +
            item.level +
            '"></div></div></div>'
          );
        })
        .join('') +
      '</div>' +
      '<p class="sf-loss-caption">Leakage compounds before anyone sees it.</p></div>',

    visible:
      '<div class="hp-film-scene sf-scene-visible" data-scene="visible">' +
      '<p class="sf-idea">EXECUTIA makes execution visible</p>' +
      '<div class="sf-visible-chain">' +
      ['Mission', 'Decision', 'Project', 'Evidence', 'Outcome']
        .map(function (node, i) {
          return (
            (i > 0 ? '<span class="sf-chain-link" data-anim="' + i + '" aria-hidden="true"></span>' : '') +
            '<div class="sf-chain-node" data-anim="' +
            i +
            '"><span>' +
            node +
            '</span></div>'
          );
        })
        .join('') +
      '</div></div>',
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

  function activeSceneIndex(elapsedMs, starts) {
    for (var i = 0; i < starts.length; i += 1) {
      var end = starts[i] + STORY_SCENES[i].durationMs;
      if (elapsedMs >= starts[i] && elapsedMs < end) return i;
    }
    return STORY_SCENES.length - 1;
  }

  function motionEnter(progress, delay, span) {
    return segment(progress, delay, delay + (span || 0.22));
  }

  function applySceneMotion(sceneEl, sceneId, progress) {
    if (!sceneEl) return;

    if (sceneId === 'healthy') {
      sceneEl.querySelectorAll('.sf-status-card').forEach(function (card) {
        var i = Number(card.getAttribute('data-anim') || 0);
        var p = motionEnter(progress, 0.08 + i * 0.1);
        card.style.opacity = String(p);
        card.style.transform = 'translateY(' + (1 - p) * 18 + 'px) scale(' + (0.94 + p * 0.06) + ')';
      });
      return;
    }

    if (sceneId === 'gaps') {
      var surface = sceneEl.querySelector('.sf-surface-card');
      var surfaceP = motionEnter(progress, 0, 0.18);
      if (surface) {
        surface.style.opacity = String(surfaceP);
        surface.style.transform = 'scale(' + (0.96 + surfaceP * 0.04) + ')';
      }
      var line = sceneEl.querySelector('.sf-connector-line');
      var lineP = segment(progress, 0.2, 0.55);
      if (line) {
        line.style.strokeDashoffset = String(56 * (1 - lineP));
      }
      sceneEl.querySelectorAll('.sf-gap-item').forEach(function (item) {
        var i = Number(item.getAttribute('data-anim') || 0);
        var p = motionEnter(progress, 0.32 + i * 0.12);
        item.style.opacity = String(p);
        item.style.transform = 'translateX(' + (1 - p) * -20 + 'px)';
      });
      return;
    }

    if (sceneId === 'loss') {
      sceneEl.querySelectorAll('.sf-loss-card').forEach(function (card) {
        var i = Number(card.getAttribute('data-anim') || 0);
        var p = motionEnter(progress, 0.1 + i * 0.1);
        card.style.opacity = String(p);
        card.style.transform = 'translateY(' + (1 - p) * 14 + 'px)';
        var fill = card.querySelector('.sf-leak-fill');
        if (fill) {
          var level = Number(fill.getAttribute('data-level') || 0.7);
          fill.style.transform = 'scaleX(' + p * level + ')';
        }
      });
      var caption = sceneEl.querySelector('.sf-loss-caption');
      if (caption) {
        var cP = segment(progress, 0.62, 0.88);
        caption.style.opacity = String(cP);
      }
      return;
    }

    if (sceneId === 'visible') {
      sceneEl.querySelectorAll('.sf-chain-node, .sf-chain-link').forEach(function (node) {
        var i = Number(node.getAttribute('data-anim') || 0);
        var p = motionEnter(progress, 0.06 + i * 0.1);
        node.style.opacity = String(p);
        if (node.classList.contains('sf-chain-link')) {
          node.style.transform = 'scaleY(' + p + ')';
        } else {
          node.style.transform = 'translateY(' + (1 - p) * 16 + 'px)';
        }
      });
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
