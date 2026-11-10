/* parts/home.js — homepage behaviours: cargo-bay tabs (lazy live carousels), ring marquee under reduced motion,
   orbit <-> manifest hover link, hero altitude readout. Guards on element presence (loaded on every page). */
(function () {
  'use strict';
  var d = document, w = window;
  var RM = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // reduced motion: stop the SMIL ring marquee
  if (RM) Array.prototype.forEach.call(d.querySelectorAll('[data-smil]'), function (a) { a.parentNode.removeChild(a); });

  // tabs with lazily injected Dutchie carousel embeds (a hidden embed would size itself to 0)
  Array.prototype.forEach.call(d.querySelectorAll('[data-tabs]'), function (box) {
    var tabs = Array.prototype.slice.call(box.querySelectorAll('[data-tab]'));
    var panels = Array.prototype.slice.call(box.querySelectorAll('[data-panel]'));
    function boot(panel) {
      if (panel.getAttribute('data-booted')) return;
      panel.setAttribute('data-booted', '1');
      var tpl = panel.querySelector('template[data-embed]');
      var screen = panel.querySelector('.bay__screen');
      if (!tpl || !screen) return;
      var frag = d.createElement('div');
      frag.innerHTML = tpl.innerHTML;
      var holder = frag.firstElementChild;
      var old = holder.querySelector('script');
      var s = d.createElement('script');
      s.async = true; s.id = old.id; s.src = old.getAttribute('src');
      holder.removeChild(old); holder.appendChild(s);
      screen.insertBefore(holder, screen.firstChild);
      if ('MutationObserver' in w) { var mo = new MutationObserver(function () { if (holder.querySelector('iframe')) { panel.classList.add('is-live'); mo.disconnect(); } }); mo.observe(holder, { childList: true, subtree: true }); }
    }
    function select(i, focus) {
      tabs.forEach(function (t, j) { var on = i === j; t.classList.toggle('is-on', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; });
      panels.forEach(function (p, j) { p.hidden = i !== j; });
      boot(panels[i]); if (focus) tabs[i].focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i); });
      t.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); select((i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length, true); } });
    });
    if ('IntersectionObserver' in w) { var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { boot(panels[0]); io.disconnect(); } }, { rootMargin: '400px' }); io.observe(box); } else boot(panels[0]);
  });

  // orbit planet <-> manifest row highlight
  var rows = Array.prototype.slice.call(d.querySelectorAll('.manifest__row'));
  rows.forEach(function (r) {
    var cat = r.getAttribute('data-cat'), item = d.querySelector('.orbit__item[data-cat="' + cat + '"]');
    if (!item) return;
    var on = function () { item.classList.add('is-hot'); }, off = function () { item.classList.remove('is-hot'); };
    r.addEventListener('mouseenter', on); r.addEventListener('mouseleave', off); r.addEventListener('focus', on); r.addEventListener('blur', off);
    item.addEventListener('mouseenter', function () { r.classList.add('is-hot'); }); item.addEventListener('mouseleave', function () { r.classList.remove('is-hot'); });
  });

  // radar labels never stack: nearest-first, each label flips side, then nudges up/down, else waits for hover
  var radar = d.querySelector('[data-radar]');
  function declutter() {
    if (!radar) return;
    var nodes = Array.prototype.slice.call(radar.querySelectorAll('.radar__node'));
    nodes.forEach(function (n) { n.classList.remove('is-quiet'); n.style.removeProperty('--ny'); });
    var name = function (n) { return n.querySelector('.radar__name'); };
    if (!nodes.length || getComputedStyle(name(nodes[0])).display === 'none') return;
    var placed = [];
    var hit = function (r) { return placed.some(function (p) { return !(r.right + 4 < p.left || r.left - 4 > p.right || r.bottom + 3 < p.top || r.top - 3 > p.bottom); }); };
    nodes.forEach(function (n) {
      var tries = [[false, 0], [true, 0], [false, -26], [true, -26], [false, 26], [true, 26]];
      var ok = false;
      for (var i = 0; i < tries.length && !ok; i++) {
        n.classList.toggle('radar__node--l', tries[i][0] !== (n.getAttribute('data-side') === 'l'));
        n.style.setProperty('--ny', tries[i][1] + 'px');
        var r = name(n).getBoundingClientRect();
        if (!hit(r)) { placed.push(r); ok = true; }
      }
      if (!ok) { n.style.removeProperty('--ny'); n.classList.add('is-quiet'); }
    });
  }
  if (radar) {
    Array.prototype.forEach.call(radar.querySelectorAll('.radar__node'), function (n) { if (n.classList.contains('radar__node--l')) n.setAttribute('data-side', 'l'); });
    declutter();
    w.addEventListener('resize', declutter, { passive: true });
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(declutter);
  }

  // hero approach altitude (ft) follows the descent
  var alt = d.querySelector('[data-alt-ft]');
  if (alt && !RM) {
    var tick = false;
    w.addEventListener('scroll', function () { if (tick) return; tick = true; requestAnimationFrame(function () { alt.textContent = Math.round(Math.min(w.scrollY, w.innerHeight * 2) * 12.5).toLocaleString('en-US'); tick = false; }); }, { passive: true });
  }
})();
