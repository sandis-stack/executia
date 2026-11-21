/**
 * BACKLOG-576 N2 — show /pilot film only when data-film-src is non-empty.
 * Empty slot stays hidden with zero visible text.
 */
(function () {
  function activateFilmSlot(section) {
    if (!section || section.dataset.filmActivated === '1') return;
    var src = String(section.getAttribute('data-film-src') || '').trim();
    if (!src) {
      section.hidden = true;
      return;
    }
    var video = section.querySelector('video');
    if (!video) return;
    video.setAttribute('src', src);
    video.setAttribute('controls', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('preload', 'metadata');
    video.removeAttribute('autoplay');
    section.hidden = false;
    section.dataset.filmActivated = '1';
  }

  function boot() {
    document.querySelectorAll('section.pf-film[data-film-src]').forEach(activateFilmSlot);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
