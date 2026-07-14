(function () {
  'use strict';

  var STORY_TOTAL_MS = 14000;
  var SCROLL_AT_MS = 11000;

  var BEATS = [
    { start: 0, end: 2500, visual: 'timeline', headline: 'Projects slip.' },
    { start: 2500, end: 5000, visual: 'hierarchy', headline: 'Decisions stall.' },
    { start: 5000, end: 7500, visual: 'owner', headline: 'Nobody owns the outcome.' },
    { start: 7500, end: 8333, visual: 'converge', headline: 'Different symptoms.' },
    { start: 8333, end: 9167, visual: 'converge', headline: 'One cause.' },
    { start: 9167, end: 10000, visual: 'converge', headline: 'Invisible execution.' },
    { start: 10000, end: 11000, visual: 'executia', headline: 'EXECUTIA reveals execution before failure.' },
    {
      start: 11000,
      end: 14000,
      visual: 'question',
      headline: 'How much is invisible execution costing your organization?',
    },
  ];

  var STORY_HTML =
    '<div class="sf-root" data-story-root>' +
    '<canvas class="sf-network" aria-hidden="true"></canvas>' +
    '<div class="sf-content">' +
    '<p class="sf-headline"></p>' +
    '<div class="sf-visual-stage">' +
    '<div class="sf-v sf-v-timeline" data-visual="timeline">' +
    '<div class="sf-timeline">' +
    '<div class="sf-timeline-rail"></div>' +
    '<div class="sf-timeline-milestone" data-i="0"><span class="sf-timeline-label">Start</span></div>' +
    '<div class="sf-timeline-milestone" data-i="1"><span class="sf-timeline-label">Plan</span></div>' +
    '<div class="sf-timeline-milestone sf-timeline-milestone--delayed" data-i="2">' +
    '<span class="sf-timeline-label">Launch</span>' +
    '<span class="sf-timeline-delay">Delayed</span>' +
    '</div>' +
    '<div class="sf-timeline-milestone sf-timeline-milestone--future" data-i="3">' +
    '<span class="sf-timeline-label">Outcome</span>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="sf-v sf-v-hierarchy" data-visual="hierarchy">' +
    '<div class="sf-org">' +
    '<div class="sf-org-row" data-level="0"><span class="sf-org-title">CEO</span><span class="sf-org-wait">Waiting</span></div>' +
    '<div class="sf-org-row" data-level="1"><span class="sf-org-title">Director</span><span class="sf-org-wait">Waiting</span></div>' +
    '<div class="sf-org-row" data-level="2"><span class="sf-org-title">Manager</span><span class="sf-org-wait">Waiting</span></div>' +
    '<div class="sf-org-row" data-level="3"><span class="sf-org-title">Team</span><span class="sf-org-wait">Waiting</span></div>' +
    '</div>' +
    '</div>' +
    '<div class="sf-v sf-v-owner" data-visual="owner">' +
    '<div class="sf-org sf-org--ghost">' +
    '<div class="sf-org-row" data-level="0"><span class="sf-org-title">CEO</span></div>' +
    '<div class="sf-org-row" data-level="1"><span class="sf-org-title">Director</span></div>' +
    '<div class="sf-org-row" data-level="2"><span class="sf-org-title">Manager</span></div>' +
    '<div class="sf-org-row" data-level="3"><span class="sf-org-title">Team</span></div>' +
    '</div>' +
    '<p class="sf-owner-gap">Owner ?</p>' +
    '</div>' +
    '<div class="sf-v sf-v-converge" data-visual="converge">' +
    '<div class="sf-converge">' +
    '<span class="sf-converge-node" data-node="0">Ops</span>' +
    '<span class="sf-converge-node" data-node="1">Finance</span>' +
    '<span class="sf-converge-node" data-node="2">Delivery</span>' +
    '<span class="sf-converge-node" data-node="3">Legal</span>' +
    '<span class="sf-converge-layer">Hidden layer</span>' +
    '</div>' +
    '</div>' +
    '<div class="sf-v sf-v-executia" data-visual="executia">' +
    '<div class="sf-reveal-line"></div>' +
    '</div>' +
    '<div class="sf-v sf-v-question" data-visual="question">' +
    '<div class="sf-reveal-line sf-reveal-line--strong"></div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>';

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function segment(value, start, end) {
    return clamp01((value - start) / (end - start));
  }

  function beatAt(ms) {
    for (var i = 0; i < BEATS.length; i += 1) {
      if (ms < BEATS[i].end || i === BEATS.length - 1) return i;
    }
    return BEATS.length - 1;
  }

  function mountNetwork(canvas) {
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;

    var nodes = [
      { x: 0.12, y: 0.18 },
      { x: 0.28, y: 0.42 },
      { x: 0.44, y: 0.22 },
      { x: 0.58, y: 0.52 },
      { x: 0.72, y: 0.28 },
      { x: 0.86, y: 0.48 },
      { x: 0.2, y: 0.72 },
      { x: 0.38, y: 0.82 },
      { x: 0.56, y: 0.68 },
      { x: 0.74, y: 0.78 },
      { x: 0.9, y: 0.86 },
    ];

    var edges = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [1, 6],
      [3, 8],
      [6, 7],
      [7, 8],
      [8, 9],
      [9, 10],
      [5, 10],
      [2, 8],
    ];

    function resize() {
      var rect = canvas.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(phase) {
      var w = canvas.clientWidth;
      var h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      var pulse = 0.028 + Math.sin(phase * 0.0012) * 0.008;

      ctx.strokeStyle = 'rgba(18, 65, 85, ' + pulse + ')';
      ctx.lineWidth = 1;

      edges.forEach(function (pair, index) {
        var a = nodes[pair[0]];
        var b = nodes[pair[1]];
        var strength = 0.35 + Math.sin(phase * 0.0008 + index) * 0.15;
        ctx.globalAlpha = strength;
        ctx.beginPath();
        ctx.moveTo(a.x * w, a.y * h);
        ctx.lineTo(b.x * w, b.y * h);
        ctx.stroke();
      });

      ctx.globalAlpha = 1;
    }

    resize();
    window.addEventListener('resize', resize);

    return { draw: draw, resize: resize };
  }

  function applyProgress(root, elapsedMs) {
    var beatIndex = beatAt(elapsedMs);
    var beat = BEATS[beatIndex];
    var local = segment(elapsedMs, beat.start, beat.end);
    var enter = segment(elapsedMs, beat.start, beat.start + 280);

    var headline = root.querySelector('.sf-headline');
    if (headline) {
      headline.textContent = beat.headline;
      headline.style.opacity = String(0.25 + enter * 0.75);
      headline.style.transform = 'translateY(' + (1 - enter) * 10 + 'px)';
      headline.classList.toggle('sf-headline--solution', beatIndex >= 6);
      headline.classList.toggle('sf-headline--question', beatIndex === 7);
    }

    root.querySelectorAll('.sf-v').forEach(function (layer) {
      var active = layer.getAttribute('data-visual') === beat.visual;
      var opacity = active ? 0.2 + enter * 0.8 : 0;
      layer.style.opacity = String(opacity);
      layer.style.visibility = active ? 'visible' : 'hidden';
      layer.setAttribute('aria-hidden', active ? 'false' : 'true');
    });

    var timeline = root.querySelector('.sf-v-timeline');
    if (timeline) {
      var delayShift = segment(elapsedMs, 400, 1800) * 14;
      var delayed = timeline.querySelector('.sf-timeline-milestone--delayed');
      if (delayed) delayed.style.transform = 'translateX(' + delayShift + 'px)';
    }

    var hierarchy = root.querySelector('.sf-v-hierarchy');
    if (hierarchy) {
      hierarchy.querySelectorAll('.sf-org-row').forEach(function (row, index) {
        var levelStart = beat.start + index * 420;
        var levelEnter = segment(elapsedMs, levelStart, levelStart + 520);
        row.style.opacity = String(beat.visual === 'hierarchy' ? 0.25 + levelEnter * 0.75 : 0.25);
        var wait = row.querySelector('.sf-org-wait');
        if (wait) wait.style.opacity = String(levelEnter);
      });
    }

    var owner = root.querySelector('.sf-v-owner');
    if (owner) {
      var ownerEnter = beat.visual === 'owner' ? segment(elapsedMs, beat.start + 300, beat.start + 900) : 0;
      var gap = owner.querySelector('.sf-owner-gap');
      if (gap) {
        gap.style.opacity = String(ownerEnter);
        gap.style.transform = 'translateY(' + (1 - ownerEnter) * 8 + 'px)';
      }
    }

    var converge = root.querySelector('.sf-v-converge');
    if (converge) {
      var connect = beat.visual === 'converge' ? segment(elapsedMs, beat.start, beat.end) : 0;
      var layer = converge.querySelector('.sf-converge-layer');
      if (layer) layer.style.opacity = String(connect * 0.85);
      converge.querySelectorAll('.sf-converge-node').forEach(function (node, index) {
        var nodePull = segment(connect, index * 0.08, index * 0.08 + 0.35);
        node.style.transform = 'translateY(' + nodePull * 6 + 'px) scale(' + (1 - nodePull * 0.04) + ')';
      });
    }

    var executia = root.querySelector('.sf-v-executia');
    if (executia) {
      var line = executia.querySelector('.sf-reveal-line');
      if (line) line.style.transform = 'scaleX(' + (beat.visual === 'executia' ? 0.2 + local * 0.8 : 0.2) + ')';
    }

    var question = root.querySelector('.sf-v-question');
    if (question) {
      var qLine = question.querySelector('.sf-reveal-line');
      if (qLine) qLine.style.transform = 'scaleX(' + (beat.visual === 'question' ? 0.35 + local * 0.65 : 0.35) + ')';
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
    var networkCanvas = root.querySelector('.sf-network');
    var network = mountNetwork(networkCanvas);

    var playing = true;
    var finished = false;
    var scrolled = false;
    var elapsedMs = 0;
    var rafId = null;
    var lastTick = null;

    function effectivePlaying() {
      return playing && !finished;
    }

    function updateControls() {
      setPlayIcon(playBtn, effectivePlaying());
      playBtn.hidden = finished;
      if (replayBtn) replayBtn.hidden = !finished;
    }

    function render(now) {
      var progress = Math.min(1, elapsedMs / STORY_TOTAL_MS);
      progressFill.style.width = progress * 100 + '%';
      applyProgress(root, finished ? STORY_TOTAL_MS : elapsedMs);
      if (network) network.draw(typeof now === 'number' ? now : performance.now());
      updateControls();
    }

    function tick(now) {
      if (!effectivePlaying()) return;
      if (lastTick === null) lastTick = now;
      elapsedMs += now - lastTick;
      lastTick = now;

      if (elapsedMs >= SCROLL_AT_MS && !scrolled) {
        scrolled = true;
        scrollToCalculator();
      }

      if (elapsedMs >= STORY_TOTAL_MS) {
        elapsedMs = STORY_TOTAL_MS;
        finished = true;
        playing = false;
      }

      render(now);
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
      else render(performance.now());
    });

    if (replayBtn) replayBtn.addEventListener('click', restart);

    setPlayIcon(playBtn, true);
    if (replayBtn) replayBtn.hidden = true;
    render(performance.now());
    startLoop();
  }

  document.addEventListener('DOMContentLoaded', function () {
    var player = document.getElementById('story-film-player');
    if (player) mount(player);
  });
})();
