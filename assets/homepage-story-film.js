/**
 * EXECUTIA Opening Film (Protocol Briefing)
 * Evolved from the "From Chaos to Execution" cinematic manifesto stage.
 * Native MP4 takes over when /assets/executia-briefing-v2.mp4 is a real briefing.
 */
(function () {
  'use strict';

  var TOTAL_MS = 105000;
  var VIDEO_SRC = '/assets/executia-briefing-v2.mp4';
  var MIN_BRIEFING_MS = 55000;

  /* One continuous cinematic experience — soft crossfades between acts. */
  var ACTS = [
    {
      start: 0,
      end: 10000,
      mode: 'intro',
      kicker: 'Protocol Briefing',
      text: 'Execution Integrity Standard',
      brand: true,
    },
    {
      start: 10000,
      end: 20000,
      mode: 'decisions',
      kicker: '',
      text: 'Every day organizations make millions of decisions.',
    },
    {
      start: 20000,
      end: 33000,
      mode: 'problem',
      kicker: '',
      text: 'Most failures do not begin with bad decisions.\nThey begin during execution.',
    },
    {
      start: 33000,
      end: 45000,
      mode: 'chain',
      kicker: '',
      text: '',
      chain: true,
    },
    {
      start: 45000,
      end: 57000,
      mode: 'failures',
      kicker: 'Execution failures',
      text: '',
      failures: true,
    },
    {
      start: 57000,
      end: 68000,
      mode: 'turning',
      kicker: '',
      text: 'What if execution could be governed before it happens?',
    },
    {
      start: 68000,
      end: 82000,
      mode: 'eim',
      kicker: 'Execution Integrity Model',
      text: '',
      eim: true,
    },
    {
      start: 82000,
      end: 92000,
      mode: 'platform',
      kicker: '',
      text: '',
      platform: true,
    },
    {
      start: 92000,
      end: 97000,
      mode: 'life',
      kicker: '',
      text: '',
      life: true,
    },
    {
      start: 97000,
      end: 105000,
      mode: 'finale',
      kicker: '',
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

  /* Premium institutional bed — muted by default (autoplay policy). */
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
    var target = 0.22;

    function applyMute() {
      var now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setTargetAtTime(muted ? 0 : target, now, 0.35);
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
        tick.frequency.value = 220;
        g.gain.value = 0.0001;
        tick.connect(g);
        g.connect(master);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.035, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
        tick.start(now);
        tick.stop(now + 0.6);
      },
      setProgress: function (p) {
        target = 0.16 + 0.14 * clamp01(p);
        if (!muted) {
          master.gain.setTargetAtTime(target, ctx.currentTime, 0.8);
        }
        /* Gentle finale swell. */
        if (p > 0.9 && !muted) {
          master.gain.setTargetAtTime(0.32, ctx.currentTime, 1.2);
        }
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
        ctx.fillStyle = 'rgba(186, 230, 253,' + (0.06 + 0.18 * pulse * intensity) + ')';
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
      var y = height * 0.62;
      var xs = [0.14, 0.38, 0.62, 0.86].map(function (v) {
        return v * width;
      });
      ctx.save();
      ctx.strokeStyle = 'rgba(186, 230, 253,' + (0.28 + 0.45 * progress) + ')';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(xs[0], y);
      for (var i = 1; i < xs.length; i += 1) {
        var t = clamp01(progress * xs.length - (i - 1));
        if (t <= 0) break;
        ctx.lineTo(xs[i - 1] + (xs[i] - xs[i - 1]) * Math.min(1, t), y);
      }
      ctx.stroke();
      for (var j = 0; j < xs.length; j += 1) {
        var on = progress * xs.length > j;
        ctx.beginPath();
        ctx.fillStyle = on ? '#BAE6FD' : 'rgba(148,163,184,0.35)';
        ctx.arc(xs[j], y, on ? 4.5 : 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawHarmony(now, progress) {
      ctx.save();
      for (var i = 0; i < harmonyNodes.length; i += 1) {
        var n = harmonyNodes[i];
        var bob = reduced ? 0 : Math.sin(now / 900 + n.phase) * 6 * progress;
        var x = n.x * width;
        var y = n.y * height + bob;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(186, 230, 253,' + (0.45 + 0.35 * progress) + ')';
        ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(186, 230, 253,' + (0.1 + 0.16 * progress) + ')';
        ctx.arc(x, y, 12 + (now / 50 + i * 7) % 16, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(186, 230, 253,' + (0.14 + 0.2 * progress) + ')';
      ctx.beginPath();
      for (var k = 0; k < 5; k += 1) {
        var p = harmonyNodes[k];
        var px = p.x * width;
        var py = p.y * height + (reduced ? 0 : Math.sin(now / 900 + p.phase) * 6 * progress);
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    }

    function drawEimLayers(progress) {
      var layers = [
        { y: 0.34, w: 0.42 },
        { y: 0.5, w: 0.52 },
        { y: 0.66, w: 0.42 },
      ];
      ctx.save();
      for (var i = 0; i < layers.length; i += 1) {
        var on = easeInOut(clamp01(progress * 3.2 - i));
        if (on <= 0) continue;
        var L = layers[i];
        var lw = width * L.w * on;
        var lh = height * 0.08;
        var x = (width - lw) / 2;
        var y = height * L.y - lh / 2;
        ctx.fillStyle = i === 1
          ? 'rgba(18, 65, 85,' + (0.55 + 0.35 * on) + ')'
          : 'rgba(30, 41, 59,' + (0.4 + 0.3 * on) + ')';
        ctx.strokeStyle = 'rgba(186, 230, 253,' + (0.18 + 0.35 * on) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(x, y, lw, lh);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawPlatform(progress) {
      var p = easeInOut(progress);
      ctx.save();
      for (var i = 0; i < 3; i += 1) {
        var t = easeInOut(clamp01(p * 1.4 - i * 0.18));
        var w = width * (0.34 + i * 0.06);
        var h = height * 0.07;
        var x = (width - w) / 2;
        var y = height * (0.4 + i * 0.1) - h / 2;
        ctx.fillStyle = 'rgba(15, 23, 42,' + (0.45 + 0.3 * t) + ')';
        ctx.strokeStyle = 'rgba(186, 230, 253,' + (0.12 + 0.28 * t) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.fill();
        ctx.stroke();
      }
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
      grd.addColorStop(0, '#124155');
      grd.addColorStop(0.45, '#0A2E3F');
      grd.addColorStop(1, '#061820');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, width, height);

      if (act.mode === 'intro') {
        drawGrid(0.04 + 0.04 * local);
        drawHarmony(now, 0.15 + 0.25 * local);
      } else if (act.mode === 'decisions') {
        drawGrid(0.07);
        drawChaos(now, 0.35 + 0.25 * local);
      } else if (act.mode === 'problem') {
        drawGrid(0.06);
        drawChaos(now, 0.75 + 0.35 * (1 - local * 0.4));
      } else if (act.mode === 'chain') {
        drawGrid(0.03 * (1 - local));
        drawChain(local);
      } else if (act.mode === 'failures') {
        drawGrid(0.05);
        drawChaos(now, 0.9);
      } else if (act.mode === 'turning') {
        drawGrid(0.03);
        drawChaos(now, 0.25 * (1 - local));
        drawHarmony(now, 0.2 + 0.35 * local);
      } else if (act.mode === 'eim') {
        drawGrid(0.05);
        drawEimLayers(local);
      } else if (act.mode === 'platform') {
        drawGrid(0.04);
        drawPlatform(local);
      } else if (act.mode === 'life') {
        drawGrid(0.03);
        drawHarmony(now, 0.55);
      } else {
        drawHarmony(now, 0.85);
        ctx.fillStyle = 'rgba(186, 230, 253,' + (0.03 + 0.04 * local) + ')';
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
    var camera = root.querySelector('[data-cm-camera]');
    var textEl = root.querySelector('[data-cm-text]');
    var kickerEl = root.querySelector('[data-cm-kicker]');
    var brandEl = root.querySelector('[data-cm-brand]');
    var chainEl = root.querySelector('[data-cm-chain]');
    var failuresEl = root.querySelector('[data-cm-failures]');
    var eimEl = root.querySelector('[data-cm-eim]');
    var platformEl = root.querySelector('[data-cm-platform]');
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
    var inView = false;

    function effectivePlaying() {
      return playing && !finished && inView;
    }

    function showEl(el, on) {
      if (!el) return;
      el.hidden = !on;
      el.classList.toggle('is-on', on);
      if (el.hasAttribute('aria-hidden')) el.setAttribute('aria-hidden', on ? 'false' : 'true');
    }

    function updateCopy(act, local) {
      var key = act.start + ':' + act.mode;
      if (key !== lastActKey) {
        lastActKey = key;
        textEl.style.opacity = '0';
        if (brandEl) brandEl.style.opacity = '0';
        window.setTimeout(function () {
          if (kickerEl) {
            kickerEl.textContent = act.kicker || '';
            kickerEl.hidden = !act.kicker;
          }
          textEl.textContent = act.text || '';
          textEl.style.opacity = act.text ? '1' : '0';
          if (brandEl) {
            var showBrand = !!act.brand;
            brandEl.hidden = !showBrand;
            brandEl.style.opacity = showBrand ? '1' : '0';
          }
        }, 220);
        score.markBeat();
      } else if (act.text) {
        textEl.style.opacity = String(0.72 + 0.28 * Math.sin(Math.PI * Math.min(1, local * 1.05)));
      }

      showEl(chainEl, !!act.chain && local > 0.1);
      showEl(failuresEl, !!act.failures && local > 0.08);
      if (failuresEl && act.failures) {
        var items = failuresEl.querySelectorAll('li');
        for (var i = 0; i < items.length; i += 1) {
          items[i].classList.toggle('is-on', local > 0.12 + i * 0.16);
        }
      }
      showEl(eimEl, !!act.eim && local > 0.06);
      if (eimEl && act.eim) {
        var layers = eimEl.querySelectorAll('[data-eim-layer]');
        for (var L = 0; L < layers.length; L += 1) {
          layers[L].classList.toggle('is-on', local > 0.1 + L * 0.22);
        }
      }
      showEl(platformEl, !!act.platform && local > 0.08);
      showEl(lifeEl, !!act.life && local > 0.12);
      showEl(finaleEl, !!act.finale && local > 0.22);
    }

    function updateCamera(ms) {
      if (!camera || reduced) return;
      var t = ms / TOTAL_MS;
      var x = Math.sin(t * Math.PI * 2) * 1.1;
      var y = Math.cos(t * Math.PI * 1.4) * 0.8;
      var s = 1.02 + t * 0.03;
      camera.style.transform = 'translate(' + x + '%, ' + y + '%) scale(' + s + ')';
    }

    function updateControls() {
      setPlayIcon(playBtn, effectivePlaying());
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
      visual.draw(typeof now === 'number' ? now : performance.now(), finished ? TOTAL_MS : elapsedMs);
      updateCopy(act, local);
      updateCamera(finished ? TOTAL_MS : elapsedMs);
      score.setProgress(elapsedMs / TOTAL_MS);
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
        score.stop();
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
      score.resume();
      startLoop();
      render(performance.now());
    }

    playBtn.addEventListener('click', function () {
      if (finished) return;
      playing = !playing;
      score.resume();
      if (playing) startLoop();
      else render(performance.now());
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
          inView = !!(entry && entry.isIntersecting && entry.intersectionRatio >= 0.35);
          if (inView && playing && !finished) startLoop();
          else if (!inView && rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
            lastTick = null;
            render(performance.now());
          }
        },
        { threshold: [0, 0.35, 0.6] }
      );
      io.observe(stage);
    } else {
      inView = true;
    }

    setPlayIcon(playBtn, playing);
    if (replayBtn) replayBtn.hidden = true;
    if (reduced) {
      finished = true;
      playing = false;
      elapsedMs = TOTAL_MS;
    }
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
