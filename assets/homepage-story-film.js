(function () {
  'use strict';

  var VIDEO_SRC = '/story-film/executia-story-silent.webm';
  var FALLBACK_MESSAGE =
    'Story film playback is unavailable. Refresh the page or continue to the next section.';

  /** Per-scene optical zoom — same 8×~10.8s timeline as exported webm; no story/timing change */
  var READABILITY_ZOOM = [
    { until: 10.8, scale: 3.55 },
    { until: 21.6, scale: 3.25 },
    { until: 30.5, scale: 3.85 },
    { until: 41.5, scale: 3.05 },
    { until: 52.5, scale: 4.35 },
    { until: 63.5, scale: 3.45 },
    { until: 74.5, scale: 3.75 },
    { until: Infinity, scale: 3.35 },
  ];

  function zoomForTime(seconds) {
    for (var i = 0; i < READABILITY_ZOOM.length; i++) {
      if (seconds < READABILITY_ZOOM[i].until) return READABILITY_ZOOM[i].scale;
    }
    return 3.35;
  }

  function applyReadabilityZoom(video) {
    if (!video || !Number.isFinite(video.currentTime)) return;
    var scale = zoomForTime(video.currentTime);
    video.style.transform = 'scale(' + scale + ')';
  }

  function formatStatus(video, finished) {
    if (finished) return 'Complete';
    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      return 'Loading…';
    }
    var remaining = Math.max(0, Math.ceil(video.duration - video.currentTime));
    return 'Playing · ' + remaining + 's';
  }

  function showFallback(player, video, message) {
    var fallback = player.querySelector('.hp-film-fallback');
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.hidden = true;
    }
    if (fallback) {
      fallback.hidden = false;
      fallback.textContent = message;
    }
    var playBtn = player.querySelector('[data-action="play"]');
    if (playBtn) {
      playBtn.disabled = true;
      playBtn.textContent = 'Unavailable';
    }
  }

  function tryPlay(video) {
    return video.play().catch(function () {
      return false;
    });
  }

  function mount(player) {
    var stage = player.querySelector('.hp-film-stage');
    var progressFill = player.querySelector('.hp-film-progress-fill');
    var statusEl = player.querySelector('.hp-film-status');
    var playBtn = player.querySelector('[data-action="play"]');
    if (!stage || !progressFill || !statusEl || !playBtn) return;

    var video = stage.querySelector('video');
    if (!video) {
      video = document.createElement('video');
      video.className = 'hp-film-video';
      video.setAttribute('playsinline', '');
      video.setAttribute('muted', '');
      video.setAttribute('autoplay', '');
      video.setAttribute('preload', 'auto');
      video.muted = true;
      video.playsInline = true;
      video.src = VIDEO_SRC;
      stage.insertBefore(video, stage.firstChild);
    }

    var hoverPaused = false;
    var finished = false;
    var failed = false;

    function updateProgress() {
      if (failed || !Number.isFinite(video.duration) || video.duration <= 0) {
        progressFill.style.width = '0%';
        return;
      }
      progressFill.style.width = Math.min(100, (video.currentTime / video.duration) * 100) + '%';
    }

    function renderControls() {
      if (failed) return;
      applyReadabilityZoom(video);
      updateProgress();
      statusEl.textContent = formatStatus(video, finished);
      playBtn.textContent = finished ? 'Replay' : video.paused ? 'Play' : 'Pause';
    }

    function markFinished() {
      finished = true;
      video.pause();
      renderControls();
    }

    function restart() {
      finished = false;
      video.currentTime = 0;
      tryPlay(video).then(function (ok) {
        if (ok === false) showFallback(player, video, FALLBACK_MESSAGE);
        renderControls();
      });
    }

    video.addEventListener('loadedmetadata', function () {
      applyReadabilityZoom(video);
      renderControls();
    });
    video.addEventListener('timeupdate', renderControls);
    video.addEventListener('seeked', function () {
      applyReadabilityZoom(video);
    });
    video.addEventListener('play', renderControls);
    video.addEventListener('pause', renderControls);
    video.addEventListener('ended', markFinished);
    video.addEventListener('error', function () {
      failed = true;
      showFallback(player, video, FALLBACK_MESSAGE);
    });

    playBtn.addEventListener('click', function () {
      if (failed) return;
      if (finished) {
        restart();
        return;
      }
      if (video.paused) {
        tryPlay(video).then(function (ok) {
          if (ok === false) showFallback(player, video, FALLBACK_MESSAGE);
          renderControls();
        });
      } else {
        video.pause();
        renderControls();
      }
    });

    player.addEventListener('mouseenter', function () {
      if (failed || finished) return;
      hoverPaused = true;
      if (!video.paused) video.pause();
    });

    player.addEventListener('mouseleave', function () {
      if (failed || finished) return;
      hoverPaused = false;
      tryPlay(video).then(function (ok) {
        if (ok === false) showFallback(player, video, FALLBACK_MESSAGE);
        renderControls();
      });
    });

    renderControls();
    tryPlay(video).then(function (ok) {
      if (ok === false) showFallback(player, video, FALLBACK_MESSAGE);
      renderControls();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var player = document.getElementById('story-film-player');
    if (player) mount(player);
  });
})();
