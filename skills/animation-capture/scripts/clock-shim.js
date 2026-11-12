// 假时钟：在页面自己的脚本之前注入（record.mjs 用 Page.addScriptToEvaluateOnNewDocument），
// 页面里的时间只在 window.__advance(ms) 时往前走：performance.now、Date.now、requestAnimationFrame、
// setTimeout/setInterval 都跟着它；CSS 过渡、CSS 动画、element.animate() 每次也停住、拨到同一个时间。
// 所以不管机器多慢、截图多慢，每一帧之间都正好是 ms 毫秒，两个变体逐帧对得上。
(() => {
  if (window.__advance) return;
  let now = 0;
  const base = Date.now();
  const realRAF = window.requestAnimationFrame.bind(window);
  const realNow = performance.now.bind(performance);
  let seq = 0;
  let rafs = new Map();
  const timers = new Map();
  // 每个 Web Animation 第一次看到时，假时钟在哪、它自己走到哪
  const seen = new WeakMap();

  // 随机数也固定（同一个种子）：眨眼、待机挑哪个之类的随机，两个变体走一样的序列
  let seed = 0x9e3779b9;
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  performance.now = () => now;
  Date.now = () => base + now;
  window.requestAnimationFrame = (cb) => {
    const id = ++seq;
    rafs.set(id, cb);
    return id;
  };
  window.cancelAnimationFrame = (id) => rafs.delete(id);
  const addTimer = (cb, ms, args, repeat) => {
    const id = ++seq;
    const every = Math.max(0, Number(ms) || 0);
    timers.set(id, { cb, at: now + every, every, args, repeat });
    return id;
  };
  window.setTimeout = (cb, ms, ...args) => addTimer(cb, ms, args, false);
  window.setInterval = (cb, ms, ...args) => addTimer(cb, ms, args, true);
  window.clearTimeout = window.clearInterval = (id) => timers.delete(id);

  function runTimers(until) {
    for (;;) {
      let next = null;
      for (const [id, t] of timers) if (t.at <= until && (!next || t.at < next[1].at)) next = [id, t];
      if (!next) return;
      const [id, t] = next;
      now = t.at;
      if (t.repeat) t.at += Math.max(1, t.every);
      else timers.delete(id);
      try {
        typeof t.cb === "function" ? t.cb(...t.args) : (0, eval)(String(t.cb));
      } catch (e) {
        console.error(e);
      }
      // 定时器里加了 class、调了 animate() 的：就在这个假时刻接住，不等这一步走完
      seekAnimations();
    }
  }

  // 第一次看到一个动画，就当它在这个假时刻刚开始（从 0 算）。不用它当时的 currentTime：
  // 页面加载时开始的动画，在我们接住之前已经按真实时间跑了几毫秒，每次、每个变体都不一样（实测差 16.6 ms）。
  // 每次跑完定时器、rAF 回调都看一遍，新动画在它被创建的那个假时刻就被接住。
  function seekAnimations() {
    for (const a of document.getAnimations()) {
      if (!seen.has(a)) {
        seen.set(a, { at: now, from: 0 });
        a.pause();
      }
      const s = seen.get(a);
      a.currentTime = s.from + (now - s.at);
    }
  }

  /** 往前走 ms 毫秒：先跑到点的定时器，再跑一轮 rAF（一帧），再把 CSS / WAAPI 动画拨到这个时间。 */
  window.__advance = (ms) => {
    // 上一步之后（页面加载时、--setup 里）新出来的动画：在当前时刻接住
    seekAnimations();
    const target = now + ms;
    runTimers(target);
    now = target;
    const cbs = rafs;
    rafs = new Map();
    for (const cb of cbs.values()) {
      try {
        cb(target);
      } catch (e) {
        console.error(e);
      }
    }
    seekAnimations();
    return now;
  };
  /** 等浏览器真的画出来（用真的 rAF）。 */
  window.__painted = () => new Promise((r) => realRAF(() => realRAF(r)));
  window.__clock = () => now;
  window.__realNow = realNow;
})();
