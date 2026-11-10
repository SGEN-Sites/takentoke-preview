/* parts/shop.js — SHOP area behaviours (loaded on every page; every block guards on its own elements).
   - /menu/: the category chip matching ?dtche[category]= is marked active (aria-current), the HUD "Showing" readout
     and the "open the live menu" fallback follow the same category, and a stalled embed gets a visible way out.
   - guides: a live Dutchie carousel is marked live once its iframe arrives (until then the designed boot state shows).
   - /deals/: today's deal name is echoed next to the weekday readout (site.js has already marked .is-today). */
(function () {
  'use strict';
  var d = document, w = window;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var LIVE = 'https://takentoke.com/menu/';

  /* ---------- menu: active chip from the URL */
  var track = d.querySelector('[data-shop-chips]');
  var cat = null;
  try { cat = new URLSearchParams(w.location.search).get('dtche[category]'); } catch (e) { cat = null; }
  if (track) {
    var chips = $$('.shop-chip', track), on = null;
    chips.forEach(function (c) {
      var k = c.getAttribute('data-cat') || '';
      var hit = cat ? k.toLowerCase() === String(cat).toLowerCase() : k === '';
      c.classList.toggle('is-on', hit);
      if (hit) { c.setAttribute('aria-current', 'page'); on = c; } else c.removeAttribute('aria-current');
    });
    if (!on && chips[0]) { chips[0].classList.add('is-on'); chips[0].setAttribute('aria-current', 'page'); on = chips[0]; }
    if (on && track.scrollWidth > track.clientWidth) track.scrollLeft = Math.max(0, on.offsetLeft - (track.clientWidth - on.offsetWidth) / 2);
    var label = on ? on.textContent.replace(/\s+/g, ' ').trim() : '';
    $$('[data-shop-filter]').forEach(function (el) { el.textContent = cat && label ? label : 'All categories'; });
  }
  if (cat) $$('.menu-frame__fallback a').forEach(function (a) { a.href = LIVE + '?dtche[category]=' + encodeURIComponent(cat); });

  /* ---------- real content signal: Dutchie's iframe posts JSON {event,payload} to its parent once it renders
     (menu: iframe:ready / iframe:resize; carousel: embeddedCarousel:setHeight with its carouselId). An iframe that
     exists but was refused (403 to automation) posts nothing, so the designed boot state stays in front of it. */
  var MENU_EV = /^(iframe:ready|iframe:resize|iframe:resize:override|embed:ready|route:changed)$/;
  w.addEventListener('message', function (ev) {
    if (!/^https:\/\/([a-z0-9-]+\.)*dutchie\.com$/i.test(ev.origin || '')) return;
    var raw = ev.data; if (typeof raw !== 'string') return;
    var m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || !m.event) return;
    if (m.event === 'embeddedCarousel:setHeight' && m.payload && m.payload.carouselId) {
      $$('[data-shop-carousel]').forEach(function (scr) { if (scr.getAttribute('data-carousel-id') === m.payload.carouselId) scr.classList.add('is-live'); });
    } else if (MENU_EV.test(m.event)) {
      $$('[data-shop-console] [data-menu-frame]').forEach(function (f) { f.classList.add('shop-has-content'); });
    }
  });

  /* ---------- menu embed: no content after 8 s -> show the way out inside the screen */
  $$('[data-shop-console] [data-menu-frame]').forEach(function (f) {
    setTimeout(function () {
      if (f.classList.contains('shop-has-content')) return;
      f.classList.add('is-stalled');
      var boot = f.querySelector('.menu-frame__boot'), fb = f.querySelector('.menu-frame__fallback a');
      if (!boot || !fb || boot.querySelector('.shop-boot-out')) return;
      var a = d.createElement('a');
      a.className = 'btn btn--ghost btn--sm shop-boot-out';
      a.href = fb.href; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = 'Open the live menu';
      boot.appendChild(a);
    }, 8000);
  });

  /* ---------- guide carousels: is-live comes from the message above; no content after 8 s -> stalled styling */
  $$('[data-shop-carousel]').forEach(function (scr) {
    setTimeout(function () { if (!scr.classList.contains('is-live')) scr.classList.add('is-stalled'); }, 8000);
  });

  /* ---------- deals: today's deal next to the weekday readout */
  var today = d.querySelector('.shop-day.is-today .shop-day__name');
  if (today) $$('[data-shop-todaydeal]').forEach(function (el) { el.textContent = ' — ' + today.textContent; });
})();
