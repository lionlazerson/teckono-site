// Events background video: plays only while the section is near the screen, never on
// reduced motion or data-saver; the poster frame (style.css) stands in otherwise.
(function () {
  'use strict';
  var box = document.querySelector('.video-bg');
  var video = box && box.querySelector('video');
  if (!video) return;
  var conn = navigator.connection;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || (conn && conn.saveData)) { video.remove(); return; }
  function play() {
    video.preload = 'auto';
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
  }
  if (!('IntersectionObserver' in window)) { play(); return; }
  new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting) play(); else video.pause();
  }, { rootMargin: '500px 0px' }).observe(box);
})();
