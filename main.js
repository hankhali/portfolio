/* Hanieh Khaled — portfolio behaviour.
   Theme, scroll reveal, header state, scrollspy, cursor spotlight, card tilt,
   and the chapter-driven WebGL stage. */

(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* --- Theme ------------------------------------------------------------ */
  // Initial value is set by the inline script in <head> (dark by default).

  var toggle = document.getElementById('themeToggle');
  var scene = null;

  function currentTheme() { return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }

  function syncToggle() {
    var light = currentTheme() === 'light';
    toggle.setAttribute('aria-pressed', String(light));
    toggle.querySelector('.visually-hidden').textContent =
      light ? 'Switch to dark theme' : 'Switch to light theme';
  }

  if (toggle) {
    syncToggle();
    toggle.addEventListener('click', function () {
      var next = currentTheme() === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      syncToggle();
      if (scene) scene.setTheme(next);
    });
  }

  /* --- Fade, rise and un-blur on scroll --------------------------------- */

  var targets = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || reduceMotion) {
    targets.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    targets.forEach(function (el) { revealer.observe(el); });
  }

  /* --- Header hairline once scrolled ------------------------------------ */

  var header = document.getElementById('siteHeader');
  var sentinel = document.createElement('div');
  sentinel.setAttribute('aria-hidden', 'true');
  document.body.prepend(sentinel);
  new IntersectionObserver(function (entries) {
    header.setAttribute('data-scrolled', String(!entries[0].isIntersecting));
  }).observe(sentinel);

  /* --- Scrollspy -------------------------------------------------------- */

  var links = {};
  document.querySelectorAll('.site-nav a[href^="#"]').forEach(function (a) {
    links[a.getAttribute('href').slice(1)] = a;
  });
  var sections = Object.keys(links)
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);

  if (sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = links[entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* --- Cursor spotlight on glass surfaces ------------------------------- */
  // One delegated listener; each surface gets --mx/--my as percentages so the
  // CSS gradients follow the pointer. Skipped on touch devices.

  if (canHover && !reduceMotion) {
    var spotTargets = document.querySelectorAll('.glass');
    var pendingSpot = null;

    document.addEventListener('pointermove', function (e) {
      pendingSpot = e;
      if (spotRaf) return;
      spotRaf = requestAnimationFrame(applySpot);
    }, { passive: true });

    var spotRaf = 0;
    function applySpot() {
      spotRaf = 0;
      var e = pendingSpot; if (!e) return;
      spotTargets.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (e.clientX < r.left - 80 || e.clientX > r.right + 80 ||
            e.clientY < r.top - 80  || e.clientY > r.bottom + 80) return;
        el.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(2) + '%');
        el.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(2) + '%');
      });
    }
  }

  /* --- 3D tilt on cards ------------------------------------------------- */
  // Pointer position drives --rx/--ry; the CSS above turns those into a real
  // rotation inside the .tiles perspective. Pointer devices only.

  if (canHover && !reduceMotion) {
    document.querySelectorAll('[data-tilt]').forEach(function (card) {
      var raf = 0, last = null;

      function apply() {
        raf = 0;
        var r = card.getBoundingClientRect();
        var px = (last.clientX - r.left) / r.width;
        var py = (last.clientY - r.top) / r.height;
        card.style.setProperty('--ry', ((px - 0.5) * 8).toFixed(2) + 'deg');
        card.style.setProperty('--rx', ((0.5 - py) * 6).toFixed(2) + 'deg');
      }

      card.addEventListener('pointermove', function (e) {
        last = e;
        card.classList.add('is-tilting');
        if (!raf) raf = requestAnimationFrame(apply);
      }, { passive: true });
      card.addEventListener('pointerleave', function () {
        card.classList.remove('is-tilting');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* --- Story: chapters drive the stage --------------------------------- */
  // Whichever chapter crosses the middle of the viewport sets the stage's
  // state, caption and progress. Works without WebGL too — the caption still
  // narrates what each project's system looks like.

  var chapters = document.querySelectorAll('.chapter[data-state]');
  var captionEl = document.getElementById('stageCaption');
  var indexEl = document.getElementById('stageIndex');
  var stageText = captionEl ? captionEl.parentElement : null;
  var progress = document.getElementById('stageProgress');
  var activeState = 'sphere';
  var captionTimer = 0;

  function showChapter(el) {
    var state = el.getAttribute('data-state');
    var caption = el.getAttribute('data-caption') || '';
    var index = el.getAttribute('data-index') || '';
    if (scene && state !== activeState) scene.setState(state);
    activeState = state;

    if (progress) {
      progress.querySelectorAll('li').forEach(function (li) {
        li.classList.toggle('is-active', li.getAttribute('data-state') === state);
      });
    }
    if (stageText && captionEl.textContent !== caption) {
      stageText.classList.add('is-swapping');
      clearTimeout(captionTimer);
      captionTimer = setTimeout(function () {
        captionEl.textContent = caption;
        indexEl.textContent = index;
        stageText.classList.remove('is-swapping');
      }, 220);
    }
  }

  if (chapters.length && 'IntersectionObserver' in window) {
    var storySpy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting) showChapter(entry.target); });
    }, { rootMargin: '-42% 0px -42% 0px', threshold: 0 });
    chapters.forEach(function (c) { storySpy.observe(c); });
  }

  /* --- WebGL stage, loaded after first paint ---------------------------- */

  var stage = document.getElementById('heroStage');

  function webglAvailable() {
    try {
      var c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) { return false; }
  }

  function mountStage() {
    if (!stage || reduceMotion || !webglAvailable()) return;
    var conn = navigator.connection || {};
    if (conn.saveData) return;
    var lowPower = window.innerWidth < 700 || (conn.effectiveType && /2g|3g/.test(conn.effectiveType));

    import('./scene.js').then(function (mod) {
      scene = mod.mountScene(stage, { theme: currentTheme(), lowPower: lowPower, state: activeState });
    }).catch(function (err) {
      if (window.console) console.warn('3D stage unavailable:', err);
    });
  }

  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule);

  function schedule() {
    if ('requestIdleCallback' in window) requestIdleCallback(mountStage, { timeout: 1500 });
    else setTimeout(mountStage, 300);
  }
})();
