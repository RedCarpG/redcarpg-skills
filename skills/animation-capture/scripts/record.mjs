#!/usr/bin/env node
// 把网页上的动画按固定时间一帧一帧录成 PNG（每个变体一个文件夹），给 make_gif.py 拼对比 GIF。
// 不要依赖：Node 22+（自带 WebSocket、fetch），本机装了 Chrome 或 Edge。
//
// 两种「时钟」（--clock）：
//   shim（默认）  在页面脚本之前注入假时钟（clock-shim.js）：performance.now、Date.now、rAF、setTimeout/setInterval
//                 只在我们推的时候走，CSS 过渡、CSS 动画、element.animate() 每帧拨到同一时刻。页面不用改，
//                 网页动画、three.js、PixiJS 自己的循环都能这样录。每帧 = 推 1000/fps 毫秒 → 等画出来 → 截图（--clip 只截一块）。
//   hook          页面自己按固定步长推、自己截（要读模型里的数、要一边录一边记逐帧数值时）：页面上要有
//                 window.__capture({ variant, fps, seconds }) → string[]（每帧的 PNG data URL）
//                 或 { frames: string[], trace: any }（trace 存成 trace.json）。
// Chrome 自带的虚拟时间（Emulation.setVirtualTimePolicy）试过不可靠：rAF 拿到的时间和 performance.now 对不上，不用。
//
// 用法：
//   node record.mjs --out frames --fps 25 --seconds 2 --clip "#stage" \
//        --variant 关=http://127.0.0.1:5173/?v=a --variant 开=http://127.0.0.1:5173/?v=b
//   node record.mjs --out frames --clock hook --fps 25 --seconds 3 --variant 开=http://127.0.0.1:5173/lab.html
// 其他参数：--width 1000 --height 800（窗口）、--wait 毫秒（页面加载后先等，默认 500；hook 时等 __capture 出现）、
//   --ready "JS 表达式"（shim：页面里异步读的东西读好了没有，比如 window.model != null；不写就只等 load 事件；
//   等的时候假时钟不走，读的过程要靠 setTimeout 的加 --ready-advance 1）、
//   --setup "JS"（每个变体加载、走完 --wait 以后先跑一段，比如点开菜单、开始播动作；shim 时跑完马上开始录）、--scale 1（截图缩放）、--render gpu|cpu（默认 gpu）、--chrome 路径、--port 9335、--keep（录完不关 Chrome）。
// 输出：<out>/<变体名>/0000.png …，hook 时还有 <out>/<变体名>/trace.json。

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const opt = { clock: "shim", fps: 25, seconds: 2, width: 1000, height: 800, wait: 500, scale: 1, port: 9335, variants: [] };
for (let i = 0; i < args.length; i++) {
  const k = args[i].replace(/^--/, "");
  if (k === "keep") opt.keep = true;
  else if (k === "variant") {
    const v = args[++i];
    const eq = v.indexOf("=");
    opt.variants.push(eq > 0 && !/^https?:|^file:/.test(v) ? { label: v.slice(0, eq), url: v.slice(eq + 1) } : { label: `v${opt.variants.length + 1}`, url: v });
  } else opt[k] = args[++i];
}
for (const k of ["fps", "seconds", "width", "height", "wait", "scale", "port"]) opt[k] = Number(opt[k]);
if (!opt.out || opt.variants.length === 0) {
  console.error("需要 --out 和至少一个 --variant 名字=地址");
  process.exit(2);
}

const CANDIDATES = [
  process.env.CHROME,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
];
const chromePath = opt.chrome ?? CANDIDATES.find((p) => p && existsSync(p));
if (!chromePath) {
  console.error("找不到 Chrome/Edge，用 --chrome 指定");
  process.exit(2);
}

// 单独的配置目录：不碰平时用的浏览器。
// 渲染（--render）：gpu（默认）用显卡画 WebGL；cpu 用软件渲染（SwiftShader），没有显卡的机器、或要和以前录的逐帧比时用。
// 软件渲染画 three.js / VRM 会把好几个 CPU 核吃满几分钟（实测一帧 154 毫秒，显卡 8 毫秒）。没有显卡时 Chrome 自己退回 SwiftShader。
opt.render = opt.render ?? "gpu";
const renderFlags =
  opt.render === "cpu"
    ? ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"]
    : ["--enable-gpu", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"];
const profile = mkdtempSync(join(tmpdir(), "anim-capture-"));
const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    `--remote-debugging-port=${opt.port}`,
    "--remote-debugging-address=127.0.0.1",
    `--user-data-dir=${profile}`,
    `--window-size=${opt.width},${opt.height}`,
    "--force-device-scale-factor=1",
    "--hide-scrollbars",
    ...renderFlags,
    "about:blank",
  ],
  { stdio: "ignore" },
);
const cleanup = () => {
  if (opt.keep) return;
  try {
    chrome.kill();
  } catch {}
  // Chrome 退出要一会儿，这时删配置目录会 EPERM；删不掉就留在临时目录里，不报错
  setTimeout(() => {
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {}
  }, 500);
};
process.on("exit", cleanup);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(250);
  try {
    target = (await (await fetch(`http://127.0.0.1:${opt.port}/json`)).json()).find((t) => t.type === "page");
  } catch {}
}
if (!target) throw new Error(`Chrome 没在 ${opt.port} 端口起来（端口被占了？换 --port）`);

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let nextId = 0;
const waiters = new Map();
const events = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && waiters.has(m.id)) {
    const { resolve, reject } = waiters.get(m.id);
    waiters.delete(m.id);
    if (m.error) reject(new Error(`${m.error.message} ${m.error.data ?? ""}`));
    else resolve(m.result);
  } else if (m.method) events.push(m);
});
const call = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++nextId;
    waiters.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
