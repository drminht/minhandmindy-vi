/* Minh & Mindy: opening curtain sequence, Q&A accordions, off-screen animation pausing. */
(function () {
  'use strict';
  var root = document.documentElement;

  /* ---------- opening (prototype: 3030:101 -> tap -> 3032:175 -> 0.3s -> 3032:241) ---------- */
  function finishOpening() {
    root.classList.remove('is-opening', 'step-1', 'step-2');
  }
  if (root.classList.contains('is-opening')) {
    window.scrollTo(0, 0);
    var started = false;
    var hero = document.getElementById('hero');
    var tap = document.getElementById('tap');
    var start = function (e) {
      if (started) return;
      started = true;
      if (e) e.preventDefault();
      root.classList.add('step-1');                      // 1.2s smart animate
      setTimeout(function () {
        root.classList.add('step-2');                    // AFTER_TIMEOUT 0.3s, then 2s smart animate
        setTimeout(finishOpening, 2050);
      }, 1200 + 300);
    };
    hero.addEventListener('click', start);
    tap.addEventListener('click', start);
    document.addEventListener('keydown', function (e) {
      if (!started && (e.key === 'Enter' || e.key === ' ')) start(e);
    });
  }

  /* ---------- Q&A accordions (Frame 102 <-> Frame 101, smart animate ~0.3s) ---------- */
  var qs = document.querySelectorAll('.qa-q');
  Array.prototype.forEach.call(qs, function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      btn.closest('.qa-item').classList.toggle('open', open);
    });
  });

  /* ---------- MAP unroll: play once when scrolled into view ---------- */
  var map = document.getElementById('map');
  if (map) {
    if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      var mo = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { map.classList.add('play'); mo.disconnect(); }
        });
      }, { threshold: 0.35 });
      mo.observe(map);
    } else {
      map.classList.add('play');
    }
  }

  /* ---------- pause looping sprites while off-screen ---------- */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        en.target.querySelectorAll('[class*="anim-"]').forEach(function (el) {
          el.classList.toggle('paused', !en.isIntersecting);
        });
      });
    }, { rootMargin: '200px 0px' });
    document.querySelectorAll('section.art').forEach(function (s) { io.observe(s); });
  }
})();
