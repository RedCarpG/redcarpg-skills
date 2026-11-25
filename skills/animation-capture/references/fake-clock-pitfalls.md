# 假时钟下的坑：页面卡死、等不到、截到一半

`record.mjs` 的 `shim` 和 Playwright 的 `page.clock.install()` + `pauseAt()` 都是「时间停着，我们拨才走」。页面里凡是假设时间自己会走的代码，在这里都会出事。下面的坑大多是在 Playwright 页面测试、截图脚本里踩到的；标了「Playwright」的只在 `page.clock` 下有，`shim` 已经处理了。（2026-11-24 从 lessons 收进来。）

## 页面卡死：只按时间切片、按时间限时的循环

- **症状：** 测试只表现为超时；截图脚本像卡住了；渲染进程一直 100% 占 CPU。
- **原因：** 「切成小段算、每段让出主线程」常写成 `const end = performance.now() + 10; while (performance.now() < end) step()`。一段里时间不动，while 永远不退。游戏 AI、搜索、分析按 `Date.now()` / `performance.now()` 限时，同理永远到不了截止时间。
- **改页面（推荐）：** 每段加一个步数上限：`let n = 0; while (++n <= 20000 && performance.now() < end)`。上限在真时钟下量一下一段实际走几步，取远高于它的数，平时碰不到。要限时的搜索，把因步数提前让出时没用掉的时间记下来补进它自己的钟，不然假时钟下永远算不到截止。
- **改不了页面：** 给页面留一个测试钩子，把这类后台计算停掉或不起。钩子要在**触发计算的那个回调里当场调**（比如落子回调里），在 `page.evaluate` 里事后再调赶不上：计算已经在同一个任务里开始了。录「我走一步」这类帧，先让对手 AI 停下（或者先装好它的应手），再拨时钟。
- **找卡在哪：** 用 CDP 的 `Debugger.pause` 直接拿到卡住时的调用栈。

## 等不到：页面里的等待也归假时钟管

- **`page.waitForFunction`**（Playwright）在页面里用 `setTimeout` 轮询，假时钟换掉了 `setTimeout`，它永远等不到。改成 Node 这边每 100 毫秒 `page.evaluate` 问一次。`record.mjs --ready` 已经是这么做的。
- **`await new Promise(requestAnimationFrame)`** 在 `page.evaluate` 里会一直卡住：rAF 也归假时钟管，只能拨时钟（`page.clock.runFor()`）。
- **Web Animations 的 `finish()`**：调了以后，`finish` 事件也要拨一下时钟才触发。

## 截到一半：Playwright 的 `page.clock` 管不到 CSS 过渡

- `page.clock` 只接管 JS 计时器和 `performance.now()`。CSS transition / animation 照真时间走：截「动作之前」那一帧时，刚收起的面板还在过渡中，是糊的。只 `runFor()` 没用。没显卡（SwiftShader）时页面更慢，过渡要拖很久。（`shim` 会把 CSS / WAAPI 动画停住拨到同一时刻，没这个问题。）
- **办法一：** 截静帧时注入 `* { transition: none !important }`。要录过渡本身的另外处理（换 `record.mjs` 的 `shim`）。
- **办法二：** Node 这边每 100 毫秒轮询一次，为 false 就截（设个上限）：
  ```js
  await page.evaluate(() => document.getAnimations().some(a => a.playState === "running" && a instanceof CSSTransition))
  ```
  比固定真等几百毫秒稳。
- **音频：** `AudioContext.currentTime` 照真时间走（`shim` 也不管）。断言「跳到最后时还没响的声音不再补响」这类，机器快慢会改变哪几声已经响过：断言留余量（「至少跳过那一声」），或者看声音层自己的计数，别拿音频时钟和假时钟对齐。

## 画面不对：会整块重画的 DOM、分层的效果

- **整块重画的 DOM：** 往侧边栏这种状态一变就整块重画的地方做动画（比如东西飞进某一格），重画那一下会直接闪成最后的样子。让重画的代码调一个钩子，照动画此刻的样子画（比如这一格先按动画进度画淡一点）。
- **底层藏、上层画：** 底层同步重画时先不画「被拿起」的东西，上面的效果层要等下一个 rAF 才画第一帧，中间空一帧，东西闪一下。真机 16 毫秒常常看不出来，但会被说「有点跳」。起效果的函数里**同步画第一帧**再挂 rAF。录 GIF / 静帧时一定看 t=0 那一帧（触发之后、还没拨时钟就截），东西在不在。

## 写脚本的小坑

- **vitest 改写 `import()`：** 在 vitest 里写 `page.evaluate(() => import("/x.js"))`，函数里的 `import()` 会被改成 `__vite_ssr_dynamic_import__`，到浏览器里报错。把整段当字符串传：`page.evaluate('import("/x.js").then(m => window.__m = m)')`。
- **没显卡时截 WebGL 页面很慢：** 慢在每一帧都要在 CPU 上把整张大画布合成一遍，不在着色器。拨 1.5–3 秒、约 60 帧/秒，一张静帧要 30 秒到 1 分钟。自己写的截图脚本默认走显卡（`--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist`，`record.mjs` 默认就是），留一个软件渲染的开关给 CI 或要逐机器一致的场合；1 倍像素、只截动的那一块、用 `finish()` 跳到要的帧。实测一张静帧 35 秒 → 4 秒，逐帧对比 75 秒 → 7 秒。带大 WebGL 画布的无头浏览器一个约 0.7–2 GB，本机页面测试用 `--maxWorkers=1`。
