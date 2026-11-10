/* parts/new.js — NEW PAGES behaviours: video pause labels, launch-sequence progress, mission-clock needle, the week
   orbit (today's deal), the terpene finder, copy buttons, the accessibility readout. Loaded on every page, so every
   block guards on element presence. Honours prefers-reduced-motion (no JS motion when it is set). */
(function () {
  'use strict';
  var d = document, w = window;
  var RM = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = w.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* ---------- hero video pause button: visible label follows the real state; a user pause stays paused
     (site.js resumes background videos when they scroll back into view) */
  $$('[data-new-vidbtn]').forEach(function (b) {
    var v = $(b.getAttribute('data-video-toggle')); if (!v) return;
    var t = $('.new-vidbtn__txt', b);
    function sync() {
      var paused = v.paused;
      b.setAttribute('aria-pressed', paused ? 'true' : 'false');
      b.setAttribute('aria-label', paused ? 'Play background video' : 'Pause background video');
      if (t) t.textContent = paused ? 'Play video' : 'Pause video';
    }
    // runs after site.js's toggle on the same click; v.paused is already updated synchronously by play()/pause()
    b.addEventListener('click', function () { if (v.paused) v.setAttribute('data-user-paused', '1'); else v.removeAttribute('data-user-paused'); sync(); });
    v.addEventListener('play', function () { if (v.getAttribute('data-user-paused') === '1') v.pause(); sync(); });
    v.addEventListener('pause', sync);
    sync();
  });

  /* ---------- launch sequence: the trajectory fills and the stages light as the section crosses the viewport */
  $$('[data-launch]').forEach(function (el) {
    var steps = $$('[data-launch-step]', el), n = steps.length || 1;
    if (RM) { el.style.setProperty('--p', '1'); steps.forEach(function (s) { s.classList.add('is-lit'); }); el.classList.add('is-launched'); return; }
    el.setAttribute('data-armed', '');
    var queued = false;
    function upd() {
      queued = false;
      var r = el.getBoundingClientRect(), vh = w.innerHeight;
      var p = clamp((vh * 0.82 - r.top) / Math.max(1, r.height * 0.85), 0, 1);
      el.style.setProperty('--p', p.toFixed(3));
      steps.forEach(function (s, i) { s.classList.toggle('is-lit', p >= (i + 0.4) / n); });
      el.classList.toggle('is-launched', p >= 0.97);
    }
    w.addEventListener('scroll', function () { if (!queued) { queued = true; requestAnimationFrame(upd); } }, { passive: true });
    w.addEventListener('resize', upd, { passive: true });
    upd();
  });

  /* ---------- mission clock: the 24-hour needle follows New York time */
  var hands = $$('[data-clock-hand]');
  if (hands.length) {
    var setHand = function () {
      try {
        var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
        var o = {}; parts.forEach(function (x) { o[x.type] = x.value; });
        var h = (+o.hour % 24) + (+o.minute) / 60;
        hands.forEach(function (el) { el.style.transform = 'rotate(' + (h / 24 * 360).toFixed(2) + 'deg)'; el.classList.add('is-on'); });
      } catch (e) {}
    };
    setHand(); setInterval(setHand, 30000);
  }

  /* ---------- the week in orbit: today's deal fills the core (site.js has already marked .is-today) */
  var rows = $$('[data-day-row]');
  if (rows.length) {
    var dial = $('[data-dial]');
    var nodes = $$('[data-dial-node]');
    var info = function (row) { var nm = $('[data-day-name]', row), sm = $('small', row); return { name: nm ? nm.textContent : '', cat: sm ? sm.textContent : '' }; };
    var put = function (scope, row) { var x = info(row); $$('[data-dial-name]', scope).forEach(function (e) { e.textContent = x.name; }); $$('[data-dial-cat]', scope).forEach(function (e) { e.textContent = x.cat; }); };
    var today = rows.filter(function (r) { return r.classList.contains('is-today'); })[0];
    if (today) {
      put(d, today);
      var tn = nodes[+today.getAttribute('data-day-row')];
      if (dial && tn) { dial.style.setProperty('--ta', tn.style.getPropertyValue('--a')); dial.classList.add('has-today'); }
    }
    var restore = function () { if (today && dial) put(dial, today); };
    nodes.forEach(function (nd, i) {
      var row = rows[i]; if (!row) return;
      nd.addEventListener('mouseenter', function () { row.classList.add('is-hot'); if (dial) put(dial, row); });
      nd.addEventListener('mouseleave', function () { row.classList.remove('is-hot'); restore(); });
      row.addEventListener('mouseenter', function () { nd.classList.add('is-hot'); if (dial) put(dial, row); });
      row.addEventListener('mouseleave', function () { nd.classList.remove('is-hot'); restore(); });
    });
  }

  /* ---------- terpene finder: a feeling filters the eight profiles (without JS every profile is shown) */
  $$('[data-finder]').forEach(function (box) {
    var chips = $$('[data-feel]', box), cards = $$('[data-terp]', box), out = $('[data-finder-count]', box);
    function layout(shown) {
      cards.forEach(function (c) { c.classList.remove('is-wide'); });
      if (shown.length % 2 === 1) shown[shown.length - 1].classList.add('is-wide');
    }
    function pick(btn) {
      var id = btn.getAttribute('data-feel');
      chips.forEach(function (c) { var on = c === btn; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      var shown = [];
      cards.forEach(function (c) {
        var ok = id === 'all' || (' ' + (c.getAttribute('data-feels') || '') + ' ').indexOf(' ' + id + ' ') >= 0;
        c.hidden = !ok; c.classList.remove('is-pop');
        if (ok) { shown.push(c); if (!RM) { void c.offsetWidth; c.classList.add('is-pop'); } }
      });
      layout(shown);
      if (out) out.textContent = id === 'all' ? 'Showing all ' + cards.length + ' terpenes' : shown.length + (shown.length === 1 ? ' terpene matches ' : ' terpenes match ') + btn.textContent.trim();
    }
    chips.forEach(function (c) { c.addEventListener('click', function () { pick(c); }); });
    box.classList.add('is-live');
  });

  /* ---------- copy buttons (press): shown only where the clipboard API is available */
  $$('[data-copy],[data-copy-text]').forEach(function (b) {
    if (!(navigator.clipboard && w.isSecureContext)) return;
    b.hidden = false;
    var lbl = $('[data-copy-label]', b), orig = lbl ? lbl.textContent : '';
    b.addEventListener('click', function () {
      var t = b.getAttribute('data-copy-text');
      if (t == null) { var src = $(b.getAttribute('data-copy')); t = src ? src.innerText.replace(/\n{3,}/g, '\n\n').trim() : ''; }
      navigator.clipboard.writeText(t).then(function () {
        b.classList.add('is-done'); if (lbl) lbl.textContent = 'Copied';
        setTimeout(function () { b.classList.remove('is-done'); if (lbl) lbl.textContent = orig; }, 1800);
      }, function () {});
    });
  });

  /* ---------- accessibility page: read two device settings and say how the site responds */
  var mo = $('[data-a11y-motion]');
  if (mo) {
    var mn = $('[data-a11y-motion-note]'), po = $('[data-a11y-pointer]'), pn = $('[data-a11y-pointer-note]');
    mo.textContent = RM ? 'Reduced motion is on' : 'Full motion';
    if (mn) mn.textContent = RM ? 'Animations, scroll effects and the moving starfield are switched off, and background videos stay paused.' : 'Animations are on. Turn on “reduce motion” in your device settings and this site switches them off.';
    if (po) po.textContent = FINE ? 'Mouse or trackpad' : 'Touch';
    if (pn) pn.textContent = FINE && !RM ? 'Cards tilt gently toward your pointer and some buttons lean toward it.' : FINE ? 'Tilt and magnetic hover effects are off because reduced motion is on.' : 'Tilt and magnetic hover effects are off, so nothing moves under your finger.';
  }
})();
