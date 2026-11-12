// Put this <script> BEFORE the app code in a throw-away test page.
// requestAnimationFrame does not tick under `--virtual-time-budget`, in a hidden preview pane,
// or in a headless iframe, so rAF-driven animations freeze on frame 1. setTimeout does tick there.
(function () {
  var t0 = Date.now();
  window.requestAnimationFrame = function (cb) { return setTimeout(function () { cb(Date.now() - t0); }, 16); };
  window.cancelAnimationFrame = function (id) { clearTimeout(id); };
})();
