# 动效：数值与做法

总原则：

- 慢，像墨在纸上洇开。
- **只动 transform 和 opacity**，以及独立的 `translate`、`scale`、`rotate` 属性，不重绘页面。
- 页面静止时不跑逐帧脚本。
- `prefers-reduced-motion: reduce` 时全部关掉。
- 打印时不出现。

代码在 `code/tianshu.css` 的第 ⑧、⑨ 节和 `code/immersive.js`（React 版在 `code/react.tsx`）。

## 一览

| 动效 | 做法 | 数值 |
|---|---|---|
| 景深视差 | 每层标 `data-depth`；用 CSS `translate` 属性移动；`requestAnimationFrame` 缓动，追上目标就停 | 最远一层移 16px（`reach`）；每帧走剩余距离的 8%（`ease`）；深度见下 |
| 烛光 | 一个 560px 的径向渐变圆，跟着鼠标，用视差同一套缓动 | 金 .085 → 35% 处 .03 → 65% 处透明；只在有鼠标的设备上 |
| 雾漂移 | CSS keyframes，`translateX` | ±4%，80s，ease-in-out，往返 |
| 光点明灭 | opacity | .1 ↔ .85，9s 往返，每点随机负延迟 |
| 主体呼吸 | opacity | .78 ↔ 1，5s 往返；小光点 .5 ↔ 1，4s |
| 外圈刻度旋转 | `rotate` | 一圈 240s，linear |
| 逐层亮起 | 根元素 `data-stage`，未到的层 `.cast-lN` 压到 opacity .05 | 每层 1100ms；opacity 过渡 .9s；中心大字先描轮廓再填满 1.1s |
| 说明行换句 | 新的一句从下方 4px 淡入 | .7s |
| 区块浮起 | 滚动驱动动画 `animation-timeline: view()` | 从 opacity 0、下移 16px 浮起；range `entry 0%` 到 `entry 55%` |
| 换页 | View Transitions | 旧页 .22s ease-in 淡出并上移 8px；新页 .6s 缓出、延迟 .06s，从下 16px 浮起 |
| 简洁 ↔ 详细 | View Transition，整页交叉淡入淡出 | 旧 .3s 淡出；新 .45s 淡入，延迟 .15s |
| 盖印 | `scale` 1.8 → 1 并淡入 | .5s `cubic-bezier(.3, 1.6, .5, 1)`；两方印延迟 .7s 和 1.05s，印下的字随后 .6s 浮起；**每天一次** |
| 描线 | SVG `pathLength="1"`，`stroke-dasharray: 1`，`stroke-dashoffset` 1 → 0 | .45s 缓出；随后的虚线 .45s 淡入、延迟 .1s |
| 金线流光 | 主按钮悬停时一道亮光沿金线走过（`background-position`） | .9s ease-out，一次 |
| 光框滑动 | 选中的格子上一个金色光框，`translate` 滑到下一个 | .4s 缓出 |
| 导航菱形 ◆ | 一个元素在页名之间滑动 | .5s 缓出；位置在 layout effect 里量 |
| 换月涟漪 | 每个格子按序号延迟 | .45s，延迟 `calc(var(--i) * 24ms)`，从左上斜着铺开 |
| 流星 | 一个元素加 CSS 动画，飞完就移除 | 每 30–60s 一颗，第一颗 6–12s；1.1s 飞过；140×1.5px，倾斜 21°，位移 380px、150px；标签页隐藏时不放 |
| 分段吸附 | 自写，见下 | 视口高 22% 以内才吸；520ms，缓出三次方 |

缓出曲线统一用 `cubic-bezier(.2, .7, .2, 1)`：起步快，落地很轻。

## 景深视差

- **为什么用 `translate` 属性而不是 `transform`：** 它和 `transform` 叠加生效，互不覆盖。雾自己在用 `transform` 漂移，刻度在用 `rotate` 转，视差另走一个通道，三者都不受影响。
- **深度：** 负数逆着鼠标，正数顺着鼠标。数值是 `reach` 的倍数。
  - 星空 `-1`：最远，移得最多。
  - 整个氛围层（光雾、光点、纸纹）`-0.45`。
  - 雾在氛围层里面，标 `0.8`。嵌套时位移会叠加，所以雾实际是 `0.8 - 0.45 = +0.35`，和身后的星空反向错开，看得出前后层次。
  - 主体 `+0.22`：最近，顺着鼠标微微移动。
