/**
 * EXECUTIA — v3 script.js
 */
(function () {
  'use strict';

  /* ── Background canvas ─────────────────────────
     Subtle animated network of nodes and edges
  ────────────────────────────────────────────── */
  function initCanvas() {
    const canvas = document.getElementById('bgCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let W, H, nodes = [], animId;
    const NODE_COUNT = 60;
    const MAX_DIST   = 160;
    const COLOR      = '79,124,255';

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }

    function createNodes() {
      nodes = [];
      for (let i = 0; i < NODE_COUNT; i++) {
        nodes.push({
          x:  Math.random() * W,
          y:  Math.random() * H,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          r:  Math.random() * 1.5 + 0.5,
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Move
      nodes.forEach(n => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
      });

      // Edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d  = Math.sqrt(dx*dx + dy*dy);
          if (d < MAX_DIST) {
            const alpha = (1 - d / MAX_DIST) * 0.3;
            ctx.strokeStyle = `rgba(${COLOR},${alpha})`;
            ctx.lineWidth   = 0.5;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Nodes
      nodes.forEach(n => {
        ctx.fillStyle = `rgba(${COLOR},0.5)`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    }

    resize();
    createNodes();
    draw();

    window.addEventListener('resize', () => {
      resize();
      createNodes();
    }, { passive: true });
  }


  /* ── Nav scroll ────────────────────────────────── */
  function initNav() {
    const nav = document.getElementById('nav');
    if (!nav) return;
    let tick = false;
    window.addEventListener('scroll', () => {
      if (!tick) {
        requestAnimationFrame(() => {
          nav.classList.toggle('scrolled', window.scrollY > 20);
          tick = false;
        });
        tick = true;
      }
    }, { passive: true });
  }


  /* ── Hamburger ─────────────────────────────────── */
  function initHamburger() {
    const btn    = document.querySelector('.nav-burger');
    const drawer = document.getElementById('navMobile');
    if (!btn || !drawer) return;
    let open = false;

    const toggle = () => {
      open = !open;
      btn.setAttribute('aria-expanded', open);
      drawer.setAttribute('aria-hidden', !open);
      drawer.classList.toggle('open', open);
      const [s1, s2] = btn.querySelectorAll('span');
      s1.style.transform = open ? 'translateY(6px) rotate(45deg)'  : '';
      s2.style.transform = open ? 'translateY(-6px) rotate(-45deg)' : '';
    };

    btn.addEventListener('click', toggle);
    drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', () => open && toggle()));
    document.addEventListener('click', e => {
      if (open && !btn.contains(e.target) && !drawer.contains(e.target)) toggle();
    });
  }


  /* ── Smooth scroll (offset for nav) ───────────── */
  function initAnchors() {
    const NAV_H = 64;
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const id = a.getAttribute('href').slice(1);
        if (!id) return;
        const target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        window.scrollTo({
          top: target.getBoundingClientRect().top + window.scrollY - NAV_H - 8,
          behavior: 'smooth',
        });
      });
    });
  }


  /* ── Scroll reveal ─────────────────────────────── */
  function initReveal() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
      return;
    }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
  }


  /* ── Simulation toggle ─────────────────────────── */
  function initSimulation() {
    const btnWithout = document.getElementById('btnWithout');
    const btnWith    = document.getElementById('btnWith');
    const scenWithout = document.getElementById('scenWithout');
    const scenWith    = document.getElementById('scenWith');
    if (!btnWithout || !btnWith || !scenWithout || !scenWith) return;

    const show = (mode) => {
      if (mode === 'without') {
        btnWithout.classList.add('active');
        btnWith.classList.remove('active');
        scenWithout.classList.remove('hidden');
        scenWith.classList.add('hidden');
      } else {
        btnWith.classList.add('active');
        btnWithout.classList.remove('active');
        scenWith.classList.remove('hidden');
        scenWithout.classList.add('hidden');
      }
    };

    btnWithout.addEventListener('click', () => show('without'));
    btnWith.addEventListener('click',    () => show('with'));
  }


  /* ── Contact form ──────────────────────────────── */
  function initForm() {
    const form = document.getElementById('contactForm');
    const btn  = document.getElementById('formBtn');
    const ok   = document.getElementById('formOk');
    const err  = document.getElementById('formErr');
    if (!form) return;

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }

      btn.disabled = true;
      btn.textContent = 'Sending…';
      ok.hidden = true;
      err.hidden = true;

      try {
        const res = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { 'Accept': 'application/json' },
        });

        if (res.ok) {
          form.reset();
          ok.hidden = false;
          ok.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
          err.hidden = false;
        }
      } catch {
        err.hidden = false;
      } finally {
        btn.disabled = false;
        btn.textContent = 'Send Request';
      }
    });
  }


  /* ── Mouse glow on cards ──────────────────────── */
  function initCardGlow() {
    const cards = document.querySelectorAll('.crisis-card, .principle-card, .arch-card, .uc-card');
    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width  * 100).toFixed(1);
        const y = ((e.clientY - r.top)  / r.height * 100).toFixed(1);
        card.style.setProperty('--mx', x + '%');
        card.style.setProperty('--my', y + '%');
      });
    });
  }

  /* ── Init ──────────────────────────────────────── */
  function init() {
    initCanvas();
    initNav();
    initHamburger();
    initAnchors();
    initReveal();
    initSimulation();
    initForm();
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

})();
