/**
 * EXECUTIA Entry — Hero Story Film (Manifest).
 * Film owns the opening. Interface arrives after the story.
 * Acts: Reality → Discovery → Revelation → Proof → Future.
 * Invisible cost first; EXECUTIA only after discovery.
 * No automatic page scrolling. Reduced-motion safe.
 */
(function () {
  'use strict';

  var STORY_TOTAL_MS = 32000;
  var FINALE_HOLD_MS = 3800;

  /* Chrome only after story — film is not a backdrop for a landing template. */
  var IDENTITY_MS = 999999;
  var HEADLINE_MS = 999999;
  var CTA_MS = 999999;
  var JOURNEY_MS = 999999;

  var FRAMES = [
    /* ACT 1 — REALITY */
    { start: 0, end: 0.04, text: 'Every organization loses', beat: 'world' },
    { start: 0.04, end: 0.07, text: 'time', beat: 'world' },
    { start: 0.07, end: 0.1, text: 'money', beat: 'world' },
    { start: 0.1, end: 0.13, text: 'trust', beat: 'world' },
    { start: 0.13, end: 0.16, text: 'energy', beat: 'world' },
    { start: 0.16, end: 0.19, text: 'opportunities', beat: 'world' },
    { start: 0.19, end: 0.22, text: 'every day.', beat: 'world' },
    { start: 0.22, end: 0.26, text: 'Most of these losses are invisible.', beat: 'world' },
    /* ACT 2 — DISCOVERY */
    { start: 0.26, end: 0.295, text: 'The losses are not random.', beat: 'problem' },
    { start: 0.295, end: 0.315, text: 'Projects fail.', beat: 'problem' },
    { start: 0.315, end: 0.335, text: 'Costs grow.', beat: 'problem' },
    { start: 0.335, end: 0.355, text: 'Deadlines slip.', beat: 'problem' },
    { start: 0.355, end: 0.375, text: 'Audits increase.', beat: 'problem' },
    { start: 0.375, end: 0.395, text: 'Rework repeats.', beat: 'problem' },
    { start: 0.395, end: 0.435, text: 'Not because people don\u2019t work.', beat: 'problem' },
    { start: 0.435, end: 0.48, text: 'Because execution itself is uncontrolled.', beat: 'problem' },
    { start: 0.48, end: 0.52, text: 'This is the invisible cost.', beat: 'problem' },
    /* ACT 3 — REVELATION (EXECUTIA only now) */
    { start: 0.52, end: 0.575, text: 'EXECUTIA\u2122', beat: 'brand' },
    { start: 0.575, end: 0.62, text: 'A new execution model.', beat: 'truth' },
    { start: 0.62, end: 0.66, text: 'The next possible execution standard.', beat: 'truth' },
    { start: 0.66, end: 0.72, text: 'Execution is verified before execution begins.', beat: 'truth' },
    /* ACT 4 — PROOF */
    { start: 0.72, end: 0.76, text: 'Execution Engine.', beat: 'truth' },
    { start: 0.76, end: 0.79, text: 'Verification.', beat: 'truth' },
    { start: 0.79, end: 0.82, text: 'Evidence.', beat: 'truth' },
    { start: 0.82, end: 0.86, text: 'Execution Truth.', beat: 'truth' },
    /* ACT 5 — FUTURE */
    { start: 0.86, end: 0.91, text: 'ENGINE — See the technology.', beat: 'future' },
    { start: 0.91, end: 0.955, text: 'ONE — Execution for organizations.', beat: 'future' },
    { start: 0.955, end: 1, text: 'LIFE — Execution for people.', beat: 'future', finale: true },
  ];

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function segment(progress, start, end) {
    return clamp01((progress - start) / (end - start));
  }

  function frameAt(progress) {
    for (var i = 0; i < FRAMES.length; i += 1) {
      if (progress < FRAMES[i].end || i === FRAMES.length - 1) return i;
    }
    return FRAMES.length - 1;
  }

  var STORY_HTML =
    '<div class="sf-doc" data-story-root>' +
    '<div class="sf-doc-letterbox sf-doc-letterbox--top" aria-hidden="true"></div>' +
    '<div class="sf-doc-letterbox sf-doc-letterbox--bot" aria-hidden="true"></div>' +
    '<div class="sf-doc-atmosphere" aria-hidden="true"></div>' +
    '<div class="sf-doc-veil" aria-hidden="true"></div>' +
    '<p class="sf-doc-line" data-line></p>' +
    '<p class="sf-doc-hold" data-hold hidden></p>' +
    '</div>';

  function setBeat(root, beat) {
    root.classList.remove(
      'sf-doc--world',
      'sf-doc--problem',
      'sf-doc--brand',
      'sf-doc--truth',
      'sf-doc--future',
      'sf-doc--name',
      'sf-doc--weight',
      'sf-doc--brand-mark',
    );
    if (beat) root.classList.add('sf-doc--' + beat);
  }

  function announce(live, text) {
    if (!live) return;
    live.textContent = text || '';
  }

  function applyProgress(root, progress, live) {
    var line = root.querySelector('[data-line]');
    var hold = root.querySelector('[data-hold]');
    var veil = root.querySelector('.sf-doc-veil');
    var frameIndex = frameAt(progress);
    var frame = FRAMES[frameIndex];
    var local = segment(progress, frame.start, frame.end);
    var fadeIn = segment(progress, frame.start, frame.start + 0.028);
    var fadeOut = frame.finale
      ? 1
      : 1 - segment(progress, frame.end - 0.028, frame.end);

    var opacity = Math.min(fadeIn, fadeOut) * (0.9 + 0.1 * Math.min(1, local * 2.4));
    var isSingle =
      frame.text === 'EXECUTIA\u2122' ||
      /^(time|money|trust|energy|opportunities|Verification\.?|Evidence\.?)$/i.test(frame.text);

    setBeat(root, frame.beat);
    root.classList.toggle('sf-doc--name', isSingle && !frame.finale);
    root.classList.toggle('sf-doc--weight', frame.beat === 'problem');
    root.classList.toggle('sf-doc--brand-mark', frame.beat === 'brand');

    if (frame.finale) {
      if (line) {
        line.hidden = true;
        line.textContent = '';
      }
      if (hold) {
        hold.hidden = false;
        hold.textContent = frame.text;
        hold.style.opacity = String(0.18 + fadeIn * 0.82);
        hold.style.transform =
          'translate3d(0,' + (12 * (1 - fadeIn)).toFixed(2) + 'px,0) scale(' +
          (0.985 + fadeIn * 0.015).toFixed(3) +
          ')';
      }
      if (veil) veil.style.opacity = String(0.12 + fadeIn * 0.2);
      root.classList.add('sf-doc--finale');
      announce(live, frame.text);
    } else {
      root.classList.remove('sf-doc--finale');
      if (hold) {
        hold.hidden = true;
        hold.textContent = '';
        hold.style.transform = '';
      }
      if (line) {
        line.hidden = false;
        line.textContent = frame.text;
        line.style.opacity = String(opacity);
        line.style.transform =
          'translate3d(0,' + (10 * (1 - fadeIn)).toFixed(2) + 'px,0) scale(' +
          (0.992 + fadeIn * 0.008).toFixed(3) +
          ')';
      }
      if (veil) veil.style.opacity = String(0.05 + frameIndex * 0.015);
      if (local < 0.2) announce(live, frame.text);
    }
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function setHeroPhase(hero, phase) {
    if (!hero) return;
    if (hero.getAttribute('data-hero-phase') === phase) return;
    hero.setAttribute('data-hero-phase', phase);
  }

  function mount(stage) {
    var hero = stage.closest('#hero') || stage.closest('.hp-hero');
    var host = stage.closest('#hero-story-film');
    var live = document.getElementById('hero-film-live');
    stage.innerHTML = STORY_HTML;
    var root = stage.querySelector('[data-story-root]');
    if (!root) return;

    if (host) host.classList.add('is-ready', 'is-cinematic', 'is-entry-v1');
    if (hero) {
      hero.classList.add('hp-hero--film-primary');
      setHeroPhase(hero, 'open');
      hero.setAttribute('data-hero-film', 'playing');
    }

    var playing = true;
    var finished = false;
    var elapsedMs = 0;
    var rafId = null;
    var lastTick = null;

    function syncHeroUi(absoluteMs) {
      if (!hero || finished) return;
      /* Intentionally delayed — film owns the first impression. */
      if (absoluteMs >= IDENTITY_MS) setHeroPhase(hero, 'identity');
      if (absoluteMs >= HEADLINE_MS) setHeroPhase(hero, 'headline');
      if (absoluteMs >= CTA_MS) setHeroPhase(hero, 'cta');
      if (absoluteMs >= JOURNEY_MS) setHeroPhase(hero, 'settle');
    }

    function render() {
      var progress = Math.min(1, elapsedMs / STORY_TOTAL_MS);
      applyProgress(root, finished ? 1 : progress, live);
    }

    function tick(now) {
      if (!playing || finished) return;
      if (lastTick === null) lastTick = now;
      elapsedMs += now - lastTick;
      lastTick = now;

      syncHeroUi(elapsedMs);

      if (elapsedMs >= STORY_TOTAL_MS) {
        elapsedMs = STORY_TOTAL_MS;
        finished = true;
        playing = false;
        if (hero) {
          setHeroPhase(hero, 'settle');
          hero.setAttribute('data-hero-film', 'finale');
          window.setTimeout(function () {
            if (hero.getAttribute('data-hero-film') === 'finale') {
              hero.setAttribute('data-hero-film', 'ready');
              setHeroPhase(hero, 'ready');
              var endLine = root.querySelector('[data-line]');
              var endHold = root.querySelector('[data-hold]');
              if (endLine) {
                endLine.style.opacity = '0';
                endLine.hidden = true;
              }
              if (endHold) endHold.style.opacity = '0';
              announce(live, 'LIFE — Execution for people.');
            }
          }, FINALE_HOLD_MS);
        }
      }
      render();
      if (playing && !finished) rafId = requestAnimationFrame(tick);
    }

    function startLoop() {
      lastTick = null;
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (playing && !finished) rafId = requestAnimationFrame(tick);
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        playing = false;
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      } else if (!finished) {
        playing = true;
        startLoop();
      }
    });

    root.style.opacity = '0';
    render();
    requestAnimationFrame(function () {
      root.style.transition = 'opacity 900ms cubic-bezier(0.22, 0.61, 0.36, 1)';
      root.style.opacity = '1';
      startLoop();
    });
  }

  function mountStatic(stage) {
    stage.innerHTML =
      '<div class="sf-doc sf-doc--finale sf-doc--future" data-story-root>' +
      '<div class="sf-doc-letterbox sf-doc-letterbox--top" aria-hidden="true"></div>' +
      '<div class="sf-doc-letterbox sf-doc-letterbox--bot" aria-hidden="true"></div>' +
      '<div class="sf-doc-atmosphere" aria-hidden="true"></div>' +
      '<div class="sf-doc-veil" aria-hidden="true"></div>' +
      '<p class="sf-doc-hold" data-hold>LIFE — Execution for people.</p>' +
      '</div>';
    var hero = stage.closest('#hero') || stage.closest('.hp-hero');
    if (hero) {
      hero.classList.add('hp-hero--film-primary');
      setHeroPhase(hero, 'ready');
      hero.setAttribute('data-hero-film', 'ready');
    }
    var host = stage.closest('#hero-story-film');
    if (host) host.classList.add('is-ready', 'is-static', 'is-cinematic', 'is-entry-v1');
    announce(document.getElementById('hero-film-live'), 'LIFE — Execution for people.');
  }

  function init() {
    var film = document.getElementById('hero-story-film');
    if (!film) return;
    var stage = film.querySelector('.hp-film-stage');
    if (!stage) return;

    if (prefersReducedMotion()) {
      mountStatic(stage);
      return;
    }

    var start = function () {
      mount(stage);
    };
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(start, { timeout: 500 });
    } else {
      window.setTimeout(start, 80);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