const waitEvent = async (method, ms = 60000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const i = events.findIndex((e) => e.method === method);
    if (i >= 0) return events.splice(i, 1)[0];
    await sleep(10);
  }
  throw new Error(`等不到 ${method}`);
};
const evaluate = async (expression) => {
  const r = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, timeout: 600000 });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails));
  return r.result.value;
};

await call("Page.enable");
await call("Runtime.enable");
const renderer = await evaluate(
  `(() => { const gl = document.createElement('canvas').getContext('webgl'); if (!gl) return '没有 WebGL'; const x = gl.getExtension('WEBGL_debug_renderer_info'); return x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); })()`,
);
console.log(`WebGL 渲染：${renderer}${/swiftshader/i.test(renderer) ? "（软件渲染，CPU 会很忙）" : ""}`);
if (opt.clock === "shim") {
  const shim = (await import("node:fs")).readFileSync(join(dirname(fileURLToPath(import.meta.url)), "clock-shim.js"), "utf8");
  await call("Page.addScriptToEvaluateOnNewDocument", { source: shim });
}
const step = 1000 / opt.fps;
const count = Math.round(opt.seconds * opt.fps);
const save = (dir, i, b64) => writeFileSync(join(dir, `${String(i).padStart(4, "0")}.png`), Buffer.from(b64, "base64"));

async function clipRect() {
  if (!opt.clip) return undefined;
  const r = await evaluate(`(() => { const e = document.querySelector(${JSON.stringify(opt.clip)}); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left + scrollX, y: b.top + scrollY, width: b.width, height: b.height }; })()`);
  if (!r) throw new Error(`页面上没有 ${opt.clip}`);
  return { ...r, scale: opt.scale };
}
const shot = async (clip) => (await call("Page.captureScreenshot", { format: "png", ...(clip ? { clip } : {}), captureBeyondViewport: false })).data;

for (const { label, url } of opt.variants) {
  const dir = join(opt.out, label);
  mkdirSync(dir, { recursive: true });
  events.length = 0;

  if (opt.clock === "shim") {
    await call("Page.navigate", { url });
    await waitEvent("Page.loadEventFired");
    if (!(await evaluate("typeof window.__advance === 'function'"))) throw new Error("假时钟没注入上（页面是不是在加载前就跳转了？）");
    // 模型、贴图是异步读的：真实时间里等 --ready 成立。等的时候假时钟不动：动了的话每次读得快慢不同，
    // 开始录时的时间、随机数用到哪都不一样，两次录的就对不上（实测过）。读的过程要靠定时器的页面才加 --ready-advance。
    if (opt.ready) {
      let ok = false;
      for (let i = 0; i < 600 && !ok; i++) {
        ok = Boolean(await evaluate(`Boolean(${opt.ready})`));
        if (!ok) {
          if (opt["ready-advance"]) await evaluate(`window.__advance(${step})`);
          await sleep(100);
        }
      }
      if (!ok) throw new Error(`等了 60 秒 --ready 还不成立：${opt.ready}`);
    }
    // 加载后先走 --wait 毫秒（假时间）：页面里的定时器、入场动画按这个时间走
    for (let t = 0; t < opt.wait; t += step) await evaluate(`window.__advance(${Math.min(step, opt.wait - t)})`);
    if (opt.setup) await evaluate(`(async () => { ${opt.setup}; })()`);
    const clip = await clipRect();
    for (let i = 0; i < count; i++) {
      if (i > 0) await evaluate(`window.__advance(${step})`);
      else await evaluate("window.__advance(0)");
      await evaluate("window.__painted()");
      save(dir, i, await shot(clip));
    }
  } else {
    await call("Page.navigate", { url });
    await waitEvent("Page.loadEventFired");
    if (opt.clock === "hook") {
      const ok = await evaluate(`(async () => { for (let i = 0; i < ${Math.max(1, Math.ceil(opt.wait / 100))} && typeof window.__capture !== "function"; i++) await new Promise((r) => setTimeout(r, 100)); return typeof window.__capture === "function"; })()`);
      if (!ok) throw new Error(`${url} 上没有 window.__capture（--wait 加长，或者页面没写录制函数）`);
      if (opt.setup) await evaluate(`(async () => { ${opt.setup}; })()`);
      const got = await evaluate(`window.__capture(${JSON.stringify({ variant: label, fps: opt.fps, seconds: opt.seconds })})`);
      const frames = Array.isArray(got) ? got : got.frames;
      frames.forEach((f, i) => save(dir, i, f.slice(f.indexOf(",") + 1)));
      if (!Array.isArray(got) && got.trace !== undefined) writeFileSync(join(dir, "trace.json"), JSON.stringify(got.trace, null, 1));
    } else throw new Error(`不认识的 --clock ${opt.clock}（shim 或 hook）`);
  }
  console.log(`${label}: ${dir}`);
}
ws.close();
cleanup();
process.exit(0);
