# hook：页面自己推、自己截、顺便记数

`shim` 能录画面，但拿不到模型里面的数（骨头角度、胯的位置、脚有没有滑）。要这些，或者应用本身有一个能按固定步长调用的「走一帧」函数，就在测试页里写一个录制函数，`record.mjs --clock hook` 调它。

## 约定

```js
// 页面上：
window.__capture = async ({ variant, fps, seconds }) => {
  // …按 1000/fps 毫秒一步推 seconds 秒，每帧截一张、记一行数…
  return { frames: ["data:image/png;base64,…", …], trace: [{ t: 0, knee: 1.2, … }, …] };
  // 只要画面时也可以直接返回 frames 数组
};
```

`record.mjs` 把 `frames` 存成 `<out>/<变体>/0000.png …`，`trace` 存成 `<out>/<变体>/trace.json`。变体用 URL 参数切（`?v=off`），录制函数里不用管变体是什么，`variant` 只是告诉你名字。

## 写法（three.js / VRM，实测过）

要点：先停掉应用自己的 rAF 循环（不然它在后台接着跑，把状态往前推，还抢 CPU）；然后自己调它每帧的函数，给它均匀递增的时间；在「刚画完、还没把叠加的东西减回去」的回调里读骨头、截画面。

```ts
// 测试页（不进 git）。pet 是应用里每帧自己调 frame(now) 的那个对象；raf、last 是它的私有字段，测试页里直接摸。
type Driven = { frame: (now: number) => void; raf: number; last: number };

function tick(p: VrmPet, now: number, keep: boolean) {
  const d = p as unknown as Driven;
  let out: { png: string; row: Record<string, number> } | null = null;
  p.onRendered = () => {
    if (!keep) return;
    const src = p.inspect().canvas;
    const c = document.createElement("canvas");
    c.width = src.width;
    c.height = src.height;
    const g = c.getContext("2d")!;
    g.fillStyle = "#f2f2f2"; // 透明背景先铺一层底色，GIF 里才不是黑的
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(src, 0, 0);
    const h = p.inspect().vrm.humanoid;
    out = { png: c.toDataURL("image/png"), row: { t: now, shoulder: h.getNormalizedBoneNode("rightShoulder")!.rotation.z * 57.3 } };
  };
  d.frame(now); // 里面会再要一个 rAF：马上取消
  cancelAnimationFrame(d.raf);
  p.onRendered = () => {};
  return out;
}

window.__capture = async ({ fps, seconds }) => {
  const p = window.pet;
  const d = p as unknown as Driven;
  cancelAnimationFrame(d.raf);
  const step = 1000 / fps;
  let now = performance.now();
  d.last = now;
  for (let i = 0; i < fps * 1.5; i++) tick(p, (now += step), false); // 空跑一秒半：弹簧、淡入停稳
  p.playClip("wave", false);
  const frames = [], trace = [];
  for (let i = 0; i < fps * seconds; i++) {
    const r = tick(p, (now += step), true);
    if (r) { frames.push(r.png); trace.push(r.row); }
    await new Promise((r) => setTimeout(r, 0)); // 让出去一下，页面不卡死
  }
  return { frames, trace };
};
```

（`hook` 不注入假时钟，所以这里的 `performance.now`、`setTimeout` 是真的；时间轴靠我们传进 `frame(now)` 的值，和真实时间无关。）

## 记哪些数

挑「改动想影响的」和「不该被影响的」各几样：

- 想影响的：比如带动层要让肩膀跟着抬——记肩膀角度，看开着时有、关着时 0。
- 不该被影响的：比如脚应该踩在原地——逐帧记两只脚在世界里的位置，最大挪动应小于 1 毫米；动捕的动作开关前后应该一样。
- 停下以后：所有叠加量要回到 0（不播动作时什么都不加）。

拿到 `trace.json` 后，先算每列的最大、最小、最后一帧，和预期比；不对就改，对了再出 GIF。这一步常常能找到 GIF 看不出来的问题（比如慢动作时一直半蹲着）。

## 静态对比截图

只要一张图对比（不是 GIF）时，不要「播放、等几秒、截」：低帧率下每次等到的位置不一样。直接把动画片段拨到那个时刻再暂停（three.js：`action.time = t; action.paused = true;`），等叠加层（弹簧）停稳再截。
