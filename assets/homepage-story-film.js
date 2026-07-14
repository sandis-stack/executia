(function () {
  'use strict';

  var STORY_TOTAL_MS = 10000;

  var BEATS = [
    { start: 0, end: 0.2, text: 'Projects are delayed.', visual: 'delay' },
    { start: 0.2, end: 0.4, text: 'Decisions take too long.', visual: 'decisions' },
    { start: 0.4, end: 0.5, text: 'Work is repeated.', visual: 'repeat' },
    { start: 0.5, end: 0.6, text: 'No one owns the outcome.', visual: 'owner' },
    { start: 0.6, end: 0.667, text: 'Different symptoms.', visual: 'converge' },
    { start: 0.667, end: 0.733, text: 'One cause.', visual: 'converge' },
    { start: 0.733, end: 0.8, text: 'Invisible execution.', visual: 'invisible' },
    { start: 0.8, end: 0.9, text: 'EXECUTIA makes execution visible before failure.', visual: 'executia' },
    { start: 0.9, end: 1, text: 'What is invisible execution costing your organization?', visual: 'question' },
  ];

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function segment(progress, start, end) {
    return clamp01((progress - start) / (end - start));
  }

  function enter(progress, start, span) {
    return segment(progress, start, start + (span || 0.1));
  }

  function beatAt(progress) {
    for (var i = 0; i < BEATS.length; i += 1) {
      if (progress < BEATS[i].end || i === BEATS.length - 1) return i;
    }
    return BEATS.length - 1;
  }

  var STORY_HTML =
    '<div class="sf-continuous" data-story-root>' +
    '<div class="sf-visual" aria-hidden="true">' +
    '<div class="sf-v sf-v-delay" data-visual="delay">' +
    '<div class="sf-delay-track"><span class="sf-delay-fill"></span><span class="sf-delay-stop"></span></div>' +
    '</div>' +
    '<div class="sf-v sf-v-decisions" data-visual="decisions">' +
    '<div class="sf-decision-line"><span class="sf-dot"></span><span class="sf-line"></span><span class="sf-dot"></span></div>' +
    '</div>' +
    '<div class="sf-v sf-v-repeat" data-visual="repeat">' +
    '<div class="sf-repeat-ring"></div>' +
    '</div>' +
    '<div class="sf-v sf-v-owner" data-visual="owner">' +
    '<div class="sf-owner-ring"></div>' +
    '</div>' +
    '<div class="sf-v sf-v-converge" data-visual="converge">' +
    '<div class="sf-converge-lines"><span></span><span></span><span></span></div>' +
    '<div class="sf-converge-core"></div>' +
    '</div>' +
    '<div class="sf-v sf-v-invisible" data-visual="invisible">' +
    '<div class="sf-invisible-shape"></div>' +
    '</div>' +
    '<div class="sf-v sf-v-executia" data-visual="executia">' +
    '<div class="sf-visible-path"><span></span><span></span><span></span></div>' +
    '</div>' +
    '<div class="sf-v sf-v-question" data-visual="question">' +
    '<div class="sf-question-arrow">↓</div>' +
    '</div>' +
    '</div>' +
    '<p class="sf-narrative"></p>' +
    '</div>';

  function applyProgress(root, progress) {
    var narrative = root.querySelector('.sf-narrative');
    var visuals = root.querySelectorAll('.sf-v');
    var beatIndex = beatAt(progress);
    var beat = BEATS[beatIndex];
    var beatLocal = segment(progress, beat.start, beat.end);
    var beatBlend = segment(progress, beat.start, beat.start + 0.035);

    if (narrative) {
      narrative.textContent = beat.text;
      narrative.style.opacity = String(0.4 + beatBlend * 0.6);
      narrative.classList.toggle('sf-narrative-solution', beatIndex >= 7);
      narrative.classList.toggle('sf-narrative-question', beatIndex === 8);
    }

    visuals.forEach(function (layer) {
      var key = layer.getAttribute('data-visual');
      var active = key === beat.visual;
      var prevBeat = beatIndex > 0 ? BEATS[beatIndex - 1] : null;
      var carry = prevBeat && prevBeat.visual === key && beatLocal < 0.12;
      var opacity = active ? 0.25 + beatBlend * 0.75 : carry ? Math.max(0, 0.35 * (1 - beatLocal * 8)) : 0;
      layer.style.opacity = String(opacity);

      if (key === 'delay' && active) {
        var fill = layer.querySelector('.sf-delay-fill');
        var stop = layer.querySelector('.sf-delay-stop');
        var p = enter(beatLocal, 0.05, 0.35);
        if (fill) fill.style.width = 38 + p * 8 + '%';
        if (stop) stop.style.opacity = String(0.5 + p * 0.5);
      }

      if (key === 'decisions' && active) {
        var line = layer.querySelector('.sf-line');
        if (line) line.style.transform = 'scaleX(' + (0.35 + beatLocal * 0.45) + ')';
      }

      if (key === 'repeat' && active) {
        var ring = layer.querySelector('.sf-repeat-ring');
        if (ring) ring.style.transform = 'rotate(' + beatLocal * 180 + 'deg)';
      }

      if (key === 'converge' && active) {
        var core = layer.querySelector('.sf-converge-core');
        var isCause = beat.text === 'One cause.';
        if (core) core.style.opacity = String(isCause ? 0.75 + beatLocal * 0.25 : enter(beatLocal, 0.35, 0.25));
      }

      if (key === 'invisible' && active) {
        var shape = layer.querySelector('.sf-invisible-shape');
        if (shape) shape.style.opacity = String(0.35 + beatLocal * 0.65);
      }

      if (key === 'executia' && active) {
        var path = layer.querySelector('.sf-visible-path');
        if (path) path.style.opacity = String(enter(beatLocal, 0.1, 0.3));
      }

      if (key === 'question' && active) {
        var arrow = layer.querySelector('.sf-question-arrow');
        if (arrow) arrow.style.opacity = String(enter(beatLocal, 0.05, 0.2));
      }
    });
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
