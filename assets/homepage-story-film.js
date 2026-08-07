/**
 * EXECUTIA — "From Chaos to Execution" cinematic manifesto stage.
 * Native MP4 takes over when /assets/executia-briefing-v2.mp4 is a real briefing.
 */
(function () {
  'use strict';

  var TOTAL_MS = 90000;
  var VIDEO_SRC = '/assets/executia-briefing-v2.mp4';
  var MIN_BRIEFING_MS = 55000;

  var ACTS = [
    {
      start: 0,
      end: 10000,
      mode: 'chaos',
      kicker: 'The World Today',
      text: 'Every system produces data.\nFew produce truth.',
    },
    {
      start: 10000,
      end: 25000,
      mode: 'problem',
      kicker: 'The Problem',
      text: 'Most systems detect problems.\nAfter they happen.',
    },
    {
      start: 25000,
      end: 45000,
      mode: 'turning',
      kicker: 'The Turning Point',
      text: 'What if execution itself\nprevented errors?',
      chain: true,
    },
    {
      start: 45000,
      end: 70000,
      mode: 'executia',
      kicker: 'EXECUTIA',
      text: 'One execution.\nOne truth.\nEvery action verified.',
    },
    {
      start: 70000,
      end: 90000,
      mode: 'future',
      kicker: 'The Future',
      text: 'Better execution creates better outcomes.',
      finale: true,
    },
  ];

  function preferReduced() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function actAt(ms) {
    for (var i = 0; i < ACTS.length; i += 1) {
      if (ms < ACTS[i].end || i === ACTS.length - 1) return ACTS[i];
    }
    return ACTS[ACTS.length - 1];
  }

  function setPlayIcon(btn, playing) {
    btn.innerHTML = playing
      ? '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="2" y="1.5" width="3" height="11" rx="0.75" fill="currentColor"/><rect x="9" y="1.5" width="3" height="11" rx="0.75" fill="currentColor"/></svg>'
      : '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.8 11.5 7 3 12.2V1.8Z" fill="currentColor"/></svg>';
    btn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }

  function mountCanvas(canvas) {
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var width = 0;
    var height = 0;
    var chaosNodes = [];
    var harmonyNodes = [];
    var reduced = preferReduced();

    function resize() {
      var rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      chaosNodes = [];
      for (var i = 0; i < 48; i += 1) {
        chaosNodes.push({
          x: Math.random(),
          y: Math.random(),
          vx: (Math.random() - 0.5) * 0.0018,
          vy: (Math.random() - 0.5) * 0.0018,
          r: 0.8 + Math.random() * 1.8,
        });
      }

      harmonyNodes = [
        { x: 0.18, y: 0.5, phase: 0 },
        { x: 0.34, y: 0.38, phase: 0.8 },
        { x: 0.5, y: 0.5, phase: 1.6 },
        { x: 0.66, y: 0.62, phase: 2.4 },
        { x: 0.82, y: 0.5, phase: 3.2 },
        { x: 0.5, y: 0.28, phase: 1.1 },
        { x: 0.5, y: 0.72, phase: 2.0 },
      ];
    }

    function drawGrid(alpha) {
      ctx.save();
      ctx.strokeStyle = 'rgba(148, 163, 184,' + alpha + ')';
      ctx.lineWidth = 1;
      var step = Math.max(28, Math.floor(width / 24));
      for (var x = 0; x <= width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, height);
        ctx.stroke();
      }
      for (var y = 0; y <= height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(width, y + 0.5);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawChaos(now, intensity) {
      for (var i = 0; i < chaosNodes.length; i += 1) {
        var n = chaosNodes[i];
        if (!reduced) {
          n.x += n.vx * intensity;
          n.y += n.vy * intensity;
          if (n.x < 0 || n.x > 1) n.vx *= -1;
          if (n.y < 0 || n.y > 1) n.vy *= -1;
        }
        var pulse = 0.45 + 0.55 * Math.abs(Math.sin(now / 180 + i));
        ctx.beginPath();
        ctx.fillStyle = 'rgba(212, 175, 55,' + (0.08 + 0.22 * pulse * intensity) + ')';
        ctx.arc(n.x * width, n.y * height, n.r + pulse, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = 'rgba(148, 163, 184,' + (0.08 + 0.12 * intensity) + ')';
      ctx.lineWidth = 1;
      for (var a = 0; a < chaosNodes.length; a += 6) {
        for (var b = a + 1; b < Math.min(a + 4, chaosNodes.length); b += 1) {
          ctx.beginPath();
          ctx.moveTo(chaosNodes[a].x * width, chaosNodes[a].y * height);
          ctx.lineTo(chaosNodes[b].x * width, chaosNodes[b].y * height);
          ctx.stroke();
        }
      }
    }

    function drawChain(progress) {
      var y = height * 0.58;
      var xs = [0.14, 0.38, 0.62, 0.86].map(function (v) {
        return v * width;
      });
      ctx.save();
      ctx.strokeStyle = 'rgba(212, 175, 55,' + (0.35 + 0.55 * progress) + ')';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(xs[0], y);
      for (var i = 1; i < xs.length; i += 1) {
        var t = clamp01(progress * xs.length - i);
        if (t <= 0) break;
        ctx.lineTo(xs[i - 1] + (xs[i] - xs[i - 1]) * Math.min(1, progress * xs.length - (i - 1)), y);
      }
      ctx.stroke();
      for (var j = 0; j < xs.length; j += 1) {
        var on = progress * xs.length > j;
        ctx.beginPath();
        ctx.fillStyle = on ? '#d4af37' : 'rgba(148,163,184,0.35)';
        ctx.arc(xs[j], y, on ? 4.5 : 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawHarmony(now, progress) {
      ctx.save();
      for (var i = 0; i < harmonyNodes.length; i += 1) {
        var n = harmonyNodes[i];
        var bob = reduced ? 0 : Math.sin(now / 700 + n.phase) * 8 * progress;
        var x = n.x * width;
        var y = n.y * height + bob;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(245, 158, 11,' + (0.55 + 0.35 * progress) + ')';
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(212, 175, 55,' + (0.12 + 0.2 * progress) + ')';
        ctx.arc(x, y, 12 + (now / 40 + i * 7) % 18, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(212, 175, 55,' + (0.18 + 0.25 * progress) + ')';
      ctx.beginPath();
      for (var k = 0; k < 5; k += 1) {
        var p = harmonyNodes[k];
        var px = p.x * width;
        var py = p.y * height + (reduced ? 0 : Math.sin(now / 700 + p.phase) * 8 * progress);
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    }

    function draw(now, ms) {
      var act = actAt(ms);
      var local = clamp01((ms - act.start) / Math.max(1, act.end - act.start));
      ctx.clearRect(0, 0, width, height);

      var grd = ctx.createRadialGradient(
        width * 0.5,
        height * 0.42,
        20,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.72
      );
      grd.addColorStop(0, '#1e293b');
      grd.addColorStop(0.55, '#111827');
      grd.addColorStop(1, '#0a0d12');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, width, height);

      if (act.mode === 'chaos') {
        drawGrid(0.08 + 0.1 * (1 - local));
        drawChaos(now, 1.15);
      } else if (act.mode === 'problem') {
        drawGrid(0.06);
        drawChaos(now, 0.55 + 0.35 * (1 - local));
      } else if (act.mode === 'turning') {
        drawGrid(0.04 * (1 - local));
        drawChain(local);
      } else if (act.mode === 'executia') {
        drawHarmony(now, 0.35 + 0.65 * local);
      } else {
        drawHarmony(now, 0.85);
        ctx.fillStyle = 'rgba(212, 175, 55,' + (0.04 + 0.06 * local) + ')';
        ctx.fillRect(0, 0, width, height);
      }
    }

    resize();
    window.addEventListener('resize', resize);
    return { draw: draw, resize: resize };
  }

  function mountManifesto(player) {
    var stage = player.querySelector('[data-manifesto-stage]') || player.querySelector('.hp-film-stage');
    var root = player.querySelector('[data-manifesto]');
    if (!stage || !root) return;

    var canvas = root.querySelector('.cm-canvas');
    var textEl = root.querySelector('[data-cm-text]');
    var kickerEl = root.querySelector('[data-cm-kicker]');
    var chainEl = root.querySelector('[data-cm-chain]');
    var finaleEl = root.querySelector('[data-cm-finale]');
    var progressFill = root.querySelector('[data-cm-progress]');
    var playBtn = root.querySelector('[data-cm-play]');
    var replayBtn = root.querySelector('[data-cm-replay]');
    var visual = mountCanvas(canvas);
    if (!visual || !textEl || !playBtn) return;

    var playing = true;
    var finished = false;
    var elapsedMs = 0;
    var rafId = null;
    var lastTick = null;
    var lastActKey = '';

    function effectivePlaying() {
      return playing && !finished;
    }

    function updateCopy(act, local) {
      var key = act.start + ':' + act.mode;
      if (key !== lastActKey) {
        lastActKey = key;
        textEl.style.opacity = '0';
        window.setTimeout(function () {
          if (kickerEl) kickerEl.textContent = act.kicker || 'From Chaos to Execution';
          textEl.textContent = act.text || '';
          textEl.style.opacity = '1';
        }, 180);
      } else {
        textEl.style.opacity = String(0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, local * 1.15)));
      }

      if (chainEl) {
        var showChain = !!act.chain && local > 0.12;
        chainEl.hidden = !showChain;
        chainEl.classList.toggle('is-on', showChain);
      }
      if (finaleEl) {
        var showFinale = !!act.finale && local > 0.28;
        finaleEl.hidden = !showFinale;
        finaleEl.classList.toggle('is-on', showFinale);
      }
    }

    function updateControls() {
      setPlayIcon(playBtn, effectivePlaying());
      playBtn.hidden = finished;
      if (replayBtn) replayBtn.hidden = !finished;
      if (progressFill) {
        progressFill.style.width = Math.min(1, elapsedMs / TOTAL_MS) * 100 + '%';
      }
    }

    function render(now) {
      var act = actAt(elapsedMs);
      var local = clamp01((elapsedMs - act.start) / Math.max(1, act.end - act.start));
      visual.draw(typeof now === 'number' ? now : performance.now(), finished ? TOTAL_MS : elapsedMs);
      updateCopy(act, local);
      updateControls();
    }

    function tick(now) {
      if (!effectivePlaying()) return;
      if (lastTick === null) lastTick = now;
      elapsedMs += now - lastTick;
      lastTick = now;
      if (elapsedMs >= TOTAL_MS) {
        elapsedMs = TOTAL_MS;
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
      lastActKey = '';
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

  function activateNativeVideo(stage, video, manifesto) {
    if (manifesto) manifesto.hidden = true;
    video.hidden = false;
    video.removeAttribute('hidden');
    stage.classList.add('is-native-video');
  }

  function probeNativeBriefing(player) {
    var stage = player.querySelector('[data-manifesto-stage]') || player.querySelector('.hp-film-stage');
    var video = player.querySelector('[data-briefing-video]');
    var manifesto = player.querySelector('[data-manifesto]');
    if (!stage || !video) {
      mountManifesto(player);
      return;
    }

    var settled = false;
    function useManifesto() {
      if (settled) return;
      settled = true;
      video.hidden = true;
      video.setAttribute('hidden', '');
      if (manifesto) manifesto.hidden = false;
      stage.classList.remove('is-native-video');
      mountManifesto(player);
    }
    function useVideo() {
      if (settled) return;
      settled = true;
      activateNativeVideo(stage, video, manifesto);
    }

    video.src = VIDEO_SRC;
    video.addEventListener('loadedmetadata', function () {
      var durationMs = (video.duration || 0) * 1000;
      if (Number.isFinite(durationMs) && durationMs >= MIN_BRIEFING_MS) useVideo();
      else useManifesto();
    });
    video.addEventListener('error', useManifesto);

    /* Fast path: missing asset should not delay manifesto. */
    fetch(VIDEO_SRC, { method: 'HEAD', cache: 'no-store' })
      .then(function (res) {
        if (!res || !res.ok) useManifesto();
      })
      .catch(function () {
        useManifesto();
      });

    window.setTimeout(function () {
      if (!settled) useManifesto();
    }, 1200);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var player = document.getElementById('story-film-player');
    if (!player) return;
    probeNativeBriefing(player);
  });
})();
