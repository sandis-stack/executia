(function () {
  'use strict';

  var STORY_TOTAL_MS = 10000;

  var BEATS = [
    { start: 0, end: 0.2, text: 'Projects are delayed.' },
    { start: 0.2, end: 0.4, text: 'Decisions take too long.' },
    { start: 0.4, end: 0.5, text: 'Work is repeated.' },
    { start: 0.5, end: 0.6, text: 'No one owns the outcome.' },
    { start: 0.6, end: 0.667, text: 'Different symptoms.' },
    { start: 0.667, end: 0.733, text: 'One cause.' },
    { start: 0.733, end: 0.8, text: 'Invisible execution.' },
    { start: 0.8, end: 0.9, text: 'EXECUTIA makes execution visible before failure.' },
    { start: 0.9, end: 1, text: 'What is invisible execution costing your organization?' },
  ];

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function segment(progress, start, end) {
    return clamp01((progress - start) / (end - start));
  }

  function beatAt(progress) {
    for (var i = 0; i < BEATS.length; i += 1) {
      if (progress < BEATS[i].end || i === BEATS.length - 1) return i;
    }
    return BEATS.length - 1;
  }

  var STORY_HTML =
    '<div class="sf-continuous" data-story-root>' + '<p class="sf-narrative"></p>' + '</div>';

  function applyProgress(root, progress) {
    var narrative = root.querySelector('.sf-narrative');
    var beatIndex = beatAt(progress);
    var beat = BEATS[beatIndex];
    var beatBlend = segment(progress, beat.start, beat.start + 0.035);

    if (narrative) {
      narrative.textContent = beat.text;
      narrative.style.opacity = String(0.35 + beatBlend * 0.65);
      narrative.classList.toggle('sf-narrative-solution', beatIndex >= 7);
      narrative.classList.toggle('sf-narrative-question', beatIndex === 8);
    }

    root.classList.toggle('sf-bg-soft', beatIndex >= 4 && beatIndex <= 7);
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
