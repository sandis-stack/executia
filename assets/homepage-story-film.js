(function () {
  'use strict';

  var STORY_SCENES = [
    { id: 'hidden', label: 'Hidden Layer', durationMs: 14000 },
    { id: 'cost', label: 'Business Cost', durationMs: 14000 },
    { id: 'invisible', label: 'Visibility', durationMs: 14000 },
    { id: 'executia', label: 'EXECUTIA', durationMs: 16000 }
  ];

  var STORY_TOTAL_MS = STORY_SCENES.reduce(function (sum, s) { return sum + s.durationMs; }, 0);
  var STORY_FADE_MS = 700;

  var SCENE_HTML = {
    hidden:
      '<div class="hp-film-scene hidden-layer" data-scene="hidden">' +
      '<p style="font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#124155;margin:0 0 1.5rem">Inside execution</p>' +
      '<div style="max-width:28rem;width:100%">' +
      '<div style="border-radius:1rem;border:1px solid #a7f3d0;background:rgba(236,253,245,0.5);padding:1.25rem;margin-bottom:1rem"><p style="margin:0;font-size:14px;font-weight:500;color:#047857">Surface view — all green</p></div>' +
      '<ul style="list-style:none;margin:0;padding:0;display:grid;gap:0.625rem">' +
      ['Approval waiting', 'Owner missing', 'Evidence incomplete', 'Duplicate work', 'Manual coordination'].map(function (leak) {
        return '<li style="display:flex;align-items:center;gap:0.75rem;border-radius:0.5rem;background:rgba(255,255,255,0.8);padding:0.625rem 1rem;border:1px solid #fecaca">' +
          '<span style="width:8px;height:8px;border-radius:50%;background:#fbbf24"></span>' +
          '<span style="font-size:14px;font-weight:500;color:#334155">' + leak + '</span></li>';
      }).join('') +
      '</ul></div>' +
      '<p style="margin:2.5rem 0 0;font-size:16px;font-weight:500;color:#475569">Nobody sees it.</p></div>',

    cost:
      '<div class="hp-film-scene cost-layer" data-scene="cost">' +
      '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:1rem;max-width:32rem;width:100%">' +
      [
        { label: 'Calendar', sub: 'Weeks pass' },
        { label: 'Meetings', sub: 'Increase' },
        { label: 'Emails', sub: 'Increase' },
        { label: 'Projects', sub: 'Slow' }
      ].map(function (item) {
        return '<div style="border-radius:0.75rem;border:1px solid #e2e8f0;background:#fff;padding:1.25rem;box-shadow:0 1px 3px rgba(0,0,0,0.04)">' +
          '<p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8">' + item.label + '</p>' +
          '<p style="margin:0.5rem 0 0;font-size:18px;font-weight:600;color:#1e293b">' + item.sub + '</p></div>';
      }).join('') +
      '</div>' +
      '<div style="margin-top:2rem;text-align:center">' +
      '<p style="margin:0;font-size:16px;color:#475569">Customers wait. Costs rise.</p>' +
      '<p style="margin:0.5rem 0 0;font-size:18px;font-weight:600;color:#0f172a">No one knows why.</p></div></div>',

    invisible:
      '<div class="hp-film-scene invisible-layer" data-scene="invisible">' +
      '<p style="max-width:42rem;margin:0;font-size:clamp(1.5rem,3vw,2.25rem);font-weight:600;line-height:1.25;color:#0f172a">Organizations rarely fail because people stop working.</p>' +
      '<div style="width:4rem;height:1px;background:#e2e8f0;margin:2rem 0" aria-hidden></div>' +
      '<p style="max-width:42rem;margin:0;font-size:clamp(1.5rem,3vw,2.25rem);font-weight:600;line-height:1.25;color:#BAE6FD">They fail because execution becomes invisible.</p></div>',

    executia:
      '<div class="hp-film-scene executia-layer" data-scene="executia">' +
      '<p style="margin:0 0 0.5rem;font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#124155">EXECUTIA</p>' +
      '<p style="margin:0 0 2rem;font-size:18px;font-weight:500;color:#475569">An execution layer — not software on a slide.</p>' +
      '<ol style="list-style:none;margin:0;padding:0;display:grid;gap:0.5rem;text-align:left;max-width:14rem">' +
      ['Mission', 'Decision', 'Project', 'Task', 'Evidence', 'Outcome'].map(function (node) {
        return '<li style="border:1px solid #cbd5e1;border-radius:0.5rem;padding:0.5rem 1rem;font-size:14px;font-weight:600;color:#124155;background:#fff">' + node + '</li>';
      }).join('') +
      '</ol>' +
      '<p style="margin:1.5rem 0 0;font-size:14px;color:#64748b">Every object becomes visible.</p></div>'
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

  function activeSceneIndex(elapsedMs, starts) {
    for (var i = 0; i < starts.length; i += 1) {
      var end = starts[i] + STORY_SCENES[i].durationMs;
      if (elapsedMs >= starts[i] && elapsedMs < end) return i;
    }
    return STORY_SCENES.length - 1;
  }

  function mount(player) {
    var starts = sceneStarts();
    var stage = player.querySelector('.hp-film-stage');
    var progressFill = player.querySelector('.hp-film-progress-fill');
    var statusEl = player.querySelector('.hp-film-status');
    var playBtn = player.querySelector('[data-action="play"]');

    STORY_SCENES.forEach(function (scene) {
      stage.insertAdjacentHTML('beforeend', SCENE_HTML[scene.id]);
    });

    var sceneEls = stage.querySelectorAll('.hp-film-scene');
    sceneEls.forEach(function (el) { el.style.opacity = '0'; });

    var playing = true;
    var hoverPaused = false;
    var finished = false;
    var elapsedMs = 0;
    var rafId = null;
    var lastTick = null;

    function effectivePlaying() {
      return playing && !hoverPaused && !finished;
    }

    function render() {
      var overall = Math.min(1, elapsedMs / STORY_TOTAL_MS);
      progressFill.style.width = (overall * 100) + '%';

      if (finished) {
        sceneEls.forEach(function (el, i) {
          el.style.opacity = i === STORY_SCENES.length - 1 ? '1' : '0';
        });
        statusEl.textContent = 'Complete';
        playBtn.textContent = 'Replay';
        return;
      }

      var idx = activeSceneIndex(elapsedMs, starts);
      sceneEls.forEach(function (el, i) {
        var opacity = sceneOpacity(i, elapsedMs, starts);
        el.style.opacity = opacity < 0.01 ? '0' : String(opacity);
        el.style.pointerEvents = opacity < 0.2 ? 'none' : 'auto';
      });
      statusEl.textContent = (STORY_SCENES[idx] && STORY_SCENES[idx].label) + ' · ' + Math.round(STORY_TOTAL_MS / 1000) + 's';
      playBtn.textContent = effectivePlaying() ? 'Pause' : 'Play';
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

    playBtn.addEventListener('click', function () {
      if (finished) {
        elapsedMs = 0;
        finished = false;
        playing = true;
        startLoop();
        return;
      }
      playing = !playing;
      if (playing) startLoop();
      else render();
    });

    player.addEventListener('mouseenter', function () { hoverPaused = true; });
    player.addEventListener('mouseleave', function () {
      hoverPaused = false;
      if (effectivePlaying()) startLoop();
    });

    render();
    startLoop();
  }

  document.addEventListener('DOMContentLoaded', function () {
    var player = document.getElementById('story-film-player');
    if (player) mount(player);
  });
})();
