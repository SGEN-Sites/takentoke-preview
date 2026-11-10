/* site.js — Launch Complex 994 motion + UI engine (vanilla, no dependencies). LEAD-OWNED. */
(function () {
  'use strict';
  var d = document, w = window, html = d.documentElement;
  var RM = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = w.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var ss = { get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} } };

  /* ---------------- age gate (fail closed) */
  var gate = $('[data-agegate]');
  if (gate) {
    var gv = $('[data-agegate-video]');
    if (html.classList.contains('age-pending')) {
      if (gv && !RM) { gv.preload = 'auto'; var p = gv.play(); if (p && p.catch) p.catch(function () {}); }
      setTimeout(function () { var y = $('[data-agegate-yes]'); if (y) y.focus(); }, 60);
    }
    gate.addEventListener('click', function (e) {
      if (e.target.closest('[data-agegate-yes]')) {
        try { localStorage.setItem('tnt-age-ok', String(Date.now())); } catch (err) {}
        html.classList.remove('age-pending'); if (gv) gv.pause();
        d.dispatchEvent(new CustomEvent('tnt:age-ok'));
      } else if (e.target.closest('[data-agegate-no]')) {
        var m = $('[data-agegate-denied]'); if (m) m.hidden = false;
      }
    });
    gate.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = $$('button', gate); if (!f.length) return;
      if (e.shiftKey && d.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && d.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
  }

  /* ---------------- starfield: depth layers, pointer parallax, scroll-velocity warp */
  var cv = $('[data-stars]');
  var stars = [], cw = 0, ch = 0, dpr = Math.min(1.5, w.devicePixelRatio || 1), ctx2 = cv && cv.getContext ? cv.getContext('2d') : null;
  var vel = 0, lastY = w.scrollY, px = 0, py = 0, tpx = 0, tpy = 0, running = true;
  function seed() {
    cw = w.innerWidth; ch = w.innerHeight;
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
    var n = Math.min(620, Math.round(cw * ch / 2600));
    stars = [];
    for (var i = 0; i < n; i++) {
      var z = Math.random();
      var tint = Math.random();
      stars.push({ x: Math.random() * cw, y: Math.random() * ch, z: z, r: 0.35 + z * 1.35, tw: Math.random() * 6.28, c: tint < 0.08 ? '124,252,0' : tint < 0.16 ? '0,212,255' : tint < 0.21 ? '183,155,255' : '235,240,255' });
    }
  }
  function draw(t) {
    if (!ctx2) return;
    ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx2.clearRect(0, 0, cw, ch);
    px += (tpx - px) * 0.06; py += (tpy - py) * 0.06;
    var warp = clamp(Math.abs(vel) - 4, 0, 34);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var depth = 0.2 + s.z * 0.8;
      if (!RM) { s.y -= vel * depth * 0.22; if (s.y < -4) s.y += ch + 8; if (s.y > ch + 4) s.y -= ch + 8; }
      var x = s.x + px * depth * 18, y = s.y + py * depth * 12;
      var a = RM ? 0.75 : 0.45 + 0.55 * Math.abs(Math.sin(t / 1400 + s.tw));
      a *= 0.35 + s.z * 0.65;
      if (warp > 2 && !RM) {
        var len = warp * depth * 0.75;
        ctx2.strokeStyle = 'rgba(' + s.c + ',' + (a * 0.75) + ')';
        ctx2.lineWidth = s.r;
        ctx2.beginPath(); ctx2.moveTo(x, y); ctx2.lineTo(x, y + (vel > 0 ? len : -len)); ctx2.stroke();
      } else {
        ctx2.fillStyle = 'rgba(' + s.c + ',' + a + ')';
        ctx2.beginPath(); ctx2.arc(x, y, s.r, 0, 6.283); ctx2.fill();
      }
    }
  }
  if (cv && ctx2) {
    seed(); draw(0);
    w.addEventListener('resize', function () { seed(); draw(0); }, { passive: true });
    if (FINE && !RM) w.addEventListener('pointermove', function (e) { tpx = e.clientX / cw - 0.5; tpy = e.clientY / ch - 0.5; }, { passive: true });
    d.addEventListener('visibilitychange', function () { running = !d.hidden; if (running) requestAnimationFrame(loop); });
  }

  /* ---------------- scroll-driven systems (one rAF loop) */
  var hdr = $('[data-hdr]'), tele = $('[data-telemetry]'), altEl = $('[data-alt]'), secEl = $('[data-sector]');
  var depthEls = $$('[data-depth]'), parEls = $$('[data-parallax]'), horizons = $$('[data-horizon]'), lift = $$('[data-liftoff]');
  var sectors = $$('main [data-sector]');
  var bar = $('[data-launchbar]'), footer = $('[data-footer]');
  var mainFirst = $('main > *');
  var barDismissed = ss.get('tnt-bar-x') === '1', drawerOpen = false, typing = false, footerIn = false;
  function onScrollFrame() {
    var y = w.scrollY, vh = w.innerHeight, docH = d.documentElement.scrollHeight - vh;
    var prog = docH > 0 ? clamp(y / docH, 0, 1) : 0;
    if (hdr) { hdr.classList.toggle('is-scrolled', y > 10); hdr.style.setProperty('--prog', prog.toFixed(4)); var b = hdr.querySelector('.hdr__bar'); if (b) b.style.setProperty('--prog', prog.toFixed(4)); }
    if (tele) { tele.style.setProperty('--prog', prog.toFixed(4)); tele.classList.toggle('is-on', y > vh * 0.5); if (altEl) altEl.textContent = Math.round(prog * 408); }
    if (!RM) {
      for (var i = 0; i < parEls.length; i++) { var r = parEls[i].getBoundingClientRect(); if (r.bottom < -200 || r.top > vh + 200) continue; parEls[i].style.setProperty('--py', clamp(-r.top * 0.18, -120, 160).toFixed(1) + 'px'); }
      for (var j = 0; j < depthEls.length; j++) {
        var el = depthEls[j], host = el.offsetParent || el.parentElement, hr = host.getBoundingClientRect();
        if (hr.bottom < -300 || hr.top > vh + 300) continue;
        var dep = parseFloat(el.getAttribute('data-depth')) || 0.2;
        var center = hr.top + hr.height / 2 - vh / 2;
        var ty = clamp(-center * dep * 0.35, -90, 90);
        el.style.setProperty('--fy', (ty + py * dep * 26).toFixed(1) + 'px');
        el.style.setProperty('--fx', (px * dep * 34).toFixed(1) + 'px');
      }
      for (var k = 0; k < horizons.length; k++) {
        var hz = horizons[k], sr = hz.parentElement.getBoundingClientRect();
        var t = clamp((vh - sr.top) / (vh * 0.9), 0, 1);
        hz.style.setProperty('--hx', (0.62 + 0.38 * t).toFixed(3)); hz.style.setProperty('--ho', (0.15 + 0.85 * t).toFixed(3));
      }
      for (var m = 0; m < lift.length; m++) {
        var f = parseFloat(lift[m].getAttribute('data-liftoff')) || 1;
        var ly = Math.min(y, vh * 1.4);
        lift[m].style.setProperty('--lift', (-ly * f).toFixed(1) + 'px');
        lift[m].style.setProperty('--burn', clamp(y / (vh * 0.6), 0, 1).toFixed(3));
      }
    }
    if (secEl && sectors.length) {
      var cur = null;
      for (var s = 0; s < sectors.length; s++) { var rr = sectors[s].getBoundingClientRect(); if (rr.top < vh * 0.45 && rr.bottom > vh * 0.45) { cur = sectors[s]; break; } }
      if (cur) { var name = cur.getAttribute('data-sector'); if (secEl.textContent !== name) secEl.textContent = name; }
    }
    // launch bar: past the hero, not at the footer, not while the drawer is open or a field is focused
    if (bar) {
      var past = mainFirst ? mainFirst.getBoundingClientRect().bottom < vh * 0.3 : y > vh;
      var on = past && !footerIn && !drawerOpen && !typing && !barDismissed && !html.classList.contains('age-pending');
      if (on !== bar.classList.contains('is-on')) bar.classList.toggle('is-on', on);
    }
  }
  var ticking = false;
  function loop(t) {
    // velocity per frame, clamped so a jump (anchor link, restore) is a short burst, never a long smear
    var y = w.scrollY; vel = vel * 0.8 + clamp(y - lastY, -80, 80) * 0.35; lastY = y;
    if (Math.abs(vel) < 0.05) vel = 0;
    if (cv && ctx2 && running && !RM) draw(t || 0);
    onScrollFrame();
    if (running && !RM) requestAnimationFrame(loop); else ticking = false;
  }
  if (RM) { w.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { onScrollFrame(); ticking = false; }); } }, { passive: true }); onScrollFrame(); }
  else requestAnimationFrame(loop);
  if (footer && 'IntersectionObserver' in w) new IntersectionObserver(function (es) { footerIn = es[0].isIntersecting; }, { rootMargin: '0px 0px -20% 0px' }).observe(footer);
  if (bar) {
    var bx = $('[data-launchbar-x]', bar);
    if (bx) bx.addEventListener('click', function () { barDismissed = true; ss.set('tnt-bar-x', '1'); bar.classList.remove('is-on'); });
    d.addEventListener('focusin', function (e) { typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName); });
    d.addEventListener('focusout', function () { typing = false; });
  }

  /* ---------------- reveal (IO + a settle sweep so fast flings never leave blank blocks) */
  var revs = $$('[data-reveal]');
  function revealNow(el) { el.classList.add('is-in'); }
  if (RM || !('IntersectionObserver' in w)) revs.forEach(revealNow);
  else {
    // a clip-path "rise" element is invisible to IO (fully clipped), so its parent is observed on its behalf
    var watch = new Map();
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { (watch.get(e.target) || []).forEach(revealNow); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    revs.forEach(function (el) { var t = el.getAttribute('data-reveal') === 'rise' ? el.parentElement : el; if (!watch.has(t)) watch.set(t, []); watch.get(t).push(el); io.observe(t); });
    var settle;
    w.addEventListener('scroll', function () { clearTimeout(settle); settle = setTimeout(function () { var vh = w.innerHeight; revs.forEach(function (el) { if (!el.classList.contains('is-in') && el.getBoundingClientRect().top < vh) revealNow(el); }); }, 140); }, { passive: true });
  }

  /* ---------------- count-up (one observer, value written at the end) */
  $$('[data-count]').forEach(function (el) {
    var raw = el.getAttribute('data-count'); var to = parseFloat(raw); var dec = (String(raw).split('.')[1] || '').length;
    if (RM || !('IntersectionObserver' in w)) { el.textContent = to.toFixed(dec); return; }
    var o = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return; o.disconnect();
      var t0 = performance.now(), dur = 1400;
      (function step(now) { var k = clamp((now - t0) / dur, 0, 1); var e = 1 - Math.pow(1 - k, 3); el.textContent = (to * e).toFixed(dec); if (k < 1) requestAnimationFrame(step); else el.textContent = to.toFixed(dec); })(t0);
    }, { threshold: 0.4 });
    o.observe(el);
  });

  /* ---------------- tilt + glare, magnetic buttons (fine pointers only) */
  if (FINE && !RM) {
    d.addEventListener('pointermove', function (e) {
      var c = e.target.closest && e.target.closest('[data-tilt]');
      if (c) {
        var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        c.style.setProperty('--ry', ((x - 0.5) * 9).toFixed(2) + 'deg'); c.style.setProperty('--rx', ((0.5 - y) * 7).toFixed(2) + 'deg');
        c.style.setProperty('--mx', (x * 100).toFixed(1) + '%'); c.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      }
      var m = e.target.closest && e.target.closest('.btn--magnet');
      if (m) { var mr = m.getBoundingClientRect(); m.style.transform = 'translate(' + ((e.clientX - mr.left - mr.width / 2) * 0.18).toFixed(1) + 'px,' + ((e.clientY - mr.top - mr.height / 2) * 0.28).toFixed(1) + 'px)'; }
    }, { passive: true });
    d.addEventListener('pointerout', function (e) {
      var c = e.target.closest && e.target.closest('[data-tilt]');
      if (c && !c.contains(e.relatedTarget)) { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); }
      var m = e.target.closest && e.target.closest('.btn--magnet');
      if (m && !m.contains(e.relatedTarget)) m.style.transform = '';
    }, { passive: true });
  }

  /* ---------------- open-now status (America/New_York, daily 10:00–22:00) */
  function nyNow() { try { var p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', hour12: false, weekday: 'long' }).formatToParts(new Date()); var o = {}; p.forEach(function (x) { o[x.type] = x.value; }); return { h: +o.hour % 24, m: +o.minute, day: o.weekday }; } catch (e) { return null; } }
  var now = nyNow();
  if (now) {
    var open = now.h >= 10 && now.h < 22;
    $$('[data-status]').forEach(function (s) { s.classList.toggle('is-closed', !open); var t = $('[data-status-text]', s); if (t) t.textContent = open ? 'Walk-in · Open now' : 'Closed · Opens 10AM'; });
    $$('[data-open-text]').forEach(function (s) { s.textContent = open ? 'Open now · until 10PM' : 'Closed now · opens 10AM'; });
    $$('[data-weekday]').forEach(function (el) { if (el.getAttribute('data-weekday') === now.day) el.classList.add('is-today'); });
    $$('[data-today-name]').forEach(function (el) { el.textContent = now.day; });
  }
  var clock = $$('[data-clock]');
  if (clock.length) { var tickClock = function () { try { var s = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date()); clock.forEach(function (c) { c.textContent = s; }); } catch (e) {} }; tickClock(); setInterval(tickClock, 1000); }

  /* ---------------- header mega menus + drawer */
  var megas = $$('[data-mega]'), closeT;
  function closeAll(except) { megas.forEach(function (m) { if (m !== except) { m.classList.remove('is-open'); var a = $('.nav__link', m); if (a) a.setAttribute('aria-expanded', 'false'); } }); }
  megas.forEach(function (m) {
    var a = $('.nav__link', m);
    if (FINE) {
      m.addEventListener('mouseenter', function () { clearTimeout(closeT); closeAll(m); m.classList.add('is-open'); a.setAttribute('aria-expanded', 'true'); });
      m.addEventListener('mouseleave', function () { closeT = setTimeout(function () { m.classList.remove('is-open'); a.setAttribute('aria-expanded', 'false'); }, 160); });
    }
    a.addEventListener('keydown', function (e) { if (e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); closeAll(m); m.classList.add('is-open'); a.setAttribute('aria-expanded', 'true'); var f = $('.mega a', m); if (f) f.focus(); } });
    m.addEventListener('focusout', function (e) { if (!m.contains(e.relatedTarget)) { m.classList.remove('is-open'); a.setAttribute('aria-expanded', 'false'); } });
  });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeAll(); setDrawer(false); } });
  var drawer = $('[data-drawer]'), burger = $('[data-burger]');
  function setDrawer(on) {
    if (!drawer) return; drawerOpen = on;
    drawer.classList.toggle('is-open', on); if (burger) burger.setAttribute('aria-expanded', on ? 'true' : 'false');
    d.body.style.overflow = on ? 'hidden' : '';
    if (on) { var c = $('[data-drawer-close]', drawer); if (c) c.focus(); } else if (burger && d.activeElement && drawer.contains(d.activeElement)) burger.focus();
  }
  if (burger) burger.addEventListener('click', function () { setDrawer(true); });
  if (drawer) {
    drawer.addEventListener('click', function (e) { if (e.target.closest('[data-drawer-close]') || e.target.closest('a')) setDrawer(false); });
    drawer.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return; var f = $$('a,button,summary', drawer).filter(function (x) { return x.offsetParent; }); if (!f.length) return;
      if (e.shiftKey && d.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && d.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
  }

  /* ---------------- videos: autoplay muted, retry on first touch, pause offscreen, poster under reduced motion */
  var vids = $$('video[data-autoplay]');
  vids.forEach(function (v) {
    if (RM) { v.removeAttribute('autoplay'); v.pause(); return; }
    var tryPlay = function () { var p = v.play(); if (p && p.catch) p.catch(function () {}); };
    tryPlay();
    d.addEventListener('touchstart', tryPlay, { once: true, passive: true });
    if ('IntersectionObserver' in w) new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) tryPlay(); else v.pause(); }); }, { threshold: 0.05 }).observe(v);
  });
  $$('[data-video-toggle]').forEach(function (b) {
    var v = $(b.getAttribute('data-video-toggle'));
    if (!v) return;
    b.addEventListener('click', function () { if (v.paused) { v.play(); b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', 'Pause background video'); } else { v.pause(); b.setAttribute('aria-pressed', 'true'); b.setAttribute('aria-label', 'Play background video'); } });
  });

  /* ---------------- live menu embed: mark live once the Dutchie iframe arrives */
  $$('[data-menu-frame]').forEach(function (f) {
    var scr = $('[data-menu-screen]', f);
    var mark = function () { var ifr = $('iframe', scr); if (ifr) { f.classList.add('is-live'); return true; } return false; };
    if (!mark() && 'MutationObserver' in w) { var mo = new MutationObserver(function () { if (mark()) mo.disconnect(); }); mo.observe(scr, { childList: true, subtree: true }); }
  });

  /* ---------------- footer finale: letters lift + glow toward the pointer; coordinates type themselves out */
  var word = $('[data-word]');
  if (word && FINE && !RM) {
    var ltrs = $$('.ltr', word);
    word.parentElement.addEventListener('pointermove', function (e) {
      ltrs.forEach(function (l) {
        var r = l.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        var dist = Math.sqrt(dx * dx + dy * dy), k = clamp(1 - dist / 260, 0, 1);
        l.style.setProperty('--ly', (-k * 0.22).toFixed(3) + 'em'); l.style.setProperty('--lr', (k * 10 * (dx > 0 ? -1 : 1)).toFixed(1) + 'deg');
        l.classList.toggle('is-hot', k > 0.35);
      });
    }, { passive: true });
    word.parentElement.addEventListener('pointerleave', function () { ltrs.forEach(function (l) { l.style.removeProperty('--ly'); l.style.removeProperty('--lr'); l.classList.remove('is-hot'); }); });
  }
  var typed = $('[data-type]');
  if (typed && !RM && 'IntersectionObserver' in w) {
    var full = typed.textContent; typed.setAttribute('aria-label', full);
    var ito = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return; ito.disconnect();
      typed.textContent = ''; typed.classList.add('typed'); var n = 0;
      (function tick() { typed.textContent = full.slice(0, ++n); if (n < full.length) setTimeout(tick, 28); else setTimeout(function () { typed.classList.remove('typed'); }, 1200); })();
    }, { threshold: 0.6 });
    ito.observe(typed);
  }

  /* ---------------- orbit system: items ride an ellipse; hover/focus parks the orbit */
  $$('[data-orbit]').forEach(function (sys) {
    var items = $$('[data-orbit-item]', sys), n = items.length, a0 = 0, paused = false, last = 0;
    if (!n) return;
    function place(a) {
      var rect = sys.getBoundingClientRect(), rx = rect.width * 0.42, ry = rect.height * 0.3;
      items.forEach(function (it, i) {
        var ang = a + (i / n) * Math.PI * 2, x = Math.cos(ang) * rx, y = Math.sin(ang) * ry, depth = (Math.sin(ang) + 1) / 2;
        it.style.transform = 'translate(-50%,-50%) translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) scale(' + (0.72 + depth * 0.38).toFixed(3) + ')';
        it.style.zIndex = String(10 + Math.round(depth * 20));
        it.style.setProperty('--depth', depth.toFixed(3));
      });
    }
    sys.addEventListener('pointerenter', function () { paused = true; });
    sys.addEventListener('pointerleave', function () { paused = false; });
    sys.addEventListener('focusin', function () { paused = true; });
    sys.addEventListener('focusout', function () { paused = false; });
    place(0);
    if (RM) return;
    var visible = true;
    if ('IntersectionObserver' in w) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(sys);
    (function spin(t) { var dt = last ? t - last : 16; last = t; if (visible && !paused) { a0 += dt * 0.00012; place(a0); } requestAnimationFrame(spin); })(0);
    w.addEventListener('resize', function () { place(a0); }, { passive: true });
  });
})();
