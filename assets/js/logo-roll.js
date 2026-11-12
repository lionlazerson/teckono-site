// Brand wall: the logos roll slowly from top to bottom in a loop. Under the pointer the roll stops
// and the wheel scrolls the wall instead. The wall is a real scroll box with two copies of the
// logos, so the wheel reaches an end and then scrolls the page on, as any scroll box does; the
// loop is kept endless by jumping one copy up or down while nobody is looking.
// Without JS, or with reduced motion, style.css handles the wall.
(function () {
  'use strict';
  var box = document.querySelector('.logo-scroll');
  var roll = box && box.querySelector('.logo-roll');
  if (!box || !roll || roll.children.length < 2) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var SPEED = 18; // px per second
  var hover = window.matchMedia('(hover: hover)').matches;
  box.classList.add('is-rolling');
  if (!hover) box.classList.add('no-hover');

  function pitch() { return roll.offsetHeight / 2; } // height of one copy of the wall
  function max() { return box.scrollHeight - box.clientHeight; }

  var pos = max();
  box.scrollTop = pos;

  // Keep the offset within the last copy's length of the end: the same logos sit one copy up,
  // so the jump is invisible, and a visitor who wheels down meets the end (and the page) soon.
  function wrap() {
    var p = pitch(), m = max();
    if (pos < m - p) pos += p;
    else if (pos > m) pos = m;
    box.scrollTop = pos;
  }

  var paused = false, visible = true, last = null;
  box.addEventListener('mouseenter', function () { paused = true; });
  box.addEventListener('mouseleave', function () { paused = false; last = null; wrap(); });
  box.addEventListener('scroll', function () {
    var st = box.scrollTop;
    if (Math.abs(st - pos) > 1) { pos = st; if (!paused) wrap(); } // a real scroll, not our own frame
  }, { passive: true });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; last = null; }).observe(box);
  }

  function frame(t) {
    if (visible && !paused) {
      if (last !== null) { pos -= SPEED * Math.min(0.1, (t - last) / 1000); wrap(); }
      last = t;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
