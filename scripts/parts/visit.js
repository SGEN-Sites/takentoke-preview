/* parts/visit.js — VISIT area behaviours (loaded on every page, so everything guards on element presence):
   - Brooklyn hub orbital map: the 12 neighborhoods revolve together around 994 Atlantic (rigid rotation, so labels
     never newly collide); hover/focus parks it; off-screen it sleeps; reduced motion keeps the static layout.
   - flight-path SMIL motion is removed under reduced motion. */
(function () {
  'use strict';
  var d = document, w = window;
  var RM = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var each = function (sel, fn) { Array.prototype.forEach.call(d.querySelectorAll(sel), fn); };

  if (RM) each('.visit-fp [data-smil]', function (a) { if (a.parentNode) a.parentNode.removeChild(a); });

  each('[data-visit-orbit]', function (sys) {
    var nodes = Array.prototype.slice.call(sys.querySelectorAll('[data-orb-node]'));
    if (!nodes.length) return;
    var k = parseFloat(sys.getAttribute('data-tilt-ratio')) || 0.74;
    var data = nodes.map(function (n) { return { el: n, r: parseFloat(n.getAttribute('data-r')) || 0.5, a: parseFloat(n.getAttribute('data-a')) || 0 }; });
    var off = 0, paused = false, visible = false, last = 0;
    function place() {
      for (var i = 0; i < data.length; i++) {
        var o = data[i], a = o.a + off, s = Math.sin(a), x = 50 + Math.cos(a) * o.r * 50;
        o.el.style.left = x.toFixed(2) + '%';
        o.el.style.top = (50 + s * o.r * 50 * k).toFixed(2) + '%';
        o.el.style.setProperty('--s', (0.84 + (s + 1) * 0.1).toFixed(3));
        o.el.style.setProperty('--z', String(20 + Math.round(s * 10)));
        o.el.classList.toggle('is-left', x > 58);
      }
    }
    if (RM) return;
    sys.addEventListener('pointerenter', function () { paused = true; });
    sys.addEventListener('pointerleave', function () { paused = false; });
    if ('IntersectionObserver' in w) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { rootMargin: '80px' }).observe(sys);
    else visible = true;
    (function tick(t) {
      var dt = last ? Math.min(64, t - last) : 16; last = t;
      if (visible && !paused && !d.hidden) { off += dt * 0.00006; place(); }
      w.requestAnimationFrame(tick);
    })(0);
  });
})();
