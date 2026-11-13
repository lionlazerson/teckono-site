// Card stack at the top of the page. Each section in the stack slides up over the lower part of the
// one before it while that one stays pinned, and from there the two scroll on together.
//  1. Hero → white brands card. The hero fills the first screen, so the card starts just below the
//     fold, and it stops a little under the hero's text and buttons. The first time it comes in, its
//     pink-glowing edge lets out a band of white steam and keeps blowing it upward for about 3.5 s,
//     then the steam lifts and dissolves.
//  2. Brands → dark distribution card. It covers about a third of the brands card (an empty zone is
//     added under the logos for it, so nothing gets hidden), and each time it comes in a sharp,
//     bright glint runs along its top edge.
//  3. Distribution → light logistics card, the same way. Each time it comes in, a plane, a truck and
//     a train race along its top edge from left to right, one after another.
//  4. Logistics → dark events card, the same way. Each time it comes in, two light pulses run in
//     along its top edge from both sides, meet in the middle with a flash, and a ring spreads out.
// While a section is being covered it sinks back a little (--sink 0 → 1: slight scale, darkening);
// the card coming in gets --cover 0 → 1 (corner radius, glow).
(function () {
  'use strict';

  var stack = document.getElementById('stack');
  var hero = document.getElementById('hero');
  var header = document.getElementById('site-header');
  var brands = document.getElementById('brands');
  var network = document.getElementById('network');
  var logistics = document.getElementById('logistics');
  var events = document.getElementById('events');
  var team = document.getElementById('team');
  var contact = document.getElementById('contact');
  var canvas = document.getElementById('seam-fog');
  if (!stack || !hero || !brands) return;

  var root = document.documentElement;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add('stack-static');
    return;
  }

  var wake = function () {};
  var seepPending = false;

  // depth(vh): how far the card slides over its base. A base taller than the screen pins once its
  // bottom edge reaches the bottom of the screen and stays pinned for exactly that many pixels.
  var heroCopy = hero.querySelector('.hero-copy');
  // A card covering a section with a zone slides over an empty zone added under that section's
  // content. Lion wants the pages tight, so the zone is small: never more than a seventh of the
  // screen, so it does not read as a gap while it waits for the card.
  // `deep` is the ride into Logistics, a touch longer than the others so the convoy is seen; Lion
  // finds any empty strip under the content too big, so it stays small (v25, v35).
  function zoneDepth(section, vh, deep) {
    var wraps = section.querySelectorAll('.wrap');
    var body = wraps[wraps.length - 1]; // the content ends with the last wrap
    var content = (body ? body.offsetTop + body.offsetHeight : section.offsetHeight / 2) + 40;
    if (deep) return Math.max(100, Math.min(content / 3, vh * 0.16, 140));
    // shallow: the last cards only ride a little (Lion wants these sections compact)
    return Math.max(56, Math.min(content / 5, vh * 0.09));
  }
  // Restart a one-shot CSS animation that hangs off a class.
  function replay(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }
  var pairs = [{
    base: hero,
    card: brands,
    once: true,
    at: 0, // fire as soon as the edge shows
    depth: function (vh) {
      var h = hero.offsetHeight;
      // the middle of the card's edge stands --rise above the card (style.css), keep it off the buttons too
      var rise = Math.min(44, Math.max(28, window.innerWidth * 0.032));
      var gap = (window.innerWidth < 700 ? 40 : 56) + rise;
      var bottom = heroCopy ? heroCopy.offsetTop + heroCopy.offsetHeight : h / 2;
      return Math.max(120, Math.min(h - bottom - gap, vh * 0.5));
    },
    enter: function () { seepPending = true; wake(); }
  }];
  if (network) {
    pairs.push({
      base: brands,
      card: network,
      zone: true,
      at: 0.22, // wait until the edge is well up the screen, so the whole effect is seen
      depth: function (vh) { return zoneDepth(brands, vh); },
      enter: function () { replay(network, 'is-glint'); }
    });
  }
  if (network && logistics) {
    pairs.push({
      base: network,
      card: logistics,
      zone: true,
      at: 0.02, // the convoy sets off as soon as the edge starts to cover the zone, so it rides with it
      depth: function (vh) { return zoneDepth(network, vh, true); },
      enter: function () { replay(logistics, 'is-rolling'); }
    });
  }
  if (logistics && events) {
    pairs.push({
      base: logistics,
      card: events,
      zone: true,
      at: 0.22,
      depth: function (vh) { return zoneDepth(logistics, vh); },
      enter: function () { replay(events, 'is-meeting'); }
    });
  }
  // The last two cards ride a little too (Lion), with no effect of their own.
  if (events && team) {
    pairs.push({ base: events, card: team, zone: true, at: 0.22,
      depth: function (vh) { return zoneDepth(events, vh); }, enter: function () {} });
  }
  if (team && contact) {
    pairs.push({ base: team, card: contact, zone: true, at: 0.22,
      depth: function (vh) { return zoneDepth(team, vh); }, enter: function () {} });
  }
  pairs.forEach(function (pr) { pr.armed = true; });

  function layout() {
    var vh = window.innerHeight;
    pairs.forEach(function (pr) {
      var pin = pr.base.parentNode;
      pr.d = Math.round(pr.depth(vh));
      if (pr.zone) pr.base.style.setProperty('--zone', pr.d + 'px');
      pin.style.setProperty('--overlap', pr.d + 'px');
      pin.nextElementSibling.style.marginTop = -pr.d + 'px';
      // A short section pins with its content just under the fixed header, whatever its top padding;
      // a tall one pins with its bottom at the screen's bottom.
      var under = 0;
      if (pr.base !== hero && header) {
        var padTop = parseFloat(getComputedStyle(pr.base).paddingTop) || 0;
        under = Math.max(0, header.offsetHeight + 8 - padTop);
      }
      pr.base.style.top = Math.min(under, vh - pr.base.offsetHeight) + 'px';
    });
  }

  function update() {
    var vh = window.innerHeight;
    pairs.forEach(function (pr) {
      var br = pr.base.getBoundingClientRect();
      var cr = pr.card.getBoundingClientRect();
      // Sinking scales toward the bottom edge, so bottoms are stable; derive the card's top from its own.
      var top = cr.bottom - pr.card.offsetHeight;
      var p = Math.min(1, Math.max(0, (br.bottom - top) / pr.d));
      if (p * pr.d > pr.d - 1) p = 1; // within a pixel: snap, so rounding never leaves it short
      pr.base.style.setProperty('--sink', p.toFixed(4));
      pr.card.style.setProperty('--cover', p.toFixed(4));
      if (pr.base === hero) hero.classList.toggle('is-covered', top <= 0);
      if (pr.armed && p > 0.02 && top > 70 && top < vh * (1 - pr.at) + 10) { pr.armed = false; pr.enter(); }
      if (!pr.once && p <= 0) pr.armed = true;
    });
  }

  root.classList.add('stack-ready');
  layout();
  update();
  window.addEventListener('scroll', update, { passive: true });

  // ---------- smoke ----------
  var smoke = !!(canvas && canvas.getContext);
  var seam = smoke && canvas.parentNode;
  var ctx = smoke && canvas.getContext('2d');
  var RES = 0.5; // smoke is soft, so half resolution looks the same and keeps fill cost low
  var cssW = 0, cssH = 0, edgeY = 0, unit = 1;
  function size() {
    if (!smoke) return;
    cssW = canvas.clientWidth;
    cssH = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(cssW * RES));
    canvas.height = Math.max(1, Math.round(cssH * RES));
    edgeY = cssH * (parseFloat(canvas.dataset.edge) || 0.8);
    unit = Math.min(1, Math.max(0.5, cssW / 1280));
  }
  size();
  function relayout() { layout(); update(); size(); }
  window.addEventListener('resize', relayout);
  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(relayout);
    pairs.forEach(function (pr) { ro.observe(pr.base); });
  }
  if (!smoke) return;

  // Puff sprites: a lumpy cloud of soft lobes, eaten away by noise so the rim tears into wisps
  function makePuff() {
    var S = 128;
    function lattice(N) {
      var lat = new Float32Array(N * N);
      for (var i = 0; i < lat.length; i++) lat[i] = Math.random();
      return function (x, y) {
        var xi = Math.floor(x), yi = Math.floor(y);
        var xf = x - xi, yf = y - yi;
        var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
        var x0 = xi % N, y0 = yi % N, x1 = (x0 + 1) % N, y1 = (y0 + 1) % N;
        var a = lat[y0 * N + x0], b = lat[y0 * N + x1], c = lat[y1 * N + x0], d = lat[y1 * N + x1];
        return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
      };
    }
    var n4 = lattice(4), n8 = lattice(8), n16 = lattice(16), m6 = lattice(6), m12 = lattice(12);
    var lobes = [];
    for (var j = 0; j < 10; j++) {
      var r = 0.16 + Math.random() * 0.18;
      lobes.push([gauss() * 0.28, gauss() * 0.28, 1 / (2 * r * r), 0.5 + Math.random() * 0.5]);
    }
    var alpha = new Float32Array(S * S), max = 0;
    for (var y = 0, k = 0; y < S; y++) {
      for (var x = 0; x < S; x++, k++) {
        var px = (x + 0.5) / S * 2 - 1, py = (y + 0.5) / S * 2 - 1;
        var dens = 0;
        for (var l = 0; l < lobes.length; l++) {
          var dx = px - lobes[l][0], dy = py - lobes[l][1];
          dens += Math.exp(-(dx * dx + dy * dy) * lobes[l][2]) * lobes[l][3];
        }
        var edge = Math.pow(Math.max(0, 1 - Math.sqrt(px * px + py * py)), 0.8);
        var u = x / S, w = y / S;
        var n = 0.5 * n4(u * 4, w * 4) + 0.3 * n8(u * 8, w * 8) + 0.2 * n16(u * 16, w * 16);
        var m = 0.5 * m6(u * 6, w * 6) + 0.5 * m12(u * 12, w * 12);
        var a = Math.max(0, dens * edge * (0.15 + 1.1 * n) * (0.55 + 0.9 * m) - 0.04);
        alpha[k] = a;
        if (a > max) max = a;
      }
    }
    var c = document.createElement('canvas');
    c.width = c.height = S;
    var g = c.getContext('2d');
    var im = g.createImageData(S, S), d = im.data;
    for (var i = 0; i < alpha.length; i++) {
      d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 255;
      d[i * 4 + 3] = alpha[i] / max * 230;
    }
    g.putImageData(im, 0, 0);
    return c;
  }
  function gauss() {
    return (Math.random() + Math.random() + Math.random() - 1.5) / 0.5;
  }
  var sprites = null;
  var puffs = [];
  var flash = 0;

  // An even band along the whole edge: a quick front of puffs that rush out and slow down,
  // and a slower layer behind them that lingers a little longer and fades.
  function seep() {
    if (!sprites) sprites = [makePuff(), makePuff(), makePuff(), makePuff()];
    var step = 3 + 11 * unit;
    for (var x = -24; x < cssW + 24; x += step) {
      for (var layer = 0; layer < 2; layer++) {
        var front = layer === 0;
        var sp = (front ? 300 + Math.random() * 220 : 90 + Math.random() * 110) * unit;
        var a = -Math.PI / 2 + (Math.random() - 0.5) * 0.9;
        puffs.push({
          x: x + Math.random() * step,
          y: edgeY + 2,
          vx: Math.cos(a) * sp + (Math.random() - 0.5) * 60 * unit,
          vy: Math.sin(a) * sp,
          s0: (28 + Math.random() * 30) * unit,
          grow: (front ? 150 + Math.random() * 150 : 110 + Math.random() * 120) * unit,
          life: front ? 1.1 + Math.random() * 0.6 : 1.8 + Math.random() * 0.8,
          age: -Math.random() * 0.3 - (front ? 0 : 0.12),
          peak: front ? 0.2 + Math.random() * 0.12 : 0.15 + Math.random() * 0.1,
          rot: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 1.2,
          img: sprites[(Math.random() * sprites.length) | 0]
        });
      }
    }
    flash = 0.85;
    jetOn = true; jet = 0; jetNext = 0.08; // then keep blowing (Lion, v56)
  }

  // After the first burst the edge keeps blowing hard for JET seconds (Lion: about 3.5 s, as if
  // the steam is pushed out from below), in quick waves of upward puffs; the blowing eases off over
  // the last part and the steam already out lifts and dissolves as before.
  var JET = 3.5, JET_EASE = 0.8, JET_STEP = 0.12;
  var jetOn = false, jet = 0, jetNext = 0;
  function jetStrength(t) {
    if (t < 0 || t >= JET) return 0;
    if (t > JET - JET_EASE) { var e = (JET - t) / JET_EASE; return e * e * (3 - 2 * e); }
    return 1;
  }
  function blow(str) {
    var step = (3 + 11 * unit) * 4;
    for (var x = -24; x < cssW + 24; x += step) {
      if (Math.random() > 0.5 + 0.5 * str) continue;
      var sp = (480 + Math.random() * 320) * (0.6 + 0.4 * str) * unit;
      var a = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
      puffs.push({
        x: x + Math.random() * step,
        y: edgeY + 2,
        vx: Math.cos(a) * sp + (Math.random() - 0.5) * 50 * unit,
        vy: Math.sin(a) * sp,
        s0: (34 + Math.random() * 34) * unit,
        grow: (170 + Math.random() * 170) * unit,
        life: 1.2 + Math.random() * 0.8,
        age: -Math.random() * JET_STEP,
        peak: (0.09 + Math.random() * 0.06) * (0.4 + 0.6 * str),
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 1.4,
        img: sprites[(Math.random() * sprites.length) | 0]
      });
    }
  }

  var running = false;
  var last = 0;

  function frame(now) {
    var dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); // rAF time can trail performance.now()
    last = now;

    if (seepPending) { seepPending = false; seep(); }
    if (jetOn) {
      jet += dt;
      while (jet >= jetNext && jetNext < JET) {
        var str = jetStrength(jetNext);
        if (str > 0.02) blow(str);
        jetNext += JET_STEP;
      }
      flash = Math.max(flash, 0.85 * jetStrength(jet)); // the edge glows while it blows
      if (jet >= JET) jetOn = false;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var drag = Math.exp(-3.2 * dt);
    var lift = 50 * unit * dt;
    var norm = 1 / (1 - Math.exp(-3.2));
    for (var i = puffs.length - 1; i >= 0; i--) {
      var p = puffs[i];
      p.age += dt;
      if (p.age < 0) continue;
      var k = p.age / p.life;
      if (k >= 1) { puffs[i] = puffs[puffs.length - 1]; puffs.pop(); continue; }
      p.vx *= drag;
      p.vy = p.vy * drag - lift;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      var s = p.s0 + p.grow * (1 - Math.exp(-3.2 * k)) * norm;
      var al = (k < 0.08 ? k / 0.08 : Math.pow((1 - k) / 0.92, 1.6)) * p.peak;
      // fast puffs are streaked along their path, then relax into round clouds
      var speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      var st = 1 + Math.min(0.8, speed / (450 * unit));
      var dir = Math.atan2(p.vy, p.vx);
      var cs = Math.cos(dir) * RES, sn = Math.sin(dir) * RES;
      ctx.setTransform(cs * st, sn * st, -sn, cs, p.x * RES, p.y * RES);
      ctx.rotate(p.rot);
      ctx.globalAlpha = al;
      ctx.drawImage(p.img, -s / 2, -s / 2, s, s);
    }
    ctx.globalAlpha = 1;

    flash *= Math.exp(-1.6 * dt);
    seam.style.setProperty('--rev', flash < 0.005 ? '0' : flash.toFixed(3));

    if (puffs.length || flash > 0.005 || jetOn) {
      requestAnimationFrame(frame);
    } else {
      running = false;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  wake = function () {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  };
  if (seepPending) wake();
})();
