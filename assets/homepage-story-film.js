(function () {
  'use strict';

  var VIDEO_SRC = '/story-film/executia-story-silent.webm';
  var FALLBACK_MESSAGE =
    'Story film playback is unavailable. Refresh the page or continue to the next section.';

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

    video.addEventListener('loadedmetadata', renderControls);
    video.addEventListener('timeupdate', renderControls);
    video.addEventListener('seeked', renderControls);
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
