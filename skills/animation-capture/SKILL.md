---
name: animation-capture
description: 把网页动画（CSS、WAAPI、rAF、canvas、three.js/VRM、PixiJS/Live2D）用假时钟逐帧录下，做成改动前后并排对比的 GIF 或对照图，给人验收、放进 PR。附 record.mjs、make_gif.py。用户说「录个 GIF」「对比改前改后的动画」时用。Record deterministic animation frames and before/after GIFs.
---

# 把动画录成对比 GIF

动画的毛病和改进，一张截图看不出来，靠嘴说用户也没法判断。同一段动画，改之前、改之后（或开关关、开）按同一条时间轴逐帧录，并排成 GIF，用户一眼就能拍板。

**核心：时间由我们推，不由真实时钟走。** 无头浏览器画得慢，用真实时间录，每次停的位置都不一样。录的时候页面里的时间只在我们说「往前走 40 毫秒」时才走，然后截一张。这样第 n 帧永远是第 n × 40 毫秒，两个变体逐帧对得上，同一个变体录两次也一模一样（实测 75 帧逐字节相同）。

## 硬规则

1. **GIF 给人看，数给检查用。** GIF 适合验收和对比，不适合找毛病（慢慢举手时膝盖弯 18° 撑一秒，是逐帧记角度查出来的）。先逐帧记关键数值（角度、位置、透明度、脚滑没滑），开关前后各一遍，数对了再录 GIF。记数值用 `hook`，见 `references/hook.md`。
2. **时钟默认 `shim`**（页面不用改，CSS 过渡/动画、WAAPI、rAF、canvas、three.js、PixiJS、Live2D 都行）；要一边录一边读模型里的数才用 `hook`。**不要用** Chrome 虚拟时间（`Emulation.setVirtualTimePolicy`），rAF 时间和 `performance.now` 对不上。
3. **等加载时假时钟不走**（`--ready`），否则两次录的起点不同。
4. 变体之间除了要比的那一处，其他都一样；逐帧比较只在同一种渲染（显卡 / 软件）里做。
5. 先自己看对照图（`--sheet`），确认动起来、左右对得上、取景没裁掉，再给用户。
6. 别人的模型、素材录出的 GIF 看许可；GIF、帧、测试页放不进 git 的地方，用完删。

## 流程

1. 准备页面和变体（URL 参数 `?v=off` / `?v=on`，或 `--setup` 切换）；起页面（Vite 首次打开会自己刷新一次，先预热）。
2. 录：
   ```bash
   node <skill>/scripts/record.mjs --out frames --fps 25 --seconds 3 --clip "#stage" \
     --ready "window.model != null" --setup "window.model.motion('TapBody', 0)" \
     --variant "关=http://127.0.0.1:5173/lab.html?v=off" --variant "开=http://127.0.0.1:5173/lab.html"
   ```
3. 出对照图和 GIF：
   ```bash
   python <skill>/scripts/make_gif.py frames --variants 关,开 --fps 25 --width 300 --title "Hiyori · 摸头" --sheet sheet.png --out compare.gif
   ```
4. 交给用户：说清每张左右是什么、录的哪个版本、哪些没验（比如用的软件渲染）。

## 什么情况读哪里

| 情况 | 读 |
|---|---|
| 选 shim 还是 hook、假时钟管不到什么（Worker、`<video>`、`new Date()`） | `references/recording.md`「选时钟」 |
| `record.mjs` 各参数（`--clip`、`--ready`、`--ready-advance`、`--wait`、`--setup`、`--render gpu/cpu`）、Vite 刷新、端口 | `references/recording.md`「步骤和参数说明」 |
| 帧率、时长、单格宽度、取景（按包围盒）、变体怎么做 | `references/recording.md`「参数怎么定」 |
| 网页交互、PixiJS / Live2D（Cubism Core 先加载）、three.js / VRM、游戏 | `references/recording.md`「各种页面的做法」 |
| 别人模型的许可、文件放哪 | `references/recording.md`「许可和隐私」 |
| 逐帧记数值、页面自己推帧（`window.__capture`） | `references/hook.md` |
| 假时钟下页面卡死、超时（按时间切片的循环、限时 AI）、等不到 rAF / `finish`、Playwright `page.clock` 截到过渡一半、第 0 帧东西闪没、没显卡截图慢 | `references/fake-clock-pitfalls.md` |
| 完整来源、改法、更早的更新记录 | `references/maintenance.md` |

## 和别的 skill 的关系

- 静态截图、多视口、深色模式：`frontend-verification`（它的 `shot.mjs` 是真实时间截图；录动画用这里）。
- 宣传片、带配乐的 MP4：`motion-showreel`。
- 角色动画本身怎么做自然：`live2d-vrm-animation`。

## 来源与维护

- **来源：** Cirra（桌宠，[RedCarpG/cirra-deskpet](https://github.com/RedCarpG/cirra-deskpet)）2026-11-10 做 3D 人物带动层、头发甩动时摸索出来；经验在私人 repo 的 [`lessons/animation-capture.md`](https://github.com/RedCarpG/redcarpg-skills-private/blob/main/lessons/animation-capture.md)。细节见 `references/maintenance.md`。
- **源头：** [RedCarpG/redcarpg-skills-private](https://github.com/RedCarpG/redcarpg-skills-private) 的 `skills/animation-capture/`，每周发版到 [RedCarpG/redcarpg-skills](https://github.com/RedCarpG/redcarpg-skills)。各 agent 的 skills 目录、公开仓、claude.ai 上的都是副本，不要直接改。
- **怎么改：** 改了脚本，在一个 CSS 页面、一个 Live2D 或 three.js 页面上各录一次，两个变体逐帧对得上、同一变体录两次逐帧相同（Pillow `ImageChops.difference`）；改了做法或坑同步 lessons；测试用例在 `evals/`；发版时 `manifest.json` 升版本；下面加一行更新记录。完整步骤见 `references/maintenance.md`。
- **更新记录：**（更早的完整记录见 `references/maintenance.md`）
  - 2026-11-24 · skill 管理会话 · 收进 11-20 之后的 11 条经验：假时钟下按时间切片 / 限时的循环卡死（加步数上限、当场停的钩子、`Debugger.pause` 找栈）、`waitForFunction` 和页面里 `await` rAF / `finish` 等不到、Playwright `page.clock` 管不到 CSS 过渡和音频、整块重画的 DOM 和分层效果的第 0 帧、vitest 改写 `import()`、没显卡时截 WebGL 慢、GIF 合并相同帧；新建 `references/fake-clock-pitfalls.md`，1.1.0
  - 2026-11-20 · skill 管理会话 · description 收短，正文细节移到 references/，SKILL.md 只留流程和索引（省 token）
  - 2026-11-12：1.0.0，搬进 redcarpg-skills 公开发布。
  - 2026-11-10，Cirra：初版及当天修订（假时钟接住页面加载时的动画、默认显卡渲染、头发甩动对比）。
