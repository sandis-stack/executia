/**
 * EXECUTIA Opening Film (Protocol Briefing)
 * Cinematic discovery — every scene answers the previous one.
 * Native MP4 takes over when /assets/executia-briefing-v2.mp4 is a real briefing.
 */
(function () {
  'use strict';

  var TOTAL_MS = 105000;
  var VIDEO_SRC = '/assets/executia-briefing-v2.mp4';
  var MIN_BRIEFING_MS = 55000;

  /*
   * Narrative v2 — same runtime; continuous construction (no idle holds).
   * 0–28 Reality → 28–34 Discovery → 34–90 Revelation → 90–97 LIFE → 97–105 Finale
   */
  var ACTS = [
    { start: 0, end: 4000, mode: 'intro', camera: 'zoomIn', brand: true, text: '' },
    {
      start: 4000,
      end: 10000,
      mode: 'decisions',
      camera: 'zoomIn',
      text: 'Every day organizations make millions of decisions.',
    },
    {
      start: 10000,
      end: 16000,
      mode: 'problem',
      camera: 'lateral',
      text: 'Most failures begin during execution.',
    },
    { start: 16000, end: 22000, mode: 'chain', camera: 'lateral', chain: true, text: '' },
    {
      start: 22000,
      end: 28000,
      mode: 'failures',
      camera: 'lateral',
      failures: true,
      kicker: 'Execution failures',
      text: '',
    },
    {
      start: 28000,
      end: 34000,
      mode: 'discovery',
      camera: 'drift',
      text: 'What if execution could be governed before it happens?',
    },
    {
      start: 34000,
      end: 55000,
      mode: 'model',
      camera: 'rise',
      build: true,
      buildPhase: 'model',
      kicker: '',
      text: '',
    },
    {
      start: 55000,
      end: 75000,
      mode: 'govern',
      camera: 'rise',
      build: true,
      buildPhase: 'govern',
      text: '',
    },
    {
      start: 75000,
      end: 90000,
      mode: 'platform',
      camera: 'rise',
      build: true,
      buildPhase: 'platform',
      text: '',
    },
    {
      start: 90000,
      end: 97000,
      mode: 'life',
      camera: 'rise',
      build: true,
      buildPhase: 'platform',
      life: true,
      text: '',
    },
    {
      start: 97000,
      end: 105000,
      mode: 'finale',
      camera: 'zoomOut',
      text: 'Better execution creates better outcomes.',
      finale: true,
    },
  ];

  /* Continuous EIM construction → Platform transformation (34s–90s). */
  var BUILD_FROM = 34000;
  var BUILD_TO = 90000;

  function preferReduced() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
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

  function setMuteIcon(btn, muted) {
    btn.innerHTML = muted
      ? '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 5.2h2.2L7 3v8L4.2 8.8H2V5.2Z" fill="currentColor"/><path d="M9.2 5.2 12 8M12 5.2 9.2 8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>'
      : '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 5.2h2.2L7 3v8L4.2 8.8H2V5.2Z" fill="currentColor"/><path d="M9 4.8c1.1.8 1.8 2 1.8 3.2S10.1 9.4 9 10.2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M10.4 3.4c1.7 1.2 2.7 3 2.7 4.6s-1 3.4-2.7 4.6" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
    btn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
    btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
  }

  function createScore() {
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      return {
        muted: true,
        setMuted: function () {},
        resume: function () {},
        markBeat: function () {},
        setProgress: function () {},
        stop: function () {},
      };
    }

    var ctx = new AudioCtx();
    var master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    var oscA = ctx.createOscillator();
    var oscB = ctx.createOscillator();
    var gainA = ctx.createGain();
    var gainB = ctx.createGain();
    oscA.type = 'sine';
    oscB.type = 'sine';
    oscA.frequency.value = 55;
    oscB.frequency.value = 82.5;
    gainA.gain.value = 0.045;
    gainB.gain.value = 0.028;
    oscA.connect(gainA);
    oscB.connect(gainB);
    gainA.connect(master);
    gainB.connect(master);
    oscA.start();
    oscB.start();

    var muted = true;
    var target = 0.2;

    function applyMute() {
      var now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setTargetAtTime(muted ? 0 : target, now, 0.4);
    }

    return {
      get muted() {
        return muted;
      },
      setMuted: function (next) {
        muted = !!next;
        applyMute();
      },
      resume: function () {
        if (ctx.state === 'suspended') ctx.resume();
      },
      markBeat: function () {
        if (muted) return;
        var now = ctx.currentTime;
        var tick = ctx.createOscillator();
        var g = ctx.createGain();
        tick.type = 'sine';
        tick.frequency.value = 196;
        g.gain.value = 0.0001;
        tick.connect(g);
        g.connect(master);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.03, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
        tick.start(now);
        tick.stop(now + 0.75);
      },
      setProgress: function (p) {
        target = 0.14 + 0.16 * clamp01(p);
        if (p > 0.4 && p < 0.55) target = 0.12;
        if (p > 0.9 && !muted) target = 0.28;
        if (!muted) master.gain.setTargetAtTime(target, ctx.currentTime, 0.9);
      },
      stop: function () {
        muted = true;
        applyMute();
      },
    };
  }

  function mountCanvas(canvas) {
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var width = 0;
    var height = 0;
    var chaosNodes = [];
    var reduced = preferReduced();
    var tension = 0;
    var order = 0;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      chaosNodes = [];
      for (var i = 0; i < 42; i += 1) {
        chaosNodes.push({
          x: Math.random(),
          y: Math.random(),
          vx: (Math.random() - 0.5) * 0.0016,
          vy: (Math.random() - 0.5) * 0.0016,
          r: 0.7 + Math.random() * 1.6,
        });
      }
    }

    function drawGrid(alpha) {
      ctx.save();
      ctx.strokeStyle = 'rgba(148, 163, 184,' + alpha + ')';
      ctx.lineWidth = 1;
      var step = Math.max(30, Math.floor(width / 22));
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

    function drawField(now, chaosAmt, orderAmt) {
      for (var i = 0; i < chaosNodes.length; i += 1) {
        var n = chaosNodes[i];
        if (!reduced) {
          n.x += n.vx * (0.4 + chaosAmt);
          n.y += n.vy * (0.4 + chaosAmt);
          if (orderAmt > 0.2) {
            var tx = 0.18 + (i % 5) * 0.16;
            var ty = 0.35 + Math.floor(i / 14) * 0.18;
            n.x += (tx - n.x) * 0.01 * orderAmt;
            n.y += (ty - n.y) * 0.01 * orderAmt;
          }
          if (n.x < 0 || n.x > 1) n.vx *= -1;
          if (n.y < 0 || n.y > 1) n.vy *= -1;
        }
        var pulse = 0.4 + 0.6 * Math.abs(Math.sin(now / 200 + i));
        ctx.beginPath();
        ctx.fillStyle =
          'rgba(186, 230, 253,' + (0.05 + 0.16 * pulse * Math.max(chaosAmt, orderAmt * 0.7)) + ')';
        ctx.arc(n.x * width, n.y * height, n.r + pulse * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawChainGuide(progress) {
      var y = height * 0.58;
      var xs = [0.14, 0.38, 0.62, 0.86].map(function (v) {
        return v * width;
      });
      ctx.save();
      ctx.strokeStyle = 'rgba(186, 230, 253,' + (0.2 + 0.4 * progress) + ')';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(xs[0], y);
      for (var i = 1; i < xs.length; i += 1) {
        var t = clamp01(progress * xs.length - (i - 1));
        if (t <= 0) break;
        ctx.lineTo(xs[i - 1] + (xs[i] - xs[i - 1]) * Math.min(1, t), y);
      }
      ctx.stroke();
      for (var n = 0; n < xs.length; n += 1) {
        var on = progress > n * 0.22;
        if (!on) continue;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(186, 230, 253,' + (0.35 + 0.35 * Math.sin(progress * 8 + n)) + ')';
        ctx.arc(xs[n], y, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawDecisionPulses(now, intensity) {
      var cx = width * 0.5;
      var cy = height * 0.46;
      var beat = (now % 2500) / 2500;
      for (var i = 0; i < 3; i += 1) {
        var t = (beat + i / 3) % 1;
        var r = 18 + t * Math.min(width, height) * 0.28;
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(186, 230, 253,' + (0.18 * intensity * (1 - t)) + ')';
        ctx.lineWidth = 1.2;
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    function drawFracture(progress) {
      var seeds = [
        [0.2, 0.35, 0.42, 0.62],
        [0.55, 0.3, 0.72, 0.58],
        [0.35, 0.55, 0.58, 0.78],
        [0.68, 0.42, 0.88, 0.7],
      ];
      ctx.save();
      ctx.strokeStyle = 'rgba(248, 250, 252,' + (0.08 + 0.22 * progress) + ')';
      ctx.lineWidth = 1;
      for (var i = 0; i < seeds.length; i += 1) {
        var s = seeds[i];
        var t = clamp01(progress * seeds.length - i);
        if (t <= 0) continue;
        ctx.beginPath();
        ctx.moveTo(s[0] * width, s[1] * height);
        ctx.lineTo(
          s[0] * width + (s[2] - s[0]) * width * t,
          s[1] * height + (s[3] - s[1]) * height * t
        );
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawFailureBursts(local) {
      var pts = [
        [0.28, 0.4],
        [0.48, 0.36],
        [0.66, 0.42],
        [0.54, 0.58],
      ];
      for (var i = 0; i < pts.length; i += 1) {
        var on = local > 0.08 + i * 0.18;
        if (!on) continue;
        var age = clamp01((local - (0.08 + i * 0.18)) / 0.25);
        ctx.beginPath();
        ctx.fillStyle = 'rgba(248, 113, 113,' + (0.12 + 0.18 * (1 - age)) + ')';
        ctx.arc(pts[i][0] * width, pts[i][1] * height, 4 + age * 10, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawBuildSpine(progress) {
      var p = easeInOut(progress);
      var x = width * 0.5;
      var y0 = height * 0.22;
      var y1 = height * 0.72;
      ctx.save();
      ctx.strokeStyle = 'rgba(186, 230, 253,' + (0.15 + 0.35 * p) + ')';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y0 + (y1 - y0) * p);
      ctx.stroke();
      ctx.restore();
    }

    function drawBuildScaffold(ms) {
      var p = clamp01((ms - BUILD_FROM) / Math.max(1, BUILD_TO - BUILD_FROM));
      var cx = width * 0.5;
      var bands = [
        { y: 0.34, from: 0.04 },
        { y: 0.46, from: 0.12 },
        { y: 0.58, from: 0.08 },
      ];
      for (var i = 0; i < bands.length; i += 1) {
        var a = clamp01((p - bands[i].from) / 0.08);
        if (a <= 0) continue;
        ctx.fillStyle = 'rgba(186, 230, 253,' + (0.03 + 0.05 * a) + ')';
        ctx.fillRect(cx - width * 0.16 * a, height * bands[i].y, width * 0.32 * a, 2);
      }
      if (p > 0.55) {
        var ray = clamp01((p - 0.55) / 0.15);
        for (var r = -1; r <= 1; r += 1) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(186, 230, 253,' + (0.12 * ray) + ')';
          ctx.moveTo(cx + r * width * 0.08, height * 0.46);
          ctx.lineTo(cx + r * width * 0.16, height * 0.62);
          ctx.stroke();
        }
      }
    }

    function draw(now, ms) {
      var act = actAt(ms);
      var local = clamp01((ms - act.start) / Math.max(1, act.end - act.start));
      var global = clamp01(ms / TOTAL_MS);

      /* Continuous field state — evolves every few seconds, never idle. */
      if (act.mode === 'intro') {
        tension = tension + (0.2 + local * 0.35 - tension) * 0.06;
        order = order + (0.08 - order) * 0.04;
      } else if (act.mode === 'decisions') {
        var pulse = 0.35 + 0.35 * Math.abs(Math.sin((ms / 2400) * Math.PI));
        tension = tension + (pulse - tension) * 0.07;
        order = order + (0.12 - order) * 0.04;
      } else if (act.mode === 'problem') {
        tension = tension + (0.75 + local * 0.25 - tension) * 0.08;
        order = order + (0.05 - order) * 0.04;
      } else if (act.mode === 'chain') {
        tension = tension + (0.55 - tension) * 0.06;
        order = order + (0.25 + local * 0.35 - order) * 0.07;
      } else if (act.mode === 'failures') {
        tension = tension + (0.9 - tension) * 0.09;
        order = order + (0.08 - order) * 0.05;
      } else if (act.mode === 'discovery') {
        tension = tension + (0.25 - tension) * 0.05;
        order = order + (0.4 + local * 0.2 - order) * 0.05;
      } else if (act.mode === 'model' || act.mode === 'govern' || act.mode === 'platform' || act.mode === 'life') {
        tension = tension + (0.12 - tension) * 0.04;
        order = order + (0.55 + local * 0.35 - order) * 0.045;
      } else {
        tension = tension + (0.08 - tension) * 0.04;
        order = order + (0.85 - order) * 0.04;
      }

      ctx.clearRect(0, 0, width, height);
      var grd = ctx.createRadialGradient(
        width * 0.5,
        height * (0.42 - global * 0.04),
        16,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.75
      );
      grd.addColorStop(0, '#124155');
      grd.addColorStop(0.5, '#0A2E3F');
      grd.addColorStop(1, '#061820');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, width, height);

      drawGrid(0.03 + tension * 0.05 + order * 0.03);
      drawField(now, tension, order);

      if (act.mode === 'decisions' || (ms >= 4000 && ms < 10000)) {
        drawDecisionPulses(now, 0.45 + local * 0.55);
      }
      if (act.mode === 'problem' || (ms >= 10000 && ms < 16000)) {
        drawFracture(act.mode === 'problem' ? local : clamp01((ms - 10000) / 6000));
      }
      if (act.mode === 'chain' || act.mode === 'failures' || (ms >= 16000 && ms < 28000)) {
        var chainP = clamp01((ms - 16000) / 6000);
        if (ms >= 22000) chainP = Math.max(0.35, 1 - (ms - 22000) / 6000);
        drawChainGuide(chainP);
      }
      if (act.mode === 'failures' || (ms >= 22000 && ms < 28000)) {
        drawFailureBursts(act.mode === 'failures' ? local : clamp01((ms - 22000) / 6000));
      }
      if (
        act.mode === 'model' ||
        act.mode === 'govern' ||
        act.mode === 'platform' ||
        act.mode === 'life' ||
        (ms >= 34000 && ms < 97000)
      ) {
        var buildP = clamp01((ms - BUILD_FROM) / Math.max(1, BUILD_TO - BUILD_FROM));
        if (act.mode === 'life' || (ms >= 90000 && ms < 95500)) buildP = 1;
        if (ms >= 95500) buildP = clamp01(1 - (ms - 95500) / 1500);
        drawBuildSpine(buildP);
        drawBuildScaffold(ms);
      }
      if (act.mode === 'finale' || ms >= 97000) {
        var finLocal = act.mode === 'finale' ? local : clamp01((ms - 97000) / 1500);
        ctx.fillStyle = 'rgba(186, 230, 253,' + (0.025 + 0.03 * finLocal) + ')';
        ctx.fillRect(0, 0, width, height);
      }
    }

    resize();
    window.addEventListener('resize', resize);
    return { draw: draw, resize: resize };
  }

  function cameraPose(camera, local, global, ms) {
    var x = 0;
    var y = 0;
    var s = 1.02;
    var t = typeof ms === 'number' ? ms : global * TOTAL_MS;
    if (camera === 'zoomIn') {
      s = 1.01 + easeInOut(Math.min(1, global / 0.4)) * 0.05;
      y = -0.5 * easeInOut(local);
      x = Math.sin(t / 3200) * 0.55;
    } else if (camera === 'lateral') {
      s = 1.03 + Math.sin(t / 2800) * 0.012;
      x = Math.sin(global * Math.PI * 3.2) * 1.6;
      y = Math.cos(global * Math.PI * 1.7) * 0.7;
    } else if (camera === 'drift') {
      s = 1.035 + Math.sin(t / 2600) * 0.01;
      x = Math.sin(t / 2200) * 0.9;
      y = Math.cos(t / 3000) * 0.55;
    } else if (camera === 'static') {
      s = 1.04;
    } else if (camera === 'rise') {
      s = 1.03 + local * 0.03 + Math.sin(t / 3400) * 0.006;
      y = 2.2 - easeInOut(local) * 3.4;
      x = Math.sin(t / 4000) * 0.35;
    } else if (camera === 'zoomOut') {
      s = 1.06 - easeInOut(local) * 0.05;
      y = -0.8 + local * 0.6;
    }
    return { x: x, y: y, s: s };
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function cameraTransform(ms, reduced) {
    if (reduced) return 'none';
    var act = actAt(ms);
    var local = clamp01((ms - act.start) / Math.max(1, act.end - act.start));
    var global = clamp01(ms / TOTAL_MS);
    var pose = cameraPose(act.camera || 'static', local, global, ms);
    var idx = ACTS.indexOf(act);
    var next = idx >= 0 && idx < ACTS.length - 1 ? ACTS[idx + 1] : null;
    var blendWindow = 1600;
    if (next && act.end - ms < blendWindow && act.end - ms >= 0) {
      var blend = easeInOut(1 - (act.end - ms) / blendWindow);
      var nextPose = cameraPose(next.camera || 'static', 0, clamp01(act.end / TOTAL_MS), act.end);
      pose = {
        x: lerp(pose.x, nextPose.x, blend),
        y: lerp(pose.y, nextPose.y, blend),
        s: lerp(pose.s, nextPose.s, blend),
      };
    }
    return 'translate(' + pose.x.toFixed(2) + '%, ' + pose.y.toFixed(2) + '%) scale(' + pose.s.toFixed(3) + ')';
  }

  function mountManifesto(player) {
    var stage = player.querySelector('[data-manifesto-stage]') || player.querySelector('.hp-film-stage');
    var root = player.querySelector('[data-manifesto]');
    if (!stage || !root) return;

    var canvas = root.querySelector('.cm-canvas');
    var camera = root.querySelector('[data-cm-camera]');
    var textEl = root.querySelector('[data-cm-text]');
    var kickerEl = root.querySelector('[data-cm-kicker]');
    var brandEl = root.querySelector('[data-cm-brand]');
    var chainEl = root.querySelector('[data-cm-chain]');
    var failuresEl = root.querySelector('[data-cm-failures]');
    var buildEl = root.querySelector('[data-cm-build]');
    var lifeEl = root.querySelector('[data-cm-life]');
    var finaleEl = root.querySelector('[data-cm-finale]');
    var progressFill = root.querySelector('[data-cm-progress]');
    var playBtn = root.querySelector('[data-cm-play]');
    var muteBtn = root.querySelector('[data-cm-mute]');
    var replayBtn = root.querySelector('[data-cm-replay]');
    var visual = mountCanvas(canvas);
    if (!visual || !textEl || !playBtn) return;

    var score = createScore();
    var reduced = preferReduced();
    var playing = !reduced;
    var finished = false;
    var elapsedMs = reduced ? TOTAL_MS : 0;
    var rafId = null;
    var lastTick = null;
    var lastActKey = '';
    var inView = true;
    var lastBuildMark = -1;
    var committedText = null;
    var committedKicker = null;
    var textSwapTimer = null;
    var brandWrap = root.querySelector('[data-cm-brand-wrap]');
    var copyWrap = root.querySelector('[data-cm-copy-wrap]');
    var axisEl = root.querySelector('[data-cm-axis]');

    function effectivePlaying() {
      return playing && !finished && inView;
    }

    /*
     * Envelope: fade in → hold → fade out.
     * Handoffs are sequenced so exit completes before the next layer peaks.
     */
    function envelope(ms, fadeInStart, holdStart, holdEnd, fadeOutEnd) {
      if (ms < fadeInStart || ms >= fadeOutEnd) return 0;
      if (ms < holdStart) {
        return easeInOut(clamp01((ms - fadeInStart) / Math.max(1, holdStart - fadeInStart)));
      }
      if (ms <= holdEnd) return 1;
      return 1 - easeInOut(clamp01((ms - holdEnd) / Math.max(1, fadeOutEnd - holdEnd)));
    }

    function setLayerOpacity(el, amount, zIndex) {
      if (!el) return;
      var a = clamp01(amount);
      el.style.opacity = String(a);
      el.style.visibility = a < 0.02 ? 'hidden' : 'visible';
      el.style.zIndex = String(typeof zIndex === 'number' ? zIndex : a > 0.5 ? 3 : 1);
      el.classList.toggle('is-on', a > 0.15);
      if (el.hasAttribute('aria-hidden')) {
        el.setAttribute('aria-hidden', a > 0.15 ? 'false' : 'true');
      }
    }

    function setChildOpacity(el, amount, onClass) {
      if (!el) return;
      var a = clamp01(amount);
      el.style.opacity = String(a);
      el.style.visibility = a < 0.02 ? 'hidden' : 'visible';
      if (onClass) el.classList.toggle(onClass, a > 0.2);
    }

    function clearInlineOpacity(el) {
      if (el) el.style.opacity = '';
    }

    function crossfadeText(nextText, nextKicker) {
      var text = nextText || '';
      var kicker = nextKicker || '';
      if (text === committedText && kicker === committedKicker) {
        if (textEl && text) textEl.style.opacity = '1';
        return;
      }
      if (textSwapTimer) {
        window.clearTimeout(textSwapTimer);
        textSwapTimer = null;
      }
      var hadContent = !!(committedText || committedKicker);
      committedText = text;
      committedKicker = kicker;

      function applyText() {
        if (kickerEl) {
          kickerEl.textContent = kicker;
          kickerEl.style.opacity = kicker ? '1' : '0';
        }
        if (text.indexOf('<') !== -1) textEl.innerHTML = text;
        else textEl.textContent = text;
        textEl.style.opacity = text ? '1' : '0';
      }

      if (!hadContent || reduced) {
        applyText();
        return;
      }
      textEl.style.opacity = '0';
      if (kickerEl) kickerEl.style.opacity = '0';
      textSwapTimer = window.setTimeout(function () {
        applyText();
        textSwapTimer = null;
      }, 280);
    }

    function updateBuild(ms, buildAmount) {
      if (!buildEl) return;
      if (buildAmount < 0.02) {
        /* Fully resolved — clear semantic labels so they cannot ghost under finale. */
        var clearLabel = buildEl.querySelector('[data-build-label]');
        if (clearLabel) {
          clearLabel.classList.remove('is-on', 'is-platform');
          clearLabel.setAttribute('data-label-mode', '');
          clearLabel.style.opacity = '0';
          clearLabel.style.visibility = 'hidden';
        }
        if (lifeEl) {
          lifeEl.classList.remove('is-on');
          lifeEl.style.opacity = '0';
          lifeEl.style.visibility = 'hidden';
        }
        var clearApps = buildEl.querySelector('[data-build-apps]');
        if (clearApps) {
          clearApps.classList.remove('is-on');
          var clearAppNodes = clearApps.querySelectorAll('[data-app]');
          for (var ca = 0; ca < clearAppNodes.length; ca += 1) {
            clearAppNodes[ca].classList.remove('is-on', 'is-life');
            clearAppNodes[ca].style.opacity = '0';
          }
        }
        var clearCaps = buildEl.querySelectorAll('[data-cap]');
        for (var cc = 0; cc < clearCaps.length; cc += 1) {
          clearCaps[cc].classList.remove('is-on', 'is-linked');
        }
        var clearRays = buildEl.querySelector('[data-build-rays]');
        if (clearRays) clearRays.classList.remove('is-on');
        lastBuildMark = -1;
        return;
      }

      var label = buildEl.querySelector('[data-build-label]');
      var stack = buildEl.querySelector('[data-build-eim]');
      var eimLayers = buildEl.querySelectorAll('[data-eim-layer]');
      var links = buildEl.querySelectorAll('[data-build-link]');
      var caps = buildEl.querySelector('[data-build-caps]');
      var capNodes = caps ? caps.querySelectorAll('[data-cap]') : [];
      var rays = buildEl.querySelector('[data-build-rays]');
      var apps = buildEl.querySelector('[data-build-apps]');
      var appNodes = apps ? apps.querySelectorAll('[data-app]') : [];

      /*
       * Construction (exclusive title zones):
       * layers → links → activate → EIM title → EIM exits → caps → lock → Platform → apps → LIFE
       */
      var executionOn = ms >= 34500;
      var businessOn = ms >= 36800;
      var integrityOn = ms >= 39100;
      var linksOn = ms >= 41400;
      var integrityActive = ms >= 43700;
      /* EIM title resolves before caps become primary. */
      var modelTitleOn = ms >= 46000 && ms < 53500;
      var capsOn = ms >= 55200;
      var govOn = ms >= 56000;
      var evidenceOn = ms >= 58500;
      var verifyOn = ms >= 61000;
      var expandOn = ms >= 64000;
      var linkedOn = ms >= 68000;
      var lockedOn = ms >= 71500;
      /* Platform only after caps + lock; EIM already gone. */
      var platformTitleOn = ms >= 76000 && ms < 96800;
      var appsOn = ms >= 82000 && ms < 96800;
      var lifeOn = ms >= 90000 && ms < 96800;
      var settlePulse = ms >= 48000 && ms < 55200;

      var layerState = {
        execution: executionOn,
        business: businessOn,
        integrity: integrityOn,
      };
      var focusId = '';
      if (ms >= 34500 && ms < 36800) focusId = 'execution';
      else if (ms >= 36800 && ms < 39100) focusId = 'business';
      else if (ms >= 39100 && ms < 43700) focusId = 'integrity';
      else if (settlePulse) {
        var cycle = Math.floor((ms - 48000) / 1800) % 3;
        focusId = cycle === 0 ? 'execution' : cycle === 1 ? 'business' : 'integrity';
      }

      for (var L = 0; L < eimLayers.length; L += 1) {
        var id = eimLayers[L].getAttribute('data-eim-layer');
        eimLayers[L].classList.toggle('is-on', !!layerState[id]);
        eimLayers[L].classList.toggle('is-focus', focusId === id);
        eimLayers[L].classList.toggle('is-active', id === 'integrity' && integrityActive);
      }

      for (var li = 0; li < links.length; li += 1) {
        links[li].classList.toggle('is-on', linksOn);
        links[li].classList.toggle('is-expanded', expandOn || (settlePulse && ms >= 50000));
      }

      if (stack) {
        stack.classList.toggle('is-linked', linkedOn || (settlePulse && ms >= 52000));
        stack.classList.toggle('is-locked', lockedOn);
      }

      if (caps) caps.classList.toggle('is-on', capsOn && !appsOn);
      for (var c = 0; c < capNodes.length; c += 1) {
        var capId = capNodes[c].getAttribute('data-cap');
        var capShow =
          capsOn &&
          !appsOn &&
          ((capId === 'governance' && govOn) ||
            (capId === 'evidence' && evidenceOn) ||
            (capId === 'verification' && verifyOn));
        capNodes[c].classList.toggle('is-on', capShow);
        capNodes[c].classList.toggle('is-linked', expandOn && capShow);
      }

      if (rays) rays.classList.toggle('is-on', expandOn && !appsOn && ms < 96800);

      /* Single label element — never EIM and Platform at once. */
      if (label) {
        var nextMode = platformTitleOn ? 'platform' : modelTitleOn ? 'model' : '';
        var nextText = platformTitleOn
          ? 'EXECUTIA Platform'
          : modelTitleOn
            ? 'Execution Integrity Model'
            : '';
        var prevMode = label.getAttribute('data-label-mode') || '';
        var labelAmt = 0;
        if (modelTitleOn) {
          labelAmt = envelope(ms, 46000, 47000, 52000, 53500);
        } else if (platformTitleOn) {
          labelAmt = envelope(ms, 76000, 77500, 94000, 96800);
        }
        if (nextMode !== prevMode) {
          label.setAttribute('data-label-mode', nextMode);
          if (nextMode === 'platform') {
            label.classList.add('is-platform');
            label.textContent = nextText;
          } else if (nextMode === 'model') {
            label.classList.remove('is-platform');
            label.textContent = nextText;
          } else {
            label.classList.remove('is-platform');
          }
        } else if (nextText && label.textContent !== nextText) {
          label.textContent = nextText;
        }
        label.classList.toggle('is-platform', nextMode === 'platform');
        label.classList.toggle('is-on', labelAmt > 0.15);
        label.style.opacity = String(labelAmt);
        label.style.visibility = labelAmt < 0.02 ? 'hidden' : 'visible';
      }

      if (apps) apps.classList.toggle('is-on', appsOn);
      for (var a = 0; a < appNodes.length; a += 1) {
        var appDelay = a * 900;
        var appShow = appsOn && ms >= 82000 + appDelay;
        if (appShow) {
          clearInlineOpacity(appNodes[a]);
          appNodes[a].classList.add('is-on');
        } else {
          appNodes[a].classList.remove('is-on');
          appNodes[a].style.opacity = '0';
        }
        appNodes[a].classList.toggle(
          'is-life',
          lifeOn && appNodes[a].getAttribute('data-app') === 'life'
        );
      }

      if (lifeEl) {
        var lifeAmt = lifeOn ? envelope(ms, 90000, 91200, 94800, 96800) : 0;
        lifeEl.classList.toggle('is-on', lifeAmt > 0.15);
        lifeEl.style.opacity = String(lifeAmt);
        lifeEl.style.visibility = lifeAmt < 0.02 ? 'hidden' : 'visible';
      }

      var mark =
        (executionOn ? 1 : 0) +
        (businessOn ? 2 : 0) +
        (integrityOn ? 4 : 0) +
        (linksOn ? 8 : 0) +
        (integrityActive ? 16 : 0) +
        (modelTitleOn ? 32 : 0) +
        (govOn ? 64 : 0) +
        (evidenceOn ? 128 : 0) +
        (verifyOn ? 256 : 0) +
        (expandOn ? 512 : 0) +
        (lockedOn ? 1024 : 0) +
        (platformTitleOn ? 2048 : 0) +
        (appsOn ? 4096 : 0) +
        (lifeOn ? 8192 : 0);
      if (mark !== lastBuildMark) {
        lastBuildMark = mark;
        score.markBeat();
      }
    }

    function updateVisualState(act, local, ms) {
      /*
       * Exclusive primary layers (handoff: exit → 0, then enter peaks).
       * Shared geometry only within axis (chain structure under failures).
       */
      var brandAmt = envelope(ms, 0, 700, 2600, 3800);
      var copyEarlyAmt = envelope(ms, 4200, 5200, 14800, 16000);
      var copyDiscoveryAmt = envelope(ms, 28200, 29400, 32800, 34000);
      var copyAmt = Math.max(copyEarlyAmt, copyDiscoveryAmt);
      var axisAmt = envelope(ms, 16000, 17200, 26600, 28000);
      var buildAmt = envelope(ms, 34000, 35200, 95500, 97000);
      var finaleAmt = envelope(ms, 97000, 98500, 105000, 105001);

      /* Primary z-index follows the dominant layer. */
      var primary =
        finaleAmt >= 0.5
          ? 'finale'
          : buildAmt >= 0.5
            ? 'build'
            : axisAmt >= 0.5
              ? 'axis'
              : copyAmt >= 0.5
                ? 'copy'
                : brandAmt >= 0.5
                  ? 'brand'
                  : 'none';

      setLayerOpacity(brandWrap || brandEl, brandAmt, primary === 'brand' ? 4 : 1);
      setLayerOpacity(copyWrap, copyAmt, primary === 'copy' ? 4 : 1);
      setLayerOpacity(axisEl, axisAmt, primary === 'axis' ? 4 : 1);
      setLayerOpacity(buildEl, buildAmt, primary === 'build' ? 4 : 1);
      setLayerOpacity(finaleEl, finaleAmt, primary === 'finale' ? 4 : 1);

      if (brandEl) {
        if (brandAmt < 0.02) {
          if (!brandEl.getAttribute('data-label-cache')) {
            brandEl.setAttribute('data-label-cache', brandEl.textContent || 'EXECUTIA™');
          }
          brandEl.textContent = '';
          brandEl.style.opacity = '0';
          brandEl.style.visibility = 'hidden';
          brandEl.style.textShadow = 'none';
          brandEl.style.letterSpacing = '';
          brandEl.style.color = 'transparent';
        } else {
          var cached = brandEl.getAttribute('data-label-cache');
          if (cached) {
            brandEl.textContent = cached;
            brandEl.removeAttribute('data-label-cache');
          }
          brandEl.style.opacity = '';
          brandEl.style.visibility = '';
          brandEl.style.color = '';
          brandEl.style.letterSpacing =
            0.08 + 0.04 * Math.sin((ms / 1800) * Math.PI) + 'em';
          brandEl.style.textShadow =
            '0 0 ' + (12 + 10 * Math.abs(Math.sin(ms / 1600))) + 'px rgba(186,230,253,0.28)';
        }
      }
      if (brandWrap && brandAmt < 0.02) {
        brandWrap.style.opacity = '0';
        brandWrap.style.visibility = 'hidden';
      }

      if (copyAmt > 0.05) {
        if (copyEarlyAmt > copyDiscoveryAmt) {
          if (ms < 10000) {
            crossfadeText(
              ms >= 7000
                ? 'Every day organizations make <em>millions of decisions</em>.'
                : 'Every day organizations make millions of decisions.',
              ''
            );
          } else {
            crossfadeText(
              ms >= 13000
                ? 'Most failures begin <em>during execution</em>.'
                : 'Most failures begin during execution.',
              ''
            );
          }
        } else {
          crossfadeText(
            ms >= 30500
              ? 'What if execution could be <em>governed before it happens</em>?'
              : 'What if execution could be governed before it happens?',
            ''
          );
        }
      } else if (copyAmt < 0.02) {
        crossfadeText('', '');
      }

      /* Axis: chain resolves structurally; failures reveal below in sequence — never stacked on one point. */
      if (axisAmt > 0.02 && chainEl) {
        var chainPhase = envelope(ms, 16000, 17000, 21000, 22400);
        var failPhase = envelope(ms, 22200, 23400, 26600, 28000);
        /* While failures are primary, keep chain as dim structure only. */
        var chainAmt = failPhase > 0.2 ? Math.min(0.38, Math.max(chainPhase, 0.38)) : chainPhase;
        setChildOpacity(chainEl, chainAmt * axisAmt, 'is-on');
        chainEl.classList.toggle('is-dim', failPhase > 0.25);

        var chainLocal = clamp01((ms - 16000) / 5000);
        var nodes = chainEl.querySelectorAll('[data-chain-node]');
        for (var c = 0; c < nodes.length; c += 1) {
          nodes[c].classList.toggle('is-on', chainLocal > c * 0.2);
        }

        if (failuresEl) {
          setChildOpacity(failuresEl, failPhase * axisAmt, 'is-on');
          var failLocal = clamp01((ms - 22400) / 4400);
          var items = failuresEl.querySelectorAll('.cm-failures-list li');
          for (var f = 0; f < items.length; f += 1) {
            var appear = 0.04 + f * 0.22;
            var isCurrent = failLocal >= appear && failLocal < appear + 0.26;
            if (failPhase > 0.15 && isCurrent) {
              clearInlineOpacity(items[f]);
              items[f].classList.add('is-on');
              items[f].classList.remove('is-past');
            } else {
              items[f].classList.remove('is-on', 'is-past');
              items[f].style.opacity = '0';
            }
          }
        }
      } else {
        if (chainEl) {
          setChildOpacity(chainEl, 0, 'is-on');
          chainEl.classList.remove('is-dim');
          var offNodes = chainEl.querySelectorAll('[data-chain-node]');
          for (var cn = 0; cn < offNodes.length; cn += 1) offNodes[cn].classList.remove('is-on');
        }
        if (failuresEl) {
          setChildOpacity(failuresEl, 0, 'is-on');
          var offItems = failuresEl.querySelectorAll('.cm-failures-list li');
          for (var fi = 0; fi < offItems.length; fi += 1) {
            offItems[fi].classList.remove('is-on', 'is-past');
            offItems[fi].style.opacity = '0';
          }
        }
      }

      if (buildAmt > 0.02) updateBuild(ms, buildAmt);
      else updateBuild(ms, 0);

      var key = act.start + ':' + act.mode;
      if (key !== lastActKey) {
        lastActKey = key;
        score.markBeat();
      }
    }

    function updateCamera(ms) {
      if (!camera) return;
      camera.style.transform = cameraTransform(ms, reduced);
    }

    function updateControls() {
      setPlayIcon(playBtn, playing && !finished);
      playBtn.hidden = finished;
      if (replayBtn) replayBtn.hidden = !finished;
      if (muteBtn) setMuteIcon(muteBtn, score.muted);
      if (progressFill) {
        progressFill.style.width = Math.min(1, elapsedMs / TOTAL_MS) * 100 + '%';
      }
    }

    function render(now) {
      var act = actAt(elapsedMs);
      var local = clamp01((elapsedMs - act.start) / Math.max(1, act.end - act.start));
      var ms = finished ? TOTAL_MS : elapsedMs;
      visual.draw(typeof now === 'number' ? now : performance.now(), ms);
      updateVisualState(act, local, ms);
      updateCamera(ms);
      score.setProgress(elapsedMs / TOTAL_MS);
      updateControls();
    }

    function tick(ts) {
      if (!effectivePlaying()) return;
      var now = performance.now();
      if (lastTick === null) lastTick = now;
      elapsedMs += now - lastTick;
      lastTick = now;
      if (elapsedMs >= TOTAL_MS) {
        elapsedMs = TOTAL_MS;
        finished = true;
        playing = false;
        score.stop();
        markBriefingComplete();
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
      lastBuildMark = -1;
      committedText = null;
      committedKicker = null;
      if (textSwapTimer) {
        window.clearTimeout(textSwapTimer);
        textSwapTimer = null;
      }
      if (buildEl) {
        var label = buildEl.querySelector('[data-build-label]');
        if (label) {
          label.setAttribute('data-label-mode', '');
          label.classList.remove('is-on', 'is-platform');
          label.textContent = 'Execution Integrity Model';
        }
      }
      score.resume();
      startLoop();
      render(performance.now());
    }

    playBtn.addEventListener('click', function () {
      if (finished) return;
      playing = !playing;
      if (playing) {
        inView = true;
        score.resume();
        startLoop();
      } else {
        render(performance.now());
      }
    });

    if (muteBtn) {
      muteBtn.addEventListener('click', function () {
        score.resume();
        score.setMuted(!score.muted);
        updateControls();
      });
      setMuteIcon(muteBtn, true);
    }

    if (replayBtn) replayBtn.addEventListener('click', restart);

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(
        function (entries) {
          var entry = entries[0];
          /* Keep playing through minor layout shifts; pause only when fully off-screen. */
          inView = !!(entry && entry.isIntersecting);
          if (inView && playing && !finished) startLoop();
          else if (!inView && rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
            lastTick = null;
            render(performance.now());
          }
        },
        { threshold: [0, 0.01, 0.2] }
      );
      io.observe(player);
    } else {
      inView = true;
    }

    function markBriefingComplete() {
      root.classList.add('is-film-complete');
      player.classList.add('is-film-complete');
      var section = player.closest('#opening-film') || document.getElementById('opening-film');
      if (section) section.classList.add('is-film-complete');
    }

    function continueBriefing(event) {
      var trust = document.getElementById('trust');
      if (!trust) return;
      if (event) event.preventDefault();
      markBriefingComplete();
      var section = document.getElementById('opening-film');
      if (section) section.classList.add('is-briefing-continued');
      trust.classList.add('is-briefing-continue');
      var header = document.querySelector('.site-header');
      var offset = header ? Math.ceil(header.getBoundingClientRect().height) + 10 : 10;
      var top = Math.max(0, trust.getBoundingClientRect().top + window.pageYOffset - offset);
      var reducedMotion = preferReduced();
      if (reducedMotion || typeof window.scrollTo !== 'function') {
        window.scrollTo(0, top);
        return;
      }
      window.scrollTo({ top: top, behavior: 'smooth' });
    }

    var cta = root.querySelector('[data-cm-cta]');
    if (cta) {
      cta.addEventListener('click', continueBriefing);
    }

    setPlayIcon(playBtn, playing);
    if (replayBtn) replayBtn.hidden = true;
    if (reduced) {
      finished = true;
      playing = false;
      elapsedMs = TOTAL_MS;
      markBriefingComplete();
    }
    root.__cmSeek = function (ms) {
      elapsedMs = Math.max(0, Math.min(TOTAL_MS, Number(ms) || 0));
      finished = elapsedMs >= TOTAL_MS;
      if (finished) {
        playing = false;
        markBriefingComplete();
      } else {
        root.classList.remove('is-film-complete');
        player.classList.remove('is-film-complete');
        var section = document.getElementById('opening-film');
        if (section) section.classList.remove('is-film-complete', 'is-briefing-continued');
      }
      lastTick = null;
      if (textSwapTimer) {
        window.clearTimeout(textSwapTimer);
        textSwapTimer = null;
      }
      committedText = null;
      committedKicker = null;
      if (buildEl) {
        var label = buildEl.querySelector('[data-build-label]');
        if (label) label.setAttribute('data-label-mode', '');
      }
      lastBuildMark = -1;
      render(performance.now());
      updateControls();
    };
    render(performance.now());
    if (!reduced) startLoop();
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
