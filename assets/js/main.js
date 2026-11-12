(function () {
  'use strict';

  var header = document.getElementById('site-header');
  var toggle = document.getElementById('nav-toggle');
  var nav = document.getElementById('site-nav');

  // Header: solid background once the page scrolls
  function onScroll() {
    // sub-pages (Partner Portal, Terms) start on a light background: the header is solid from the top
    header.classList.toggle('is-scrolled', window.scrollY > 24 || document.body.classList.contains('page'));
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile menu
  function setOpen(open) {
    header.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  }
  toggle.addEventListener('click', function () {
    setOpen(!header.classList.contains('is-open'));
  });
  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });

  // Honeycomb glow: five light spots swell slowly in and out over the honeycomb areas,
  // each at its own pace; a sixth follows the pointer.
  var hero = document.querySelector('.hero');
  var glints = document.getElementById('hero-glints');
  if (hero && glints) {
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      glints.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      glints.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
    hero.addEventListener('pointerleave', function () {
      glints.style.setProperty('--mx', '-500px');
      glints.style.setProperty('--my', '-500px');
    });

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Honeycomb sits on the right and in the bottom-left corner of the background image.
      function pickSpot() {
        return Math.random() < 0.75
          ? { x: 62 + Math.random() * 38, y: Math.random() * 100 }
          : { x: Math.random() * 22, y: 60 + Math.random() * 40 };
      }
      var spots = [1, 2, 3, 4, 5].map(function (n) {
        var p = pickSpot();
        return { n: n, x: p.x, y: p.y, start: -Math.random() * 6000, dur: 4200 + Math.random() * 2800 };
      });
      var tick = function (now) {
        if (hero.classList.contains('is-covered')) { requestAnimationFrame(tick); return; }
        spots.forEach(function (s) {
          var k = (now - s.start) / s.dur;
          if (k >= 1) {
            var p = pickSpot();
            s.x = p.x; s.y = p.y; s.start = now + Math.random() * 1200; s.dur = 4200 + Math.random() * 2800;
            k = 0;
          }
          // slow, smooth swell in and out
          var a = k <= 0 ? 0 : Math.pow(Math.sin(Math.PI * k), 1.4);
          glints.style.setProperty('--x' + s.n, s.x + '%');
          glints.style.setProperty('--y' + s.n, s.y + '%');
          glints.style.setProperty('--a' + s.n, a.toFixed(3));
        });
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }

  // Hub clocks in the hero: local time at the three warehouses, refreshed every half minute
  var clocks = document.querySelectorAll('.hub-time[data-tz]');
  function tzOffsetMinutes(tz, now) {
    var f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    var o = {};
    f.formatToParts(now).forEach(function (p) { o[p.type] = p.value; });
    var local = Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour % 24, +o.minute, +o.second);
    return Math.round((local - now.getTime()) / 60000);
  }
  function tickClocks() {
    var now = new Date();
    clocks.forEach(function (el) {
      var tz = el.getAttribute('data-tz');
      var parts;
      try {
        parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hourCycle: 'h23', hour: '2-digit', minute: '2-digit' }).formatToParts(now);
      } catch (e) { return; }
      var h = '', m = '';
      parts.forEach(function (p) { if (p.type === 'hour') h = p.value; if (p.type === 'minute') m = p.value; });
      if (!h) return;
      el.innerHTML = h + '<i>:</i>' + m;
      // Prague switches CET/CEST; the data-abbr lists "standard,summer"
      var abbr = (el.getAttribute('data-abbr') || '').split(',');
      var zone = el.parentNode.querySelector('.hub-zone');
      if (zone && abbr.length === 2) {
        try { zone.textContent = tzOffsetMinutes(tz, now) === 120 ? abbr[1] : abbr[0]; } catch (e2) { /* keep the label */ }
      }
    });
  }
  if (clocks.length && window.Intl && Intl.DateTimeFormat) {
    tickClocks();
    setInterval(tickClocks, 30000);
  }

  // FX reference rates (ECB via frankfurter.app): EUR/USD, EUR/GBP and the USD/HKD cross, with the change
  // against the previous published day. A snapshot in the markup shows while the request runs or if it fails.
  var fx = document.getElementById('fx');
  function renderFx(rates, dateLabelEl) {
    var days = Object.keys(rates).sort();
    if (!days.length) return false;
    var last = rates[days[days.length - 1]];
    var prev = days.length > 1 ? rates[days[days.length - 2]] : null;
    function pair(r) { return r && r.USD && r.GBP && r.HKD ? { EURUSD: r.USD, EURGBP: r.GBP, USDHKD: r.HKD / r.USD } : null; }
    var cur = pair(last), was = pair(prev);
    if (!cur) return false;
    fx.querySelectorAll('li[data-pair]').forEach(function (li) {
      var k = li.getAttribute('data-pair');
      li.querySelector('.fx-rate').textContent = cur[k].toFixed(4);
      var chg = li.querySelector('.fx-chg');
      chg.className = 'cell-sub fx-chg';
      if (was && was[k]) {
        var pct = (cur[k] - was[k]) / was[k] * 100;
        var sign = pct > 0.0005 ? 'is-up' : pct < -0.0005 ? 'is-down' : '';
        if (sign) chg.classList.add(sign);
        chg.textContent = (pct > 0 ? '\u25B2 ' : pct < 0 ? '\u25BC ' : '') + Math.abs(pct).toFixed(2) + '%';
      } else {
        chg.textContent = '';
      }
    });
    var d = new Date(days[days.length - 1] + 'T12:00:00Z');
    if (dateLabelEl && !isNaN(d)) dateLabelEl.textContent = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
    return true;
  }
  if (fx) {
    var dateEl = fx.querySelector('.fx-date');
    var snap = null;
    try { snap = JSON.parse(fx.getAttribute('data-snapshot') || 'null'); } catch (e) { snap = null; }
    var shown = snap ? renderFx(snap, dateEl) : false;
    var iso = function (d) { return d.toISOString().slice(0, 10); };
    var today = new Date();
    var cached = null;
    try { cached = JSON.parse(localStorage.getItem('teckono-fx') || 'null'); } catch (e) { cached = null; }
    if (cached && cached.day === iso(today) && cached.rates) {
      shown = renderFx(cached.rates, dateEl) || shown;
    } else if (window.fetch) {
      var from = new Date(today.getTime() - 10 * 864e5);
      fetch(fx.getAttribute('data-src') + iso(from) + '..' + iso(today) + '?from=EUR&to=USD,GBP,HKD', { mode: 'cors' })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('fx ' + r.status)); })
        .then(function (j) {
          if (j && j.rates && renderFx(j.rates, dateEl)) {
            shown = true;
            try { localStorage.setItem('teckono-fx', JSON.stringify({ day: iso(today), rates: j.rates })); } catch (e) { /* private mode */ }
          }
        })
        .catch(function () { /* the snapshot stays */ })
        .then(function () { if (!shown) { fx.hidden = true; fx.closest('.hero-desk').classList.add('no-fx'); } });
    }
    if (!shown && !window.fetch) { fx.hidden = true; fx.closest('.hero-desk').classList.add('no-fx'); }
  }

  // Year in footer
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  // WeChat has no wa.me-style link to a number, so a tap copies it for the WeChat search.
  function copyFallback(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* nothing to do */ }
    document.body.removeChild(ta);
  }
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    var hint = btn.querySelector('.copy-hint') || btn.parentNode.querySelector('.copy-hint');
    var hide, clear;
    function done() {
      if (!hint) return;
      clearTimeout(hide);
      clearTimeout(clear);
      hint.textContent = 'Copied';
      hint.classList.add('is-on');
      hide = setTimeout(function () { hint.classList.remove('is-on'); }, 1800);
      clear = setTimeout(function () { hint.textContent = ''; }, 2200);
    }
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { copyFallback(text); done(); });
      } else {
        copyFallback(text);
        done();
      }
    });
  });

  // Gentle rise for blocks below the first screen. Anything already in view stays put.
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce && 'IntersectionObserver' in window) {
    var targets = document.querySelectorAll(
      '.section-head, .brand-grid, .map-scroll, .warehouse, .mode, .partner-list li, .event, .person, .facts, .inquiry'
    );
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    var fold = window.innerHeight;
    targets.forEach(function (el, i) {
      if (el.getBoundingClientRect().top < fold) return;
      el.classList.add('rise');
      el.style.transitionDelay = (i % 3) * 80 + 'ms';
      io.observe(el);
    });
    document.documentElement.classList.add('reveal-ready');
    // Safety net: never leave content hidden.
    setTimeout(function () {
      document.querySelectorAll('.rise').forEach(function (el) { el.classList.add('is-in'); });
    }, 6000);
  }

  // "More about our logistics": two lines show, the plus opens the rest with a height glide.
  document.querySelectorAll('.more').forEach(function (box) {
    var body = box.querySelector('.more-body');
    var teaser = box.querySelector('.more-teaser');
    var toggle = box.querySelector('.more-toggle');
    var label = toggle && toggle.querySelector('.more-label');
    if (!body || !teaser || !toggle) return;
    var noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var open = false;

    function setState(isOpen) {
      open = isOpen;
      toggle.setAttribute('aria-expanded', String(isOpen));
      if (label) label.textContent = label.getAttribute(isOpen ? 'data-less' : 'data-more');
    }
    function glide(from, to, after) {
      body.style.height = from + 'px';
      void body.offsetHeight; // commit the start height
      body.classList.add('is-animating');
      body.style.height = to + 'px';
      body.addEventListener('transitionend', function done(e) {
        if (e.target !== body) return;
        body.removeEventListener('transitionend', done);
        body.classList.remove('is-animating');
        body.style.height = '';
        if (after) after();
      });
    }

    // The section is a sticky card. If it is stuck right now, its content sits lower than its
    // natural place; scroll back to the stick point first (this only moves the next card's
    // overlap), so the text then grows or shrinks in place instead of jumping.
    function settle() {
      var section = box.closest('section');
      var pin = section && section.parentElement;
      if (!pin || !pin.classList.contains('pin')) return;
      var shown = section.getBoundingClientRect().top;
      var natural = pin.getBoundingClientRect().top;
      if (shown - natural < 0.5) return;
      var root = document.documentElement;
      var prev = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';
      window.scrollBy(0, natural - shown);
      root.style.scrollBehavior = prev;
    }

    toggle.addEventListener('click', function () {
      settle();
      if (!open) {
        var from = body.getBoundingClientRect().height;
        box.classList.add('is-open');
        teaser.classList.remove('is-clamped');
        setState(true);
        if (!noMotion) glide(from, body.scrollHeight);
      } else {
        var start = body.getBoundingClientRect().height;
        teaser.classList.add('is-clamped');
        var end = teaser.getBoundingClientRect().height;
        setState(false);
        if (noMotion) { box.classList.remove('is-open'); return; }
        teaser.classList.remove('is-clamped');
        glide(start, end, function () {
          teaser.classList.add('is-clamped');
          box.classList.remove('is-open');
        });
      }
    });
  });

  // A link to #register or #po (menu cards, chat answers, other pages) opens that form
  function openFormFor(hash) {
    var target = hash && hash.length > 1 && document.getElementById(hash.slice(1));
    var more = target && target.querySelector('.form-more');
    if (more && !more.classList.contains('is-open')) more.querySelector('.more-toggle').click();
  }
  window.addEventListener('hashchange', function () { openFormFor(location.hash); });
  openFormFor(location.hash);

  // "Write to us" tab: opens the panel with WhatsApp, email and quick answers.
  var chat = document.getElementById('chat');
  if (chat) {
    var fab = chat.querySelector('.chat-fab');
    var panel = chat.querySelector('.chat-panel');
    var closeBtn = chat.querySelector('.chat-close');
    function setChat(open) {
      chat.classList.toggle('is-open', open);
      panel.hidden = !open;
      fab.setAttribute('aria-expanded', String(open));
    }
    fab.addEventListener('click', function () { setChat(panel.hidden); if (!panel.hidden) closeBtn.focus(); });
    closeBtn.addEventListener('click', function () { setChat(false); fab.focus(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { setChat(false); fab.focus(); } });
  }

  // Forms (contact, partner registration, purchase order). Set data-endpoint on a form to a form
  // service URL (e.g. Formspree) or to a script that stores the data; until then the form says how
  // to reach us (data-fallback).
  document.querySelectorAll('form.inquiry').forEach(function (form) {
    var status = form.querySelector('.form-status');

    // Purchase Order reference: WEB/000011, WEB/000012, ... counted in this browser until the form is
    // connected; the server will then assign the number for everyone.
    var poPrefix = form.getAttribute('data-po-prefix');
    function poNext() {
      var start = parseInt(form.getAttribute('data-po-start') || '1', 10);
      var used = 0;
      try { used = parseInt(localStorage.getItem('teckono-po-count') || '0', 10) || 0; } catch (e) { used = 0; }
      var digits = parseInt(form.getAttribute('data-po-digits') || '6', 10);
      var n = String(start + used);
      while (n.length < digits) n = '0' + n;
      return poPrefix + n;
    }
    function poShow() {
      if (poPrefix === null) return;
      var ref = poNext();
      form.querySelectorAll('.po-ref, .po-ref-input').forEach(function (el) {
        if (el.tagName === 'INPUT') el.value = ref; else el.textContent = ref;
      });
    }
    function poAdvance() {
      if (poPrefix === null) return;
      try { localStorage.setItem('teckono-po-count', String((parseInt(localStorage.getItem('teckono-po-count') || '0', 10) || 0) + 1)); } catch (e) { /* private mode */ }
      poShow();
    }
    poShow();

    function setStatus(text, kind) {
      if (!status) return;
      status.textContent = text;
      status.className = 'form-status' + (kind ? ' is-' + kind : '');
    }

    function validate() {
      var ok = true;
      form.querySelectorAll('[required]').forEach(function (input) {
        var valid = input.type === 'checkbox' ? input.checked : input.checkValidity() && input.value.trim() !== '';
        var wrap = input.closest('.field') || input.closest('.consent');
        if (wrap) wrap.classList.toggle('is-invalid', !valid);
        if (!valid) ok = false;
      });
      return ok;
    }

    // Purchase order lines: add and remove rows
    var lines = form.querySelector('.lines');
    var addLine = form.querySelector('.add-line');
    if (lines && addLine) {
      addLine.addEventListener('click', function () {
        var first = lines.querySelector('.line');
        var row = first.cloneNode(true);
        row.querySelectorAll('input').forEach(function (i) { i.value = ''; i.removeAttribute('id'); });
        row.querySelectorAll('label').forEach(function (l) { l.removeAttribute('for'); });
        lines.appendChild(row);
        var firstInput = row.querySelector('input');
        if (firstInput) firstInput.focus();
      });
      lines.addEventListener('click', function (e) {
        var btn = e.target.closest('.line-remove');
        if (!btn) return;
        var row = btn.closest('.line');
        if (row && lines.querySelectorAll('.line').length > 1) row.remove();
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate()) {
        setStatus('Please fill in the highlighted fields.', 'error');
        return;
      }
      var endpoint = form.getAttribute('data-endpoint');
      if (!endpoint) {
        setStatus(form.getAttribute('data-fallback') || 'The form is not connected yet. Please write to info@teckono.com.', 'error');
        poAdvance();
        return;
      }
      var button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      setStatus('Sending\u2026');
      fetch(endpoint, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      }).then(function (res) {
        if (!res.ok) throw new Error(res.status);
        form.reset();
        poAdvance();
        setStatus(form.getAttribute('data-thanks') || 'Thank you. Your message has been sent and we will get back to you soon.', 'ok');
      }).catch(function () {
        setStatus('Your message could not be sent. Please try again or write to info@teckono.com.', 'error');
      }).then(function () {
        button.disabled = false;
      });
    });

    form.addEventListener('input', function (e) {
      var wrap = e.target.closest('.field') || e.target.closest('.consent');
      if (wrap) wrap.classList.remove('is-invalid');
    });
  });
})();
