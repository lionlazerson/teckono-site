// Card stack for the sub-pages (Partner Portal): the same ride as the home page, without its
// hero and effects. Inside #stack, each section wrapped in a .pin stays pinned while the next
// card slides a little over its lower part (an empty zone added under the content), then they
// scroll on together. The covered section sinks back slightly (--sink), the card gets --cover.
(function () {
  'use strict';

  var stack = document.getElementById('stack');
  var header = document.getElementById('site-header');
  if (!stack) return;
  var root = document.documentElement;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add('stack-static');
    return;
  }

  var pairs = [];
  var pins = stack.querySelectorAll('.pin');
  for (var i = 0; i < pins.length; i++) {
    var pin = pins[i];
    var base = pin.querySelector('section');
    var next = pin.nextElementSibling;
    var card = next && (next.classList.contains('pin') ? next.querySelector('section') : next);
    if (base && card && card.classList.contains('card')) pairs.push({ pin: pin, base: base, card: card, d: 0 });
  }
  if (!pairs.length) return;

  // the zone under the content that the next card slides over: small, as on the home page
  function zoneDepth(section, vh) {
    var wraps = section.querySelectorAll('.wrap');
    var body = wraps[wraps.length - 1];
    var content = (body ? body.offsetTop + body.offsetHeight : section.offsetHeight / 2) + 40;
    return Math.max(56, Math.min(content / 5, vh * 0.09));
  }

  function layout() {
    var vh = window.innerHeight;
    pairs.forEach(function (pr) {
      pr.d = Math.round(zoneDepth(pr.base, vh));
      pr.base.style.setProperty('--zone', pr.d + 'px');
      pr.pin.style.setProperty('--overlap', pr.d + 'px');
      pr.pin.nextElementSibling.style.marginTop = -pr.d + 'px';
      // a short section pins with its content just under the header, a tall one with its bottom at the screen's bottom
      var padTop = parseFloat(getComputedStyle(pr.base).paddingTop) || 0;
      var under = header ? Math.max(0, header.offsetHeight + 8 - padTop) : 0;
      pr.base.style.top = Math.min(under, vh - pr.base.offsetHeight) + 'px';
    });
  }

  function update() {
    pairs.forEach(function (pr) {
      var br = pr.base.getBoundingClientRect();
      var cr = pr.card.getBoundingClientRect();
      var top = cr.bottom - pr.card.offsetHeight; // the sink scales toward the bottom edge, so bottoms are stable
      var p = Math.min(1, Math.max(0, (br.bottom - top) / pr.d));
      if (p * pr.d > pr.d - 1) p = 1;
      pr.base.style.setProperty('--sink', p.toFixed(4));
      pr.card.style.setProperty('--cover', p.toFixed(4));
    });
  }

  root.classList.add('stack-ready');
  layout();
  update();
  window.addEventListener('scroll', update, { passive: true });
  function relayout() { layout(); update(); }
  window.addEventListener('resize', relayout);
  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(relayout);
    pairs.forEach(function (pr) { ro.observe(pr.base); ro.observe(pr.card); });
  }
})();
