/* parts/learn.js — LEARN area behaviours (loaded on every page, so everything guards on element presence):
   reading-progress line, flight-plan TOC (open on desktop, closes after a jump on phones), scroll-spy for any
   [data-spy] link list, the guide-index topic filter. No motion is added: progress/spy are state, not animation. */
(function () {
  'use strict';
  var d = document, w = window;
  var RM = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* ---------- reading progress */
  var bar = d.querySelector('[data-read-progress]');
  var scope = d.querySelector('[data-read-scope]');
  if (bar && scope) {
    var ticking = false;
    var paint = function () {
      ticking = false;
      var r = scope.getBoundingClientRect(), vh = w.innerHeight;
      var total = r.height - vh * 0.5;
      var p = total > 0 ? clamp((vh * 0.35 - r.top) / total, 0, 1) : 0;
      bar.style.setProperty('--read', p.toFixed(4));
    };
    w.addEventListener('scroll', function () { if (!ticking) { ticking = true; w.requestAnimationFrame(paint); } }, { passive: true });
    w.addEventListener('resize', paint);
    paint();
  }

  /* ---------- TOC: open on desktop, collapsible on phones */
  var mq = w.matchMedia('(min-width: 1100px)');
  var tocs = $$('[data-toc]');
  var syncToc = function () { tocs.forEach(function (t) { if (mq.matches) t.open = true; else if (!t.hasAttribute('data-touched')) t.open = false; }); };
  if (tocs.length) {
    syncToc();
    if (mq.addEventListener) mq.addEventListener('change', syncToc); else if (mq.addListener) mq.addListener(syncToc);
    tocs.forEach(function (t) {
      t.addEventListener('toggle', function () { if (!mq.matches) t.setAttribute('data-touched', '1'); });
      t.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('a[href^="#"]'); if (a && !mq.matches) { t.open = false; } });
    });
  }

  /* ---------- scroll-spy: any [data-spy] list of #anchors marks the section in view */
  $$('[data-spy]').forEach(function (nav) {
    var links = $$('a[href^="#"]', nav);
    var targets = links.map(function (a) { var id = decodeURIComponent(a.getAttribute('href').slice(1)); return d.getElementById(id); });
    if (!links.length || !('IntersectionObserver' in w)) return;
    var horizontal = nav.hasAttribute('data-spy-x');
    var current = -1;
    var set = function (i) {
      if (i === current || i < 0) return;
      current = i;
      links.forEach(function (a, j) { var on = j === i; a.classList.toggle('is-active', on); if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
      var a = links[i];
      if (horizontal && nav.scrollWidth > nav.clientWidth) { nav.scrollTo({ left: a.offsetLeft - (nav.clientWidth - a.offsetWidth) / 2, behavior: RM ? 'auto' : 'smooth' }); }
      else if (!horizontal && nav.scrollHeight > nav.clientHeight + 4) {
        var top = a.offsetTop - nav.clientHeight / 2 + a.offsetHeight / 2;
        nav.scrollTo({ top: top, behavior: RM ? 'auto' : 'smooth' });
      }
    };
    // a sticky horizontal topic bar steps aside once the last topic has scrolled past (it never covers the closing CTA)
    var dock = horizontal ? nav.closest('.learn-jump') : null;
    var last = targets[targets.length - 1];
    if (dock && last) {
      var tick = false;
      var check = function () { tick = false; var done = last.getBoundingClientRect().bottom < dock.getBoundingClientRect().bottom + 24; dock.classList.toggle('is-done', done); };
      w.addEventListener('scroll', function () { if (!tick) { tick = true; w.requestAnimationFrame(check); } }, { passive: true });
      check();
    }
    var visible = targets.map(function () { return false; });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { var i = targets.indexOf(e.target); if (i >= 0) visible[i] = e.isIntersecting; });
      var first = visible.indexOf(true);
      if (first >= 0) set(first);
    }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });
    targets.forEach(function (t) { if (t) io.observe(t); });
  });

  /* ---------- guide index filter (no JS: every guide is listed and the chips stay hidden) */
  $$('[data-filter]').forEach(function (bar) {
    var list = d.getElementById(bar.getAttribute('data-filter'));
    if (!list) return;
    var btns = $$('[data-filter-key]', bar);
    var items = $$('[data-group]', list);
    var count = d.querySelector('[data-filter-count]');
    bar.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-filter-key]');
      if (!b) return;
      var k = b.getAttribute('data-filter-key');
      btns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      var n = 0;
      items.forEach(function (it) { var on = k === 'all' || it.getAttribute('data-group') === k; it.hidden = !on; if (on) n++; });
      list.classList.add('is-in');
      if (count) count.textContent = n + (n === 1 ? ' guide' : ' guides');
    });
  });
})();
