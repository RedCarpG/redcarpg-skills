# animation-capture

> 把会动的东西按固定时间一帧一帧录下来，并排做成对比 GIF。录两次，逐帧一模一样。

动画的毛病和改进，看一张截图看不出来，用嘴说也很难让人判断。这个 skill 把同一段动画的两个版本（改前和改后，或者某个开关的关和开）放在同一条时间轴上逐帧录下来，并排做成 GIF，看的人一眼就能拍板。

核心是一条：**时间由我们推，不由真实时钟走。** 无头浏览器画得慢，用真实时间录的话，每次停在的位置都不一样。`record.mjs` 往页面里注入一个假时钟，每次往前走一步、截一张，所以第 n 帧永远对应 n × 步长。实测 75 帧，两次录制逐字节相同。

## 包含什么

| | |
|---|---|
| `scripts/record.mjs` | 起无头 Chrome，注入假时钟，录多个变体。页面不用改；默认用显卡渲染 |
| `scripts/clock-shim.js` | 接管 `performance.now`、`Date.now`、rAF、定时器、`Math.random`，以及 CSS 和 WAAPI 动画 |
| `scripts/make_gif.py` | 把几个变体并排，加上标签，所有帧共用一个调色板，同时出一张逐帧对照图 |
| `references/hook.md` | 一边录画面一边读每帧数值（骨头角度、位置）的做法 |
| `evals/` | 2 个测试用例：网页缓动曲线对比、canvas 弹球挤压变形 |

## 适用范围

CSS 过渡和动画、`element.animate()`、rAF 写的 JS 动画、canvas 游戏、three.js / VRM、PixiJS / Live2D。

## 安装

```bash
npx skills add RedCarpG/redcarpg-skills -s animation-capture
```

依赖：Chrome、Node ≥ 22、Python 3 和 Pillow。

## 来源

来自桌宠项目 [Cirra](https://github.com/RedCarpG/cirra-deskpet)：调 3D 角色动作时，要给人看开关前后的对比，摸索出了这套做法。详见 [SKILL.md](./SKILL.md) 末尾的「来源与维护」。
