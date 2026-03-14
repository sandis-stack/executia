/**
 * EXECUTIA — Execution Integrity Infrastructure
 * script.js — Production-ready, vanilla JS, no dependencies
 */

(function () {
  'use strict';

  /* ════════════════════════════════════════════════
     1. SCROLL REVEAL
     Observes [data-sr] elements, adds .sr-visible
     when they enter the viewport.
  ════════════════════════════════════════════════ */
  const SR_TARGETS = [
    '.hero__eyebrow',
    '.hero__headline',
    '.hero__pipeline',
    '.hero__thesis',
    '.section__title',
    '.section__lead',
    '.chain__step',
    '.arch__layer',
    '.stat',
    '.principle',
    '.usecase__step',
    '.protocol__left',
    '.protocol__right',
    '.contact__headline',
    '.contact__sub',
    '.contact__action',
  ];

  function initScrollReveal() {
    if (!('IntersectionObserver' in window)) {
      // Fallback: show all immediately
      document.querySelectorAll('[data-sr]').forEach(el => el.classList.add('sr-visible'));
      return;
    }

    // Tag elements
    document.querySelectorAll(SR_TARGETS.join(',')).forEach((el) => {
      if (el.hasAttribute('data-sr')) return;
      el.setAttribute('data-sr', '');

      // Stagger siblings
      const siblings = Array.from(
        el.parentElement.children
      ).filter(c => c.matches(SR_TARGETS.join(',')));

      const idx = siblings.indexOf(el);
      if (idx >= 1 && idx <= 4) {
        el.setAttribute('data-sr-delay', String(idx));
      }
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('sr-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -32px 0px',
      }
    );

    document.querySelectorAll('[data-sr]').forEach((el) => observer.observe(el));
  }


  /* ════════════════════════════════════════════════
     2. STICKY NAV — shadow on scroll
  ════════════════════════════════════════════════ */
  function initNav() {
    const nav = document.getElementById('nav');
    if (!nav) return;

    let ticking = false;

    const update = () => {
      if (window.scrollY > 10) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
  }


  /* ════════════════════════════════════════════════
     3. MOBILE HAMBURGER
  ════════════════════════════════════════════════ */
  function initHamburger() {
    const btn    = document.querySelector('.nav__hamburger');
    const drawer = document.getElementById('mobileDrawer');
    if (!btn || !drawer) return;

    let open = false;

    const toggle = () => {
      open = !open;
      btn.setAttribute('aria-expanded', String(open));
      drawer.setAttribute('aria-hidden', String(!open));
      drawer.classList.toggle('open', open);

      // Animate bars
      const bars = btn.querySelectorAll('span');
      if (open) {
        bars[0].style.transform = 'translateY(6px) rotate(45deg)';
        bars[1].style.transform = 'translateY(-6px) rotate(-45deg)';
      } else {
        bars[0].style.transform = '';
        bars[1].style.transform = '';
      }
    };

    btn.addEventListener('click', toggle);

    // Close on link click
    drawer.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => { if (open) toggle(); });
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (open && !btn.contains(e.target) && !drawer.contains(e.target)) {
        toggle();
      }
    });
  }


  /* ════════════════════════════════════════════════
     4. MODAL — Protocol download
  ════════════════════════════════════════════════ */
  function initModal() {
    const trigger = document.getElementById('downloadBtn');
    const overlay = document.getElementById('modal');
    const closeBtn = document.getElementById('modalClose');

    if (!trigger || !overlay || !closeBtn) return;

    const open = () => {
      overlay.hidden = false;
      // Trigger transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          overlay.style.opacity = '1';
        });
      });
      overlay.querySelector('.modal').focus?.();
      document.body.style.overflow = 'hidden';
    };

    const close = () => {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.hidden = true;
        document.body.style.overflow = '';
      }, 260);
    };

    trigger.addEventListener('click', open);
    closeBtn.addEventListener('click', close);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !overlay.hidden) close();
    });
  }


  /* ════════════════════════════════════════════════
     5. STAT ENTRANCE — subtle scale-in on first view
  ════════════════════════════════════════════════ */
  function initStats() {
    if (!('IntersectionObserver' in window)) return;

    const stats = document.querySelectorAll('.stat__figure');

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          el.style.transition = 'opacity 0.5s ease 0.1s, transform 0.5s ease 0.1s';
          el.style.opacity    = '0';
          el.style.transform  = 'translateY(10px)';

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              el.style.opacity   = '1';
              el.style.transform = 'none';
            });
          });

          obs.unobserve(el);
        });
      },
      { threshold: 0.6 }
    );

    stats.forEach((s) => obs.observe(s));
  }


  /* ════════════════════════════════════════════════
     6. SMOOTH ANCHOR SCROLL (accounts for sticky nav)
  ════════════════════════════════════════════════ */
  function initAnchors() {
    const NAV_H = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--nav-h') || '58',
      10
    );

    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const id = link.getAttribute('href').slice(1);
        if (!id) return;
        const target = document.getElementById(id);
        if (!target) return;

        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - NAV_H - 8;
        window.scrollTo({ top, behavior: 'smooth' });
      });
    });
  }


  /* ════════════════════════════════════════════════
     INIT
  ════════════════════════════════════════════════ */
  function init() {
    initScrollReveal();
    initNav();
    initHamburger();
    initModal();
    initStats();
    initAnchors();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