- **防止露边：** 会移动的背景层放大一点，星空 `scale: 1.04`，氛围层 `1.03`，移动时边缘不会露出来。
- **只在有鼠标时跟随：** 只认 `pointerType === 'mouse'`。触屏的点按不该让画面跳一下。
- **手机倾斜：** 用 `deviceorientation`。左右用 gamma，前后用 beta 减去第一次拿起时的角度，各除以 30。iOS 13 以后要在用户点按时调用 `DeviceOrientationEvent.requestPermission()`，否则收不到事件；收不到时没有景深，也没有坏处。
- **静止即停：** 当前位置离目标小于 0.002 时停掉 `requestAnimationFrame`，鼠标不动时零开销。
- **元素有 `overflow: auto` 的滚动容器时**，移动外面的包装，不移动里面的内容，否则会多出滚动条。

## 分段吸附（不用 CSS scroll-snap）

- **CSS scroll-snap 的问题：**
  - `mandatory` 会困住比视口长的区块，读到一半被拽走；
  - `proximity` 的距离由浏览器定，没法调；
  - 回弹是一下跳过去，不是滑过去。
- **自写的吸附** 在 `code/immersive.js` 的 `startSectionSnap` 和 `code/react.tsx` 的 `useSectionSnap`：
  - **候选位置：** 页面顶部，加上每个区块的顶部减 12px 的上边距（和 `scroll-margin-top: 12px` 一致）。跳过隐藏的区块，跳过抽屉和弹窗里的区块。
  - **判断停下：** 有 `scrollend` 事件就用它；没有，就等滚动停 160ms。
  - **吸附：** 离最近的候选位置在视口高 22% 以内，才用 520ms 缓出（`1 - (1 - t)³`）滑过去。读到长区块中间时离哪个顶部都远，不动。
  - **放手：** 滑动途中一有 `wheel`、`touchstart`、`pointerdown`、`keydown`，立刻停。
  - **减少动态效果时** 直接跳到位置，不滑。

## 逐层亮起（起盘）

- **分层：** 一幕的内容按讲解的顺序分成三到五层，元素标上 `.cast-l1` 到 `.cast-l5`。
  - 例：八字是日主 → 月令 → 四柱 → 刑冲合会；紫微是命宫 → 三方四正 → 其余各宫 → 四化。
  - 四角竖排的各列，也随着它讲的那一层亮起。
- **过程：** 根元素的 `data-stage` 从 1 走到层数，还没到的层压在 opacity .05。每层停 1100ms。
- **说明行：** 主体下面一行小字，说这一层是什么（「第一重 · 日主 壬水」），旁边一个「跳过」。放完后变成「重看起盘」。说明行加 `aria-live="polite"`。
- **什么时候不播：**
  - 「详细」直接全部显示；
  - 减少动态效果时直接全部显示；
  - 连续换数据时（上一次在 1.5 秒内）不重播，例如用户在一步步翻日期。
- **中心大字先描轮廓再填满：** SVG `<text>` 设 `stroke-dasharray: 320`，动画 `stroke-dashoffset` 320 → 0，`fill-opacity` 前 55% 保持 0，之后填满。

## 每天一次

盖印这类仪式感的动画，在 localStorage 里记下今天的日期。今天播过就不再播。

- 日期用本地日期，不要用 `toISOString()`：那是 UTC，东八区早上八点前会算成前一天。
- 读写 localStorage 包在 try/catch 里。隐私模式下它可能抛错，那就每次都播。

## 减少动态效果

`tianshu.css` 最后一节有一条兜底：`prefers-reduced-motion: reduce` 时，所有 `animation` 和 `transition` 关掉。脚本这边：

- 视差、流星：不启动；
- 吸附：直接跳，不滑；
- 逐层亮起：直接全部显示；
- View Transition：直接更新，不过渡。

检查方法：DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce`。或者用无头 Chrome 加 `--force-prefers-reduced-motion`。

## 验证时的坑

装了 `frontend-verification` skill 时，它有更全的说明和现成脚本。这里只列和动效直接相关的两条。

- **`requestAnimationFrame` 不跑：** 隐藏的预览面板和无头浏览器里的 iframe 中，rAF 可能完全不跑，用它驱动的动画会停在第一帧，看起来像 bug。
  - 逐层亮起用的是 `setTimeout`，不受影响。视差、吸附依赖 rAF。
  - 测试页里可以临时把 rAF 换成 `setTimeout(cb, 16)`。
- **整页截图里，往下的区块是空白的：** 截整页时，滚动驱动的浮起动画（`animation-timeline: view()`）不会推进，还没进入视野的区块停在 opacity 0。这是截图方式造成的，不是页面坏了。要看下面的内容，先滚到那里再截一屏；或者截图前临时关掉这个动画。
- **截图里的字像宋体，不一定是 bug。** 可能只是网页字体还没加载完。截图时加 `--virtual-time-budget=5000` 左右，或者先在真浏览器里确认。
